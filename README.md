# AIO-Mod Toolkit v2.0 — Open Source

Rewrite bersih dan transparan dari tool **aio-mod** yang sebelumnya terobfuskasi.

Script ini dibuat ulang dari hasil reverse-engineering binary asli.
**Tanpa obfuscation · Tanpa anti-debug · Tanpa kill switch · Tanpa remote password.**

---

## ⚠️ Latar Belakang — Temuan Analisis aio-mod Asli

File `aio-mod` asli (205.718 baris, ~15MB) ternyata mengandung beberapa masalah keamanan serius:

| Temuan | Risiko |
|--------|--------|
| **Anti-Debugging** — Self-destruct jika `bash -x` terdeteksi | 🔴 Tinggi |
| **Anti-Analysis** — Hex obfuscation + gzip + `eval` berlapis | 🔴 Tinggi |
| **Hidden Execution** — Extract binary ke `~/.cache/.aio_*` random, jalankan, auto-delete 5 detik | 🔴 Tinggi |
| **Remote Kill Switch** — Cek `isDie.txt` dari GitHub untuk matikan tool jarak jauh | 🟡 Sedang |
| **Remote Password** — Password diverifikasi terhadap hash SHA256 remote (`kanjut.txt`) | 🟡 Sedang |
| **Compiled Binary** — Source code disembunyikan dalam Nuitka-compiled binary | 🟡 Sedang |

### Detail Teknis

<details>
<summary>Klik untuk melihat detail analisis</summary>

#### Obfuscation Layer
```bash
# Hex-encoded commands
_c1=$'\x70\x72\x69\x6e\x74\x66'  # printf
_c2=$'\x67\x75\x6e\x7a\x69\x70'  # gunzip
_e=$'\x65\x76\x61\x6c'            # eval
```

#### Anti-Debug Trap (decoded)
```bash
if [[ "$-" == *"x"* ]]; then rm -f "$0"; kill -9 $$; fi
function echo { rm -f "$0"; exit; };
```

#### Hidden Binary Extraction (decoded payload)
```bash
exec 2>/dev/null
RND=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 8 | head -n 1)
dest="$HOME/.cache/.aio_${RND}"
mkdir -p "$dest"
sed "1,/^__DATA_BELOW__/d" "$0" | base64 -d > "$dest/data.zip"
unzip -qo "$dest/data.zip" -d "$dest"
export LD_LIBRARY_PATH="$dest:$LD_LIBRARY_PATH"
BIN_EXE=$(find "$dest" -maxdepth 1 -type f -not -name "*.so" -not -name "*.txt" | head -n 1)
chmod +x "$BIN_EXE"
(sleep 5; rm -rf "$dest") & disown
"$BIN_EXE" "$@"
```

#### Remote Kill Switch
| URL | Fungsi |
|-----|--------|
| `willstore69/tools/.../isDie.txt` | Kill switch — `no` = aktif, `yes` = matikan |
| `willstore69/utils/.../kanjut.txt` | SHA256 hash password untuk autentikasi |

#### Embedded Binary
Binary `aio-mod.bin` (14.8 MB) adalah Nuitka-compiled Python 3.12 ARM64 yang membundel 60+ file termasuk `libpython3.12.so`, `libcrypto.so.3`, `libssl.so.3`, dan banyak extension module.

</details>

---

## 🆕 Versi Open Source (`aio-mod.py`)

Rewrite lengkap sebagai **Python script murni** — bisa dibaca, diaudit, dan dimodifikasi bebas.

### ✨ Features

| # | Fitur | Deskripsi |
|---|-------|-----------|
| 1 | **Signature Killer v1** | MT VIP method — inject DEX + SO + patch manifest |
| 2 | **Signature Killer v2** | SRPatch method — inject core DEX + SO |
| 3 | **Auto Sign APK** | Default testkey atau custom certificate |
| 4 | **Bypass SSL Flutter** | Patch `libflutter.so` via radare2 (ret0) |
| 5 | **DPT Unpack** | Unpack DPT-protected APKs |
| 6 | **Smali Patcher** | Ads removal, screenshot bypass, VPN bypass, installer spoof |
| 7 | **Universal .SO Patcher** | Patch fungsi native via radare2 |

### 📦 Format yang Didukung

Tool otomatis mendeteksi dan memproses:
- `.apk` — Single package
- `.xapk` — Split bundle (auto-extract base)
- `.apks` — Bundle installer output (auto-merge via APKEditor)

---

## 🚀 Instalasi (Termux)

```bash
# 1. Install dependencies
bash required.sh

# 2. Jalankan
python3 aio-mod.py
```

### Dependencies

| Package | Fungsi |
|---------|--------|
| `openjdk-21` | Java runtime untuk APKEditor, apksigner, ManifestEditor |
| `radare2` | Binary analysis & patching untuk .so |
| `aapt` | Android Asset Packaging Tool |
| `android-tools` | ADB dan tools Android lainnya |
| `zip` / `unzip` | Manipulasi APK (ZIP format) |
| `python3` | Runtime script |
| `requests` (pip) | HTTP downloads |

---

## 📁 Struktur File

```
toolkit/
├── aio-mod.py          # ← Script utama (open source, bersih)
├── aio-mod              # File asli (obfuscated, untuk referensi)
├── required.sh          # Installer dependencies Termux
├── will_core.zip        # Core files untuk Signature Killer v1
├── will2_core.zip       # Core files untuk Signature Killer v2 (variant 1)
├── will3_core.zip       # Core files untuk Signature Killer v2 (variant 2)
└── README.md            # Dokumentasi ini
```

---

## 🔧 Cara Pakai

```
╔══════════════════════════════════════════╗
║       AIO-MOD TOOLKIT v2.0 (OSS)        ║
║    Open Source APK Modding Toolkit       ║
╚══════════════════════════════════════════╝

  MENU UTAMA

  [1] Signature Killer v1
  [2] Signature Killer v2 (SRPatch)
  [3] Auto Sign APK
  [4] Bypass SSL Flutter
  [5] DPT Unpack
  [6] Smali Patcher
  [7] Universal .SO Patcher
  [0] Exit
```

1. Taruh file APK/XAPK/APKS di folder yang sama
2. Jalankan `python3 aio-mod.py`
3. Pilih fitur dari menu
4. Ikuti instruksi yang muncul

---

## 🙏 Credits

- AbhiTheModder — SSL Flutter bypass technique
- AdsRegex & TDOhex — Smali Patcher patterns
- Aantik — DPT-Unpack base
- Vince — Universal .so Patcher concept
- Komunitas Mod — NullRe & TDOhex

---

## ⚠ Disclaimer

Tool ini dibuat untuk tujuan **edukasi dan research** saja.
Segala penyalahgunaan bukan tanggung jawab kontributor.

---

Open source · Transparent · No backdoors.
