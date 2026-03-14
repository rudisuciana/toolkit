#!/bin/bash
# ==============================================================================
#                 MYSQL DATABASE TOOLKIT SCRIPT v3.1 (Fixed)
# ==============================================================================
# Skrip ini menyediakan menu lengkap untuk manajemen server database MySQL.
# Dijalankan di server Ubuntu 24.04 / Debian.
# ==============================================================================

# --- PENGATURAN GLOBAL ---
if [ "$EUID" -ne 0 ]; then
  echo "Kesalahan: Skrip ini harus dijalankan dengan hak akses root atau sudo."
  exit 1
fi

# Definisi warna
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# --- FUNGSI-FUNGSI UTAMA ---

# OPSI 1: SETUP MYSQL SERVER
setup_mysql_server() {
    clear
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "${YELLOW}     Opsi 1: Setup Cerdas MySQL Server (Akses Penuh)     ${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}MySQL Server sudah terinstal.${NC}"
    else
        echo -e "${YELLOW}MySQL Server tidak ditemukan.${NC}"
        read -p "Instal sekarang? (y/n): " INSTALL_CONFIRM
        if [[ "$INSTALL_CONFIRM" != "y" ]]; then echo "Batal."; return 1; fi
        
        echo -e "\n${YELLOW}Memulai instalasi MySQL Server...${NC}"
        apt-get update -y > /dev/null 2>&1
        # Menggunakan noninteractive agar tidak macet meminta input
        DEBIAN_FRONTEND=noninteractive apt-get install mysql-server -y
        
        if [ $? -ne 0 ]; then
            echo -e "${RED}Instalasi MySQL Server GAGAL.${NC}"
            return 1
        fi
        echo -e "${GREEN}MySQL Server berhasil diinstal.${NC}"
    fi

    echo ""
    echo -e "${RED}PERINGATAN: User remote akan diberikan HAK AKSES PENUH (*.*).${NC}"
    read -p "Ketik 'SAYA PAHAM' untuk lanjut: " CONFIRMATION
    if [[ "$CONFIRMATION" != "SAYA PAHAM" ]]; then echo "Batal."; return 1; fi

    echo ""
    read -p "Masukkan IP Publik VPS KLIEN (diizinkan): " IP_VPS_2
    read -p "Masukkan NAMA USER remote baru: " NAMA_USER
    
    while true; do
        read -sp "Masukkan PASSWORD user '$NAMA_USER': " PASSWORD_USER; echo
        read -sp "Konfirmasi PASSWORD: " PASSWORD_USER_CONFIRM; echo
        [ "$PASSWORD_USER" = "$PASSWORD_USER_CONFIRM" ] && ! [ -z "$PASSWORD_USER" ] && break
        echo -e "${RED}Password tidak cocok/kosong.${NC}"
    done

    echo -e "\n${YELLOW}Memulai konfigurasi...${NC}"
    
    # Deteksi file konfigurasi (Support path Ubuntu/Debian modern & legacy)
    CONFIG_FILE="/etc/mysql/mysql.conf.d/mysqld.cnf"
    if [ ! -f "$CONFIG_FILE" ]; then
        CONFIG_FILE="/etc/mysql/my.cnf"
    fi

    if [ -f "$CONFIG_FILE" ]; then
        echo "--> Mengubah bind-address ke 0.0.0.0 di $CONFIG_FILE..."
        sed -i "s/^bind-address.*/bind-address = 0.0.0.0/" "$CONFIG_FILE"
    else
        echo -e "${RED}File konfigurasi MySQL tidak ditemukan. Pastikan instalasi benar.${NC}"
        return 1
    fi
    
    echo "--> Merestart service MySQL..."
    systemctl restart mysql
    sleep 3 # Tunggu socket siap
    
    echo "--> Membuat user dan grant privileges..."
    mysql -e "CREATE USER IF NOT EXISTS '$NAMA_USER'@'$IP_VPS_2' IDENTIFIED BY '$PASSWORD_USER';"
    mysql -e "GRANT ALL PRIVILEGES ON *.* TO '$NAMA_USER'@'$IP_VPS_2' WITH GRANT OPTION;"
    mysql -e "FLUSH PRIVILEGES;"
    
    echo "--> Mengkonfigurasi firewall (UFW)..."
    if command -v ufw &> /dev/null; then
        ufw allow from "$IP_VPS_2" to any port 3306 proto tcp > /dev/null
        ufw reload > /dev/null
        echo "Firewall diupdate."
    else
        echo "UFW tidak terinstal, melewati konfigurasi firewall."
    fi

    echo -e "\n${GREEN}SETUP BERHASIL!${NC} User '$NAMA_USER' siap digunakan dari IP $IP_VPS_2."
}

# OPSI 2: HAPUS USER REMOTE
delete_remote_user() {
    clear
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "${YELLOW}               Opsi 2: Hapus User Remote               ${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    
    # Menampilkan user dulu agar mudah copy-paste
    echo "Daftar User saat ini:"
    mysql -e "SELECT user, host FROM mysql.user WHERE host != 'localhost';"
    echo ""
    
    read -p "Nama User yang dihapus: " USER_TO_DROP
    read -p "Host/IP User (e.g., 192.168.1.5): " HOST_TO_DROP
    read -p "Hapus '$USER_TO_DROP'@'$HOST_TO_DROP'? (y/n): " CONFIRM
    if [[ "$CONFIRM" != "y" ]]; then return 1; fi
    
    if mysql -e "DROP USER '$USER_TO_DROP'@'$HOST_TO_DROP'; FLUSH PRIVILEGES;"; then
        echo -e "${GREEN}User berhasil dihapus.${NC}"
    else
        echo -e "${RED}Gagal. Pastikan nama/host benar.${NC}"
    fi
}

# OPSI 3: TAMPILKAN USER
show_mysql_users() {
    clear
    echo -e "${YELLOW}Daftar User MySQL:${NC}"
    mysql -e "SELECT user, host, plugin FROM mysql.user;"
}

# OPSI 4: BACKUP MANUAL
backup_and_transfer() {
    clear
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "${YELLOW}      Opsi 4: Backup Manual & Transfer Database        ${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    
    read -p "Nama Database: " DB_NAME
    read -p "User MySQL (lokal): " DB_USER
    read -sp "Pass MySQL (lokal): " DB_PASS; echo ""
    echo "--- Info Server Tujuan ---"
    read -p "User SSH Tujuan: " REMOTE_USER
    read -p "IP VPS Tujuan: " REMOTE_IP
    read -p "Folder Tujuan (path mutlak, cth: /root/backup): " REMOTE_PATH
    
    LOCAL_BACKUP_PATH="$HOME/db_backups_local"
    mkdir -p "$LOCAL_BACKUP_PATH"
    TIMESTAMP=$(date +"%Y-%m-%d_%H%M%S")
    BACKUP_FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"
    FULL_PATH_BACKUP="$LOCAL_BACKUP_PATH/$BACKUP_FILENAME"
    
    echo -e "\n${YELLOW}Backing up...${NC}"
    # Menggunakan opsi --single-transaction agar tidak lock tabel (untuk InnoDB)
    if ! mysqldump --single-transaction -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$FULL_PATH_BACKUP"; then
        echo -e "${RED}Backup Gagal! Cek user/pass database.${NC}"; rm -f "$FULL_PATH_BACKUP"; return 1; fi
    
    echo -e "${YELLOW}Transferring...${NC}"
    if ! scp "$FULL_PATH_BACKUP" "${REMOTE_USER}@${REMOTE_IP}:${REMOTE_PATH}/"; then
        echo -e "${RED}Transfer Gagal! Cek SSH Key/Koneksi.${NC}"; return 1; fi
    
    echo -e "${GREEN}Sukses! File: $BACKUP_FILENAME${NC}"
    rm -f "$FULL_PATH_BACKUP" # Selalu hapus lokal setelah kirim manual (opsional)
}

# OPSI 5: RESTORE
restore_database() {
    clear
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "${YELLOW}            Opsi 5: Restore Database                   ${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    
    read -p "Path file backup (.sql.gz): " BACKUP_FILE_PATH
    if [[ ! -f "$BACKUP_FILE_PATH" ]]; then echo -e "${RED}File tidak ada.${NC}"; return 1; fi
    
    read -p "Nama Database Baru: " NEW_DB_NAME
    read -p "User MySQL Admin: " MYSQL_ADMIN_USER
    read -sp "Pass MySQL Admin: " MYSQL_ADMIN_PASS; echo ""
    
    echo -e "\n${YELLOW}Proses Restore...${NC}"
    mysql -u "$MYSQL_ADMIN_USER" -p"$MYSQL_ADMIN_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$NEW_DB_NAME\`;"
    
    if zcat "$BACKUP_FILE_PATH" | mysql -u "$MYSQL_ADMIN_USER" -p"$MYSQL_ADMIN_PASS" "$NEW_DB_NAME"; then
        echo -e "${GREEN}RESTORE BERHASIL ke database '$NEW_DB_NAME'.${NC}"
    else
        echo -e "${RED}RESTORE GAGAL.${NC}"
    fi
}

# OPSI 6: JADWAL OTOMATIS (FIXED)
schedule_backup() {
    clear
    echo -e "${YELLOW}=======================================================${NC}"
    echo -e "${YELLOW}        Opsi 6: Buat Jadwal Backup Otomatis            ${NC}"
    echo -e "${YELLOW}=======================================================${NC}"
    
    read -p "Nama Database: " DB_NAME
    read -p "User MySQL (lokal): " DB_USER
    read -sp "Pass MySQL (lokal): " DB_PASS; echo ""
    echo "--- Info Server Tujuan (Pastikan SSH Passwordless Aktif) ---"
    read -p "User SSH Tujuan: " REMOTE_USER
    read -p "IP VPS Tujuan: " REMOTE_IP
    read -p "Folder Tujuan (cth: /root/backup): " REMOTE_PATH
    read -p "Interval (Jam): " INTERVAL_HOURS
    
    if ! [[ "$INTERVAL_HOURS" =~ ^[0-9]+$ ]]; then echo "Interval harus angka."; return 1; fi
    
    # Setup Folder Lokal untuk sementara
    AUTO_BACKUP_DIR="$HOME/db_backups_auto"
    mkdir -p "$AUTO_BACKUP_DIR"
    
    BACKUP_SCRIPT_PATH="$HOME/automatic_backup_${DB_NAME}.sh"
    
    # --- GENERATE SCRIPT (FIXED LOGIC) ---
    # Menggunakan Cat EOF untuk menulis skrip
    # Variabel $DB_NAME dkk di-expand SEKARANG (saat setup).
    # Variabel \$TIMESTAMP di-escape agar di-expand NANTI (saat cron jalan).
    
cat > "$BACKUP_SCRIPT_PATH" <<EOF
#!/bin/bash
# Auto-generated script by MySQL Toolkit

# Konfigurasi
DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASS="$DB_PASS"
REMOTE_USER="$REMOTE_USER"
REMOTE_IP="$REMOTE_IP"
REMOTE_PATH="$REMOTE_PATH"
LOCAL_DIR="$AUTO_BACKUP_DIR"

# Penamaan File (Dieksekusi saat cron berjalan)
TIMESTAMP=\$(date +"%Y-%m-%d_%H%M%S")
BACKUP_FILE="\${DB_NAME}_\${TIMESTAMP}.sql.gz"
FULL_PATH="\$LOCAL_DIR/\$BACKUP_FILE"

# 1. Dump Database
if mysqldump --single-transaction -u "\$DB_USER" -p"\$DB_PASS" "\$DB_NAME" | gzip > "\$FULL_PATH"; then
    # 2. Kirim via SCP
    scp -o ConnectTimeout=30 "\$FULL_PATH" "\${REMOTE_USER}@\${REMOTE_IP}:\${REMOTE_PATH}/"
    
    # 3. Hapus file lokal setelah sukses kirim (hemat space)
    if [ \$? -eq 0 ]; then
        rm -f "\$FULL_PATH"
    fi
else
    echo "Backup Gagal" > "\$LOCAL_DIR/error_\$TIMESTAMP.log"
fi

# 4. Opsional: Hapus log error yang lebih lama dari 7 hari
find "\$LOCAL_DIR" -name "error_*.log" -mtime +7 -delete
EOF

    chmod +x "$BACKUP_SCRIPT_PATH"
    
    # Setup Cron
    CRON_JOB="0 */$INTERVAL_HOURS * * * $BACKUP_SCRIPT_PATH"
    (crontab -l 2>/dev/null | grep -v -F "$BACKUP_SCRIPT_PATH"; echo "$CRON_JOB") | crontab -
    
    echo -e "\n${GREEN}JADWAL AKTIF!${NC}"
    echo "Backup '$DB_NAME' akan dikirim ke $REMOTE_IP tiap $INTERVAL_HOURS jam."
    echo "Script pengatur: $BACKUP_SCRIPT_PATH"
}

# OPSI 7: LIHAT JADWAL
show_cron_jobs() {
    clear
    echo -e "${YELLOW}Jadwal Cron User Saat Ini:${NC}"
    crontab -l 2>/dev/null || echo "Tidak ada jadwal."
}

# --- MENU LOOP ---
while true; do
    clear
    echo -e "${GREEN}=======================================================${NC}"
    echo -e "          ${YELLOW}MySQL DATABASE TOOLKIT v3.1${NC}"
    echo -e "${GREEN}=======================================================${NC}"
    echo "  1. Setup Server MySQL (Akses Remote)"
    echo "  2. Hapus User Remote"
    echo "  3. Tampilkan User MySQL"
    echo "  4. Backup Manual & Transfer (SCP)"
    echo "  5. Restore Database (dari .sql.gz)"
    echo "  6. Buat Jadwal Backup Otomatis"
    echo "  7. Tampilkan Jadwal Backup"
    echo "  8. Keluar"
    echo -e "${GREEN}-------------------------------------------------------${NC}"
    read -p "Pilihan [1-8]: " choice
    case $choice in
        1) setup_mysql_server ;;
        2) delete_remote_user ;;
        3) show_mysql_users ;;
        4) backup_and_transfer ;;
        5) restore_database ;;
        6) schedule_backup ;;
        7) show_cron_jobs ;;
        8) exit 0 ;;
        *) echo "Pilihan salah." ;;
    esac
    echo -e "\nTekan [Enter] kembali ke menu..."
    read
done
