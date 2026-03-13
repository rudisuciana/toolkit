# all-in-one mod toolkit pro

Script gabut.

---

## ⚠️ SECURITY ANALYSIS — aio-mod

Analisis mendalam terhadap file `aio-mod` menemukan beberapa temuan keamanan penting:

### 🔍 Struktur File

`aio-mod` adalah bash script (~15MB, 205.718 baris) dengan struktur berlapis:

1. **Wrapper Layer** — Bash script dengan obfuscation menggunakan hex-encoded strings
2. **Payload Layer** — Gzip-compressed bash code yang di-`eval`
3. **Binary Layer** — Base64-encoded ZIP berisi ELF binary ARM64 (Nuitka-compiled Python 3.12)

### 🛑 Temuan Keamanan Kritis

#### 1. Anti-Debugging / Anti-Analysis (Self-Destruct)

Script menggunakan hex-encoded `eval` + `printf` + `gunzip` untuk menyembunyikan kode:

```
_c1 = printf
_c2 = gunzip  
_e  = eval
```

Ketika di-decode, ditemukan **anti-debugging trap**:

```bash
if [[ "$-" == *"x"* ]]; then rm -f "$0"; kill -9 $$; fi
function echo { rm -f "$0"; exit; };
```

- Jika script dijalankan dengan `bash -x` (debug mode), script **menghapus dirinya sendiri** lalu mematikan process
- `echo` di-override: jika ada yang mencoba `echo` output, script **menghapus dirinya sendiri** dan exit

#### 2. Hidden Binary Execution

Payload layer yang terdekompresi menunjukkan:

```bash
exec 2>/dev/null                    # Sembunyikan semua error output
RND=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 8 | head -n 1)
dest="$HOME/.cache/.aio_${RND}"    # Buat hidden directory dengan nama random
mkdir -p "$dest"
sed "1,/^__DATA_BELOW__/d" "$0" | base64 -d > "$dest/data.zip"  # Extract embedded data
unzip -qo "$dest/data.zip" -d "$dest"
export LD_LIBRARY_PATH="$dest:$LD_LIBRARY_PATH"  # Load custom shared libraries
BIN_EXE=$(find "$dest" -maxdepth 1 -type f -not -name "*.so" -not -name "*.txt" | head -n 1)
chmod +x "$BIN_EXE"
(sleep 5; rm -rf "$dest") & disown  # Self-cleanup setelah 5 detik
"$BIN_EXE" "$@"                     # Jalankan binary
```

Pola ini:
- Membuat **hidden directory** dengan nama random di `~/.cache/`
- Mengekstrak dan menjalankan **ELF binary** tersembunyi (`aio-mod.bin`)
- Memodifikasi `LD_LIBRARY_PATH` untuk load custom `.so` files
- **Auto-delete** setelah 5 detik (anti-forensics)

#### 3. Remote Kill Switch

Binary menghubungi URL berikut saat runtime:

| URL | Fungsi |
|-----|--------|
| `https://raw.githubusercontent.com/willstore69/tools/refs/heads/main/isDie.txt` | **Remote kill switch** — Jika value berubah, tool bisa dimatikan dari jarak jauh |
| `https://raw.githubusercontent.com/willstore69/utils/refs/heads/main/kanjut.txt` | **Remote password hash** — Password diverifikasi terhadap hash SHA256 yang dikendalikan remote |

Saat ini `isDie.txt` berisi `no` (tool aktif), dan `kanjut.txt` berisi hash SHA256. Author bisa kapan saja:
- Menonaktifkan tool semua user sekaligus
- Mengganti password tanpa sepengetahuan user

#### 4. Embedded Nuitka-Compiled Binary

`aio-mod.bin` adalah binary ELF 64-bit ARM aarch64 yang dikompilasi menggunakan **Nuitka** dari source Python `aio-mod.py`. Binary ini membundel:

| File | Ukuran | Keterangan |
|------|--------|------------|
| `aio-mod.bin` | 14.8 MB | Main binary (compiled Python) |
| `libpython3.12.so.1.0` | 6.7 MB | Python runtime |
| `libcrypto.so.3` | 5.2 MB | OpenSSL crypto |
| `libssl.so.3` | 874 KB | OpenSSL SSL |
| `certifi/cacert.pem` | 272 KB | CA certificates |
| + 50 more `.so` files | ~3 MB | Python extension modules |

#### 5. Password-Protected ZIP Archives

File pendukung (`will_core.zip`, `will2_core.zip`, `will3_core.zip`) berisi:

- **will_core.zip** (password-protected): `will69.dex`, `libwillgacor69.so` (ARM64/ARMv7/x86/x86_64)
- **will2_core.zip**: `core.dex` (166KB), `libcore.so` (1.9MB ARM64)
- **will3_core.zip**: `core.dex` (164KB), `libcore.so` (1.9MB ARM64)

File `.dex` dan `.so` ini diinjeksi ke APK target sebagai bagian dari proses patching.

### 📋 Fitur Tool (dari String Analysis)

Menu utama yang ditemukan di binary:

- Auto Sign APK
- Bypass SSL Flutter
- Custom Signature / Default Sign
- DPT Unpack
- Signature Killer v1
- Smali Patcher
- Check Update

Tool mendownload dependencies runtime dari:
- `github.com/willstore69/tools` — `APKEditor.jar`, `apksigner.jar`, `testkey.pk8`, `testkey.x509.pem`
- `github.com/qomg/AndroidManifestEditor` — `ManifestEditor-1.0.2.jar`

### 🧬 Author Information

```
Author:  @user_legend
Channel: @ngemod_in
Email:   will69@sign.com
Source:  aio-mod.py (compiled to binary)
```

### 🎯 Kesimpulan

| Aspek | Temuan | Risiko |
|-------|--------|--------|
| Anti-Debug | Self-destruct jika di-trace | 🔴 Tinggi |
| Anti-Analysis | Hex obfuscation + gzip + eval | 🔴 Tinggi |
| Hidden Execution | Extract & run binary dari hidden dir | 🔴 Tinggi |
| Remote Kill Switch | Author bisa matikan tool kapan saja | 🟡 Sedang |
| Remote Password | Password dikendalikan remote | 🟡 Sedang |
| Self-Cleanup | Auto-delete setelah 5 detik | 🟡 Sedang |
| Compiled Binary | Source code tidak tersedia, sulit di-audit | 🟡 Sedang |

**Rekomendasi:** Jangan jalankan script ini tanpa memahami sepenuhnya apa yang dilakukannya. Mekanisme anti-debugging dan self-destruct menunjukkan bahwa author secara sengaja menyembunyikan perilaku script dari inspeksi.

---

## ✨ Features

- ✅ Auto Sign (Support Custom Certificate Info)
- ✅ Auto Detect File:
  - `.apk`
  - `.xapk`
  - `.apks`
- ✅ Kill Signature V1 (MT VIP method)
- ✅ Kill Signature V2 (NP SRPatch method)
- ✅ Patch / Kill Sign / Bypass no signed (Signature tetap Ori)

---

## 🔐 Password

```
@user_legend
```

---

## 📦 Supported Formats

Tool ini otomatis mendeteksi dan memproses:

- APK (Single package)
- XAPK (Split bundle)
- APKS (Bundle installer output)

Tidak perlu manual extract.

---

## 🙏 Credits

- AbhiTheModder — SSL Flutter  
- Smali Patcher — AdsRegex & TDOhex  
- DPT-Unpack — Base from Aantik  
- Universal .so Patcher — Base from Vince  
- Thanks to Komunitas Mod khususnya NullRe & TDOhex  

---

## ☕ Support

Kalau script ini membantu, bisa support di sini:

https://t.me/autoscript_willstore69/217

---

## ⚠ Disclaimer

Tool ini dibuat untuk tujuan edukasi dan research.  
Segala penyalahgunaan bukan tanggung jawab author.

---

Made with chaos & curiosity.
