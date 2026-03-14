#!/bin/bash

# =================================================================
# Skrip Instalasi & Manajemen Domain
# =================================================================

# --- FUNGSI & VARIABEL PEMBANTU ---
# Mendefinisikan kode warna untuk output teks agar lebih mudah dibaca
Green="\e[92;1m"
RED="\033[1;31m"
YELLOW="\033[33m"
BLUE="\033[36m"
FONT="\033[0m"
OK="${Green}--->${FONT}"
ERROR="${RED}[ERROR]${FONT}"
NC='\e[0m'

# Pengecekan User Root: Script ini memrlukan akses root untuk install paket & konfigurasi sistem
if [[ $EUID -ne 0 ]]; then
   echo -e "${ERROR} Skrip ini harus dijalankan sebagai root. Gunakan: sudo ./install.sh" 
   exit 1
fi

# Fungsi untuk menampilkan header judul dengan format yang rapi
function print_header() {
  clear
  echo -e "${YELLOW}===============================================${FONT}"
  echo -e "${BLUE} # $1 ${FONT}"
  echo -e "${YELLOW}===============================================${FONT}"
  sleep 2
}

# Fungsi untuk menampilkan pesan sukses
function print_success() {
  if [[ $? -eq 0 ]]; then
    echo -e "${OK} ${Green} # $1... BERHASIL ${FONT}"
    sleep 2
  fi
}

# Fungsi untuk menangani error fatal dan menghentikan script
function print_error_and_exit() {
    echo -e "\n${ERROR} $1"
    exit 1
}

# --- FUNGSI-FUNGSI UTAMA ---

# OPSI 1: SETUP LENGKAP UNTUK DOMAIN WEB
# Menginstal semua kebutuhan dari awal (OS update, Node.js, Nginx, SSL)
function setup_web() {
    print_header "SETUP LENGKAP DOMAIN WEB"
    
    # Meminta input Domain dan Port dari pengguna
    read -p "Masukkan Domain Web Anda: " DOMAIN
    if [ -z "$DOMAIN" ]; then
        print_error_and_exit "Domain tidak boleh kosong."
    fi
    
    read -p "Masukkan Port Aplikasi Node.js: " PORT
    if [ -z "$PORT" ]; then
        print_error_and_exit "Port tidak boleh kosong."
    fi

    # Update paket sistem operasi (Ubuntu/Debian)
    print_header "MEMPERBARUI SISTEM"
    apt update -y && apt upgrade -y
    print_success "Sistem diperbarui"

    # Install software dasar: Git, Curl, Nginx (Web Server), Certbot (SSL)
    print_header "INSTALL DEPENDENSI"
    apt install git curl nginx certbot python3-certbot-nginx -y
    print_success "Dependensi terinstal"

    # Install Node.js menggunakan NVM (Node Version Manager)
    print_header "INSTALL NODEJS & PM2"
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install --lts       # Install versi Long Term Support terbaru
    nvm use --lts
    apt install npm
    npm install pm2 -g      # Install PM2 global untuk memanajemen proses
    print_success "NodeJS & PM2 terinstal"

    # Setup project (Install modul npm project)
    print_header "SETUP PROYEK WUZZSTORE"
    # Validasi keberadaan folder project
    if [ ! -d "/root/wuzzstore-project" ]; then
        print_error_and_exit "Folder /root/wuzzstore-project tidak ditemukan. Pastikan Anda sudah meng-kloning proyek Anda."
    fi
    cd /root/wuzzstore-project
    npm install             # Install library dari package.json
    cd email                # Masuk ke folder email (jika ada logika spesifik disana)
    print_success "Dependensi proyek terinstal"

    # Menjalankan aplikasi menggunakan PM2
    print_header "MENJALANKAN APLIKASI DENGAN PM2"
    # Menjalankan server utama dalam mode cluster (max core)
    pm2 start /root/wuzzstore-project/server.js -i max
    # Menjalankan service webhook email
    pm2 start /root/wuzzstore-project/webhook_topup/email_webhook_server.js --name gmail
    pm2 save                # Menyimpan list proses agar jalan saat restart
    pm2 startup             # Membuat script startup boot
    print_success "Aplikasi berjalan dengan PM2"

    # Membuat konfigurasi Nginx (Reverse Proxy)
    print_header "KONFIGURASI NGINX & SSL"
    cat > /etc/nginx/sites-available/$DOMAIN <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT; # Meneruskan trafik ke Node.js
        proxy_set_header Host \$host;
    }
}
EOF
    # Mengaktifkan konfigurasi Nginx
    ln -s /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
    systemctl restart nginx
    
    # Request SSL Certificate gratis via Let's Encrypt (Certbot)
    certbot --nginx --agree-tos --email wuzzstore04@gmail.com --redirect --non-interactive -d $DOMAIN
    systemctl restart nginx
    print_success "Nginx & SSL untuk $DOMAIN dikonfigurasi"

    echo -e "\n${OK} ${Green}Instalasi selesai! Website Anda siap di https://${DOMAIN}${FONT}"
    sleep 5
}

# OPSI 2: SETUP TAMBAHAN UNTUK DOMAIN API
# Hanya setting Nginx & SSL untuk domain kedua (API), tanpa install ulang Node/PM2
function setup_api() {
    print_header "SETUP DOMAIN API BARU"
    
    read -p "Masukkan Domain API Anda: " API_DOMAIN
    if [ -z "$API_DOMAIN" ]; then
        print_error_and_exit "Domain API tidak boleh kosong."
    fi

    read -p "Masukkan Port Aplikasi Node.js yang sudah berjalan: " PORT
    if [ -z "$PORT" ]; then
        print_error_and_exit "Port tidak boleh kosong."
    fi

    print_header "KONFIGURASI NGINX & SSL UNTUK API"
    cat > /etc/nginx/sites-available/$API_DOMAIN <<EOF
server {
    listen 80;
    server_name $API_DOMAIN;

    location / {
        proxy_pass http://localhost:$PORT;
        proxy_set_header Host \$host;
    }
}
EOF
    ln -s /etc/nginx/sites-available/$API_DOMAIN /etc/nginx/sites-enabled/
    systemctl restart nginx

    # Request SSL untuk domain API
    certbot --nginx --agree-tos --email wuzzstore04@gmail.com --redirect --non-interactive -d $API_DOMAIN
    systemctl restart nginx
    print_success "Nginx & SSL untuk $API_DOMAIN dikonfigurasi"
    
    echo -e "\n${OK} ${Green}Domain API selesai ditambahkan! API Anda siap di https://${API_DOMAIN}${FONT}"
    sleep 5
}

# FUNGSI UMUM UNTUK MENGGANTI DOMAIN
# Mengubah nama file config Nginx, menghapus SSL lama, dan membuat SSL baru
function change_domain() {
    TYPE=$1 # Parameter input: "Web" atau "API"
    print_header "GANTI DOMAIN ${TYPE}"

    read -p "Masukkan Domain ${TYPE} LAMA: " OLD_DOMAIN
    # Validasi apakah domain lama ada
    if [ -z "$OLD_DOMAIN" ] || [ ! -f "/etc/nginx/sites-available/$OLD_DOMAIN" ]; then
        print_error_and_exit "Domain lama tidak valid atau file konfigurasinya tidak ditemukan."
    fi

    read -p "Masukkan Domain ${TYPE} BARU: " NEW_DOMAIN
    if [ -z "$NEW_DOMAIN" ]; then
        print_error_and_exit "Domain baru tidak boleh kosong."
    fi

    print_header "MEMPROSES PENGGANTIAN DOMAIN"
    
    # Hapus sertifikat SSL lama agar tidak menumpuk/error
    certbot delete --cert-name $OLD_DOMAIN --non-interactive
    
    # Pindahkan dan rename file konfigurasi Nginx
    rm /etc/nginx/sites-enabled/$OLD_DOMAIN
    mv /etc/nginx/sites-available/$OLD_DOMAIN /etc/nginx/sites-available/$NEW_DOMAIN
    
    # Edit isi file config: ganti semua teks domain lama jadi domain baru
    sed -i "s/$OLD_DOMAIN/$NEW_DOMAIN/g" /etc/nginx/sites-available/$NEW_DOMAIN
    
    # Aktifkan config baru
    ln -s /etc/nginx/sites-available/$NEW_DOMAIN /etc/nginx/sites-enabled/
    systemctl restart nginx
    
    # Request SSL baru untuk domain baru
    certbot --nginx --agree-tos --email wuzzstore04@gmail.com --redirect --non-interactive -d $NEW_DOMAIN
    systemctl restart nginx

    print_success "Domain ${OLD_DOMAIN} berhasil diubah menjadi ${NEW_DOMAIN}"
    sleep 5
}

# --- MENU UTAMA ---
# Loop tampilan menu interaktif
function main_menu() {
    while true; do
        clear
        echo -e "${BLUE}===============================================${FONT}"
        echo -e "      ${YELLOW}MENU INSTALASI & MANAJEMEN WUZZSTORE${FONT}"
        echo -e "${BLUE}===============================================${FONT}"
        echo -e " 1. Setup Lengkap (Domain Web + Server)"
        echo -e " 2. Tambah Domain API"
        echo -e " 3. Ganti Domain Web Utama"
        echo -e " 4. Ganti Domain API"
        echo -e " 5. Keluar"
        echo -e "${BLUE}===============================================${FONT}"
        read -p "Pilih opsi [1-5]: " choice

        case "$choice" in
            1)
                setup_web
                ;;
            2)
                setup_api
                ;;
            3)
                change_domain "Web"
                ;;
            4)
                change_domain "API"
                ;;
            5)
                echo "Keluar dari skrip."
                exit 0
                ;;
            *)
                echo -e "${RED}Opsi tidak valid. Silakan coba lagi.${FONT}"
                sleep 2
                ;;
        esac
    done
}

# Jalankan menu utama saat script dieksekusi
main_menu
