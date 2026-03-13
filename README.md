# 📱 Toolkit — Analisis Mendalam File Aplikasi Android

## Ringkasan

Repository ini berisi file-file hasil ekstraksi dari APK aplikasi **myXL Ultimate** (aplikasi resmi operator seluler XL Axiata, Indonesia). Seluruh file merupakan binary yang telah dikompilasi — tidak ada source code.

Repository memuat **8 file DEX** (Dalvik Executable) dan **10 file native library** (`.so`) untuk arsitektur **ARM64 (aarch64)**.

---

## 📊 Statistik Umum

| Kategori | Jumlah |
|---|---|
| File DEX | 8 |
| File Native Library (.so) | 10 |
| Total Kelas Java/Kotlin | 67.966 |
| Package Unik (top-level) | 18.469 |
| Fitur Modul Aplikasi | 39 |
| SDK Pihak Ketiga | 21+ |
| Arsitektur Target | ARM64 (aarch64) |
| Format DEX | Dalvik dex file version 035 |

---

## 📁 Daftar Lengkap File

### File DEX (Dalvik Executable)

| File | Ukuran | Jumlah Kelas | Deskripsi |
|---|---|---|---|
| `classes.dex` | 11 MB | 10.503 | DEX utama — AndroidX, Facebook SDK, Datadog, core model |
| `classes2.dex` | 8.3 MB | 10.315 | Google Play Services, Firebase, Crashlytics |
| `classes3.dex` | 11 MB | 9.032 | Kelas utama myXL Ultimate (3.604 kelas myxlultimate), MoEngage |
| `classes4.dex` | 9.2 MB | 12.664 | Feature modules terbanyak (9.624 kelas feature) |
| `classes5.dex` | 7.4 MB | 9.950 | Feature modules lanjutan |
| `classes6.dex` | 9.8 MB | 8.700 | Feature modules lanjutan |
| `classes7.dex` | 6.6 MB | 6.791 | Feature modules lanjutan |
| `classes8.dex` | 17 KB | 11 | **Signature Killer** + **Hidden API Bypass** |

### File Native Library (.so)

| File | Ukuran | SONAME | Deskripsi |
|---|---|---|---|
| `libSignatureKiller.so` | 21 KB | libSignatureKiller.so | Bypass verifikasi signature APK |
| `libbarhopper_v2.so` | 2.2 MB | libbarhopper_v2.so | Google Barcode Scanner (Barhopper v2) |
| `libcardamom.so` | 312 KB | libcardamom.so | Penyimpanan kunci/secret natif (custom) |
| `libchecks.so` | 26 KB | libchecks.so | V-Key VGuard — deteksi root & ancaman |
| `libdatastore_shared_counter.so` | 7.0 KB | libdatastore_shared_counter.so | AndroidX Datastore shared counter |
| `libsentry-android.so` | 16 KB | libsentry-android.so | Sentry Android NDK bridge |
| `libsentry.so` | 1.2 MB | libsentry.so | Sentry native crash reporting |
| `libsqlcipher.so` | 3.5 MB | libsqlcipher.so | SQLCipher — database SQLite terenkripsi |
| `libvgjbivjepf.so` | 338 KB | **libnativelib.so** | Library kriptografi (mbedTLS) — nama diobfuskasi |
| `libvosWrapperEx.so` | 1.8 MB | libvosWrapperEx.so | V-Key VOS (Virtual Operating System) |

---

## 🔍 Analisis Detail Setiap File

### 1. `libSignatureKiller.so` — Bypass Verifikasi Signature APK

**Ukuran:** 21 KB  
**Fungsi Utama:** Mem-bypass mekanisme verifikasi signature APK Android

**Fungsi yang Diekspor:**
- `Java_bin_mt_signature_KillerApplication_hookApkPath` — Hook path APK untuk mengganti signature
- `xhook_register` — Mendaftarkan hook pada fungsi tertentu
- `xhook_refresh` — Menyegarkan hook yang terdaftar
- `xhook_ignore` — Mengabaikan hook tertentu
- `xhook_clear` — Membersihkan semua hook
- `xhook_enable_debug` — Mengaktifkan mode debug
- `xhook_enable_sigsegv_protection` — Proteksi SIGSEGV saat hooking

**Mekanisme Kerja:**
- Menggunakan library **xhook v1.2.0** untuk PLT hooking
- Membaca `/proc/self/maps` untuk menemukan library yang dimuat
- Menghook fungsi `open`, `open64`, `openat`, `openat64` untuk mengarahkan pembacaan APK
- Menggunakan regex (`.*\.so$`) untuk mencocokkan target
- Memanipulasi `mprotect` untuk mengubah proteksi memori

**Asal:** Komponen dari **MT Manager** (`bin.mt.signature`), tool modifikasi APK Android.

**Kelas Pendukung di classes8.dex:**
- `bin.mt.signature.KillerApplication` — Kelas Java yang mengelola hook signature
  - Method: `hookApkPath`, `killOpen`, `killPM`, `findField`, `getApkPath`, `getDataFile`, `isApkPath`

---

### 2. `libbarhopper_v2.so` — Google Barcode Scanner

**Ukuran:** 2.2 MB  
**Fungsi Utama:** Pemindaian dan pengenalan barcode (QR Code, barcode 1D/2D)

**Fungsi JNI:**
- `Java_com_google_android_libraries_barhopper_BarhopperV2_createNative`
- `Java_com_google_android_libraries_barhopper_BarhopperV2_recognizeBitmapNative`
- `Java_com_google_android_libraries_barhopper_BarhopperV2_recognizeBufferNative`
- `Java_com_google_android_libraries_barhopper_BarhopperV2_closeNative`
- `Java_com_google_android_libraries_barhopper_BarhopperV2_parseRawValue`

**Fitur:**
- Mendukung berbagai format barcode (QR, DataMatrix, PDF417, dll)
- Mengekstrak data terstruktur: Email, Telepon, URL, Kalender, Lisensi Pengemudi, SMS, GeoPoint, Penerbangan
- Menggunakan TensorFlow Lite untuk deteksi barcode berbasis ML
- Memproses bitmap Android secara native (`AndroidBitmap_getInfo`, `AndroidBitmap_lockPixels`)

**Dependensi:** `libjnigraphics.so`, `liblog.so`, `libm.so`, `libdl.so`, `libc.so`

**Build Path:** `blaze-out/android-arm64-v8a-opt/bin/java/com/google/android/libraries/barhopper/jni/`

---

### 3. `libcardamom.so` — Penyimpanan Kunci/Secret Natif

**Ukuran:** 312 KB  
**Fungsi Utama:** Menyimpan API key, encryption key, dan credential sensitif di native layer

**Fungsi JNI yang Diekspor (26 fungsi):**

| Fungsi | Deskripsi |
|---|---|
| `getApiKey` | API key utama aplikasi |
| `getSslCertKey` | Kunci sertifikat SSL |
| `getCiamSslCertKey` | Kunci SSL untuk CIAM (Customer Identity Access Management) |
| `getEncryptionKey` | Kunci enkripsi umum |
| `getEncryptionKeyAESCustomPrepaidAndPrio` | Kunci AES khusus prepaid dan prio |
| `getEncryptionKeyHmac512` | Kunci HMAC-SHA512 |
| `getLiveChatAesEncryptionKey` | Kunci AES untuk live chat |
| `getCiamClientId` | Client ID CIAM |
| `getCiamClientSecret` | Client Secret CIAM |
| `getCiamClientIdSecond` | Client ID CIAM kedua |
| `getCiamClientSecondSecret` | Client Secret CIAM kedua |
| `getCiamHmacKey` | HMAC Key untuk CIAM |
| `getCiamUrl` | URL CIAM |
| `getXlPrepaidXenditKey` | Kunci Xendit untuk XL Prepaid |
| `getXlAxisTrialXenditKey` | Kunci Xendit untuk Axis Trial |
| `getXlPrioXenditKey` | Kunci Xendit untuk XL Prio |
| `getXlHomeXenditKey` | Kunci Xendit untuk XL Home |
| `getXlEnterpriseXenditKey` | Kunci Xendit untuk XL Enterprise |
| `getXlEnterpriseSelfPaidXenditKey` | Kunci Xendit untuk XL Enterprise Self-Paid |
| `getMoEngageAppId` | App ID untuk MoEngage |
| `getMedalliaAppId` | App ID untuk Medallia |
| `getOptimizelyAppId` | App ID untuk Optimizely |
| `getAppsflyerAppId` | App ID untuk AppsFlyer |
| `getDataDogClientToken` | Client Token Datadog |
| `getDataDogAppId` | App ID Datadog |
| `getDataDogEnvName` | Nama environment Datadog |

#### 🔓 Hasil Ekstraksi 26 Kunci/Secret

Nilai-nilai berikut berhasil diekstraksi dari section `.rodata` di `libcardamom.so` melalui analisis disassembly ARM64 (ADRP+ADD pattern → alamat data di `.rodata`). Semua nilai disimpan sebagai string **base64url-encoded** langsung di binary.

**Metodologi Ekstraksi:**
1. Menggunakan **LIEF** untuk parsing ELF dan mendapatkan alamat fungsi JNI
2. Menggunakan **Capstone** untuk mendisassembly setiap fungsi (arsitektur ARM64)
3. Mengidentifikasi pola `ADRP xN, #page` + `ADD xN, xN, #offset` untuk menghitung alamat data
4. Mengidentifikasi pola `STRB wzr, [x0, #len]` untuk menentukan panjang string (null terminator)
5. Membaca string dari alamat virtual yang dihitung di section `.rodata`

| # | Fungsi | Panjang | Nilai (Base64URL) |
|---|---|---|---|
| 1 | `getApiKey` | 44 | `Y5HfxgZ2lusxkpRWNqepA0bKaXCoJSlWL6NWvNnCu48=` |
| 2 | `getSslCertKey` | 88 | `5QWvWV8dlu19Jk7jEVYhYM8ySJdjR3G7U5hjg6FKBcyqr8tycDtL8u7bi28-ydYh86Sdh_XXccwlk9Kq7wf28Q==` |
| 3 | `getCiamSslCertKey` | 88 | `V0C6UGlATEtqGf0SrFAx18eFSXBEoaqSf3oXlbCve8VJhoEY0OI7xuCudYWy0nFskTVJP4zphLDyfmUk0X8amA==` |
| 4 | `getEncryptionKey` | 64 | `jPIvjdOJzofWIfEgT2QLqNjxKDoL6nVWsFLJURIQoaonfAEk-JclxqLES-gIvOcs` |
| 5 | `getEncryptionKeyAESCustomPrepaidAndPrio` | 64 | `kqT0F4XkQB9SXsS0IQrxtekiH1y6jo-QUKt2W1S5Nt8wLAdK_g0zkrkl9fTJh_me` |
| 6 | `getEncryptionKeyHmac512` | 192 | `WUPdzLVRxGeC6SDiNbpxu4R7ezorbq6NHd_OfPhI6-l5tdXPln9iZLwcsxYyXJVa-XjYUbCOjs03Qg-VieKSVAgjdYdbw7vE-QCFFpCT90_XsFoYssdN-BgoYLVtuBh_6gllIZw3ZJQQUSmpcUwAfc8BRFKT1C6k_jxN5Jf-hfRR8YewewR7BEaDkewML_OX` |
| 7 | `getLiveChatAesEncryptionKey` | 64 | `kqT0F4XkQB9SXsS0IQrxtekiH1y6jo-QUKt2W1S5Nt8wLAdK_g0zkrkl9fTJh_me` |
| 8 | `getCiamClientId` | 64 | `L9BvWoF2sovdMstZRni5h2lWnFPX5LbfzgDhJaP-NEpHC3vHW9hOHBl-iFhYeAK5` |
| 9 | `getCiamClientSecret` | 64 | `DfJHvkjATDuYPIcglcaddpOy9MJVT8ptEpd0Fny3gYU6Fxxcd6vD8eAjg3QYXWiZ` |
| 10 | `getCiamClientIdSecond` | 64 | `yszGMAhyWHaQ7QCC7QOtRnFLDIvcPb-6yHDItkoAKCTkyknqHS5Tc2RUoqssHQQl` |
| 11 | `getCiamClientSecondSecret` | 64 | `vgRJ2rKWKDvnGuvSHPpsFGa2kAwlE-zb25PjesdxUkUPTg3_kozkg_h0HIr0NQiI` |
| 12 | `getCiamHmacKey` | 64 | `jDaxHwocBR2jF9Rfzc_PQ34SH-sWsKas88CDxiue6-Kbes-z7C7DyRoBQD93Dleg` |
| 13 | `getCiamUrl` | 64 | `tC7DQnovEIYfigr_RbHHKcZg-Vb3MaquYT-IE1NqOwucMiGyCNXdyw2vMTDe4yOq` |
| 14 | `getXlPrepaidXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mg6-dOLbANhqHhCj25pdSNu2t-8aNI_jK0pW-8FNwiKN0mTnroSTDmNfqyfEzpRI4CvyTQ_2hFDNlnkxO_PfAS-oPHNA7QOSKtD-POS3oybkU` |
| 15 | `getXlAxisTrialXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mg1t0YzyxMJz4QEw3g1IQlB3evBPtkrJgI5QSo_gR-ziiirACDV0bQ1ByUYgpzHXGrQva_kV56WlZiL1mxzI6gXqAprqjkPBbTH4KV5_WAyfw` |
| 16 | `getXlPrioXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mgzhY0ENUsWn9ikSMoEeAxfNsIBDVE06xJmJduu6Sa4pRQDm3MJ_KQhhVzMRZ34NWxAnEcyJ91JBa02vnE7-oC2SrqYx7k-f0BUrJhb552hkH` |
| 17 | `getXlHomeXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mg5IMhxGSMaltB6uCDOlPLgcTs-GFVsNkVnywuonhMNLMMLtO6CKxMQwwaYDrmxVHrMWHSGyVaSCmBW8tJiTXC0Osiz7gEcTdtTNhdAl4OVnA` |
| 18 | `getXlEnterpriseXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mg7hEwxZdP-z9BBqMZODwIeibGmj-nNF1xQPer5GUUI2wsqGQbaamMeCqeDsWG-GWSYsls_i0bDuQ9zfDTfWmGHy2diseMBno33q8TJh8ssym` |
| 19 | `getXlEnterpriseSelfPaidXenditKey` | 128 | `c91bb1tNs6S8HUweZt8mg7hEwxZdP-z9BBqMZODwIeibGmj-nNF1xQPer5GUUI2wsqGQbaamMeCqeDsWG-GWSYsls_i0bDuQ9zfDTfWmGHy2diseMBno33q8TJh8ssym` |
| 20 | `getMoEngageAppId` | 44 | `cwGpXU3ZXx-dxyYyGdM_MTrJpjsBfHkSma7L1YWCdyU=` |
| 21 | `getMedalliaAppId` | 940 | `Imf7-c2cRFKeqhh2-yHmP4iMfn8q5SX4tBZWPher3C8W8D75vyxm7OR0CGtOaTsF...` *(truncated — lihat detail di bawah)* |
| 22 | `getOptimizelyAppId` | 44 | `on_9w8Uh_cGp17qDlX3eo1GyAO_pcuVG5APLbtyVtMc=` |
| 23 | `getAppsflyerAppId` | 44 | `kfFxsrqHQQYQFN49Qj159FW1FQtcIWYN8Wo55RLrMS4=` |
| 24 | `getDataDogClientToken` | 64 | `-v3A9nnmblhk90cFom_ulJl-tRspc1z1ls93gS7sMl6b3h9jZvVOb6_XQmeAF7g0` |
| 25 | `getDataDogAppId` | 64 | `J0FvHs_A4FLPOZKHKZK2IxMvOgP3NXrUm0jR3EBlPYoOSOVj65suD0z4ICc4RXxz` |
| 26 | `getDataDogEnvName` | 24 | `ePyAWhBGQvh0R6wIi7s4ew==` |

<details>
<summary>🔎 Nilai lengkap getMedalliaAppId (940 karakter)</summary>

```
Imf7-c2cRFKeqhh2-yHmP4iMfn8q5SX4tBZWPher3C8W8D75vyxm7OR0CGtOaTsFTaH3-2TOLOefpNqmg9zr7rXL-Ba812XHFaYmhS5GAz-iLuEYNJo6ceYl1VsCmmP6Y4122Q7fFMkzNXvEsfICEVsgVGiDnoxkEV8-YJgoHwXoJEmVo7AI8xZJf_PUmU6vKC_IC58zmXFg36QlEPUkSaadj4qzR8X7gxshUhH68_XDtgd1KgQLPC_C5yW19A8ePO5EgkuqUDPDW_5fRzosQVAD4UTCumFF8iD10ej87qooqIkAvaf0H0oo-ROWU3IStKiQvcsOKJny-39tv-DShE2ykJpqbrOk5WZ3VCVQgbv0-ppY0rTAL02RdYltOADzNbZyzXH5F54jmiRVGNEMvlFnD-RNgMGcgu35PeW9lUbuL0EsdPJYC3ENS9OHTmfj6ZgmiCiaAHo87Ww4KBGcfzSIy10PD92ARE1POxXw4-CSpNLEhe8-iLRGbY5RUrAY-CbR9LDwc0fQhOHYceeB43m4tpF-EurnRNZwigv_k5dkyLf-vxTzTH5kHotCrsxE7pGyGEIgUX6R0x5n9B4-pGB2bM6GKEFFZQ9BuOe_QQHk4_jeZVjGrMuRxcxIy_PSQuBs5xvZ2N0euK47UNtSuXujQXCZEguf-jhyVjyXfyR5i95TLZK0dbc4XXP1yyQwWhxrQ0hkzD5L2wEiQtYaR0G0-j68ewqJlYXfmNU5xZvR3Xxg-EvXdiufq649LNTmTxy0rVUxJ9jc73nQan072LjdLW7g5b_CRomcK8rRtvpBe6A7A7EY0U3JDiHNELlC1sQTtLI9WyuZLpN1h1mGjbUaCX-fwVq8zn_Ne-Cww15DBLn3P5GNxlLxHHGSlvtruM4aO8emrPMjWIGX--oOrMesN2NELpzuL8neIw7Bs6Q=
```

</details>

#### 📊 Analisis Pola Kunci

| Kategori | Jumlah | Panjang Decoded | Format |
|---|---|---|---|
| **Kunci Enkripsi** (API, SSL, AES, HMAC) | 7 | 32–144 bytes | Base64URL, kemungkinan AES key / HMAC key |
| **Kredensial CIAM** (Client ID, Secret, URL, HMAC) | 6 | 48 bytes | Base64URL-encoded credential |
| **Kunci Pembayaran Xendit** | 6 | 96 bytes | Common prefix 21 chars, differentiating suffix |
| **App ID SDK** (MoEngage, Medallia, Optimizely, AppsFlyer) | 4 | 32–704 bytes | Base64URL-encoded identifiers |
| **Konfigurasi Datadog** (Token, App ID, Env) | 3 | 16–48 bytes | Base64URL-encoded config |

**Temuan Penting:**
- `getLiveChatAesEncryptionKey` dan `getEncryptionKeyAESCustomPrepaidAndPrio` mengembalikan **nilai yang identik** — kemungkinan menggunakan kunci AES yang sama
- `getXlEnterpriseXenditKey` dan `getXlEnterpriseSelfPaidXenditKey` mengembalikan **nilai yang identik** — endpoint pembayaran yang sama
- Semua 6 kunci Xendit memiliki **prefix 21 karakter yang sama** (`c91bb1tNs6S8HUweZt8mg`) yang decode ke 16 bytes identik — kemungkinan header/prefix umum Xendit
- `getMedalliaAppId` memiliki ukuran sangat besar (940 karakter, decode ke 704 bytes) — kemungkinan berisi konfigurasi JSON terenkripsi, bukan sekadar App ID
- Semua nilai disimpan langsung sebagai plaintext base64url di section `.rodata` — **tidak ada enkripsi tambahan di level native**

**Keamanan:** Kunci-kunci disimpan di native code (bukan di Java/Kotlin) dan dihasilkan menggunakan fungsi `random_string` internal. Meskipun lebih sulit diekstrak dibandingkan string Java, analisis binary statis dengan disassembler tetap dapat mengungkap semua nilai.

**Package Java:** `com.myxlultimate.core.spice.Cardamom`

---

### 4. `libchecks.so` — V-Key VGuard Security Checks

**Ukuran:** 26 KB  
**Fungsi Utama:** Deteksi ancaman keamanan di perangkat Android

**Fungsi JNI:**
- `checkForSuFilesNative` — Memeriksa keberadaan file `su` (indikator root)
- `checkForVncSshTelnet` — Mendeteksi server VNC, SSH (`dropbear`, `sshd`), dan Telnet (`telnetd`)
- `findSuidSgidFiles` — Mencari file dengan bit SUID/SGID yang bisa dieksploitasi
- `listPortUsing` — Memonitor port jaringan yang aktif (`/proc/net/tcp`, `tcp6`, `udp`, `udp6`)
- `dexOptFunction` — Memeriksa integritas proses DEX optimization
- `validateFunctionPointer` — Memvalidasi pointer fungsi untuk mendeteksi hooking

**Mekanisme Deteksi:**
- Membaca `/proc/mounts` untuk memeriksa filesystem (`nosuid`, `noexec`)
- Memindai `/storage/sdcard` dan `/proc/` untuk file mencurigakan
- Memeriksa `ANDROID_ROOT` environment variable
- Menggunakan `fork()` + `execl()` untuk menjalankan perintah dalam proses terpisah
- Memeriksa `geteuid()` dan `getpid()` untuk deteksi privilege escalation
- Memeriksa status "drawing over other apps" (`canDrawOverlays`)

**Deteksi Ancaman:**
- Remote access (VNC: `androidvncserver`, `android_vncs`, `pixel_beta`, `androSS`)
- SSH daemon (`dropbear`, `sshd`)
- Telnet daemon (`telnetd`)
- Root binary (`su`)
- File SUID/SGID yang berbahaya

**Package Java:** `com.vkey.android.internal.vguard.engine.NativeThreatsChecker`

---

### 5. `libdatastore_shared_counter.so` — AndroidX Datastore

**Ukuran:** 7.0 KB  
**Fungsi Utama:** Shared counter untuk AndroidX Datastore (library standar Google)

**Fungsi JNI:**
- `nativeTruncateFile` — Truncate file counter
- `nativeCreateSharedCounter` — Membuat shared counter baru (menggunakan `mmap`)
- `nativeGetCounterValue` — Mendapatkan nilai counter (atomic operation)
- `nativeIncrementAndGetCounterValue` — Increment dan ambil nilai counter

**Package Java:** `androidx.datastore.core.NativeSharedCounter`

Library ini adalah komponen standar AndroidX, bukan komponen keamanan.

---

### 6. `libsentry-android.so` — Sentry Android NDK Bridge

**Ukuran:** 16 KB  
**Fungsi Utama:** Jembatan antara Sentry SDK Java dan native crash reporting

**Fungsi JNI:**
- `nativeLoadModuleList` / `nativeClearModuleList` — Manajemen daftar modul
- `nativeAddBreadcrumb` — Menambahkan breadcrumb untuk debugging
- `nativeSetTag` / `nativeRemoveTag` — Manajemen tag
- `nativeSetExtra` / `nativeRemoveExtra` — Data tambahan
- `nativeSetUser` / `nativeRemoveUser` — Informasi user
- `initSentryNative` / `shutdown` — Inisialisasi dan shutdown

**Dependensi:** Bergantung pada `libsentry.so` untuk fungsionalitas inti.

**Package Java:** `io.sentry.android.ndk`

---

### 7. `libsentry.so` — Sentry Native Crash Reporting

**Ukuran:** 1.2 MB  
**Fungsi Utama:** Error tracking dan crash reporting native

**Fitur:**
- Crash reporting untuk kode native (C/C++)
- Session tracking (`sentry_options_set_auto_session_tracking`)
- Breadcrumbs (`sentry_options_set_max_breadcrumbs`)
- Distributed tracing (span management)
- Stack unwinding menggunakan `libunwindstack` (DWARF `.debug_frame`)
- DSN-based authentication (`x-sentry-auth`)
- Envelope-based transport (`sentry_envelope_write_to_file`)

**Build:** Dibangun dari `sentry-java/sentry-android-ndk/sentry-native` dengan Clang 12.0.8

---

### 8. `libsqlcipher.so` — SQLCipher (Database Terenkripsi)

**Ukuran:** 3.5 MB  
**Fungsi Utama:** Enkripsi database SQLite secara transparan

**Fitur Kriptografi:**
- Enkripsi AES-256 untuk seluruh database
- Key Derivation Function (KDF) yang dapat dikonfigurasi (`kdf_iter`, `fast_kdf_iter`)
- HMAC untuk integritas data (`hmac_algorithm`)
- Codec attachment untuk enkripsi/dekripsi halaman database
- Migration support antar versi SQLCipher
- FIPS compliance check (`sqlcipher_codec_fips_status`)
- Plaintext header support untuk kompatibilitas

**Fungsi Utama:**
- `sqlcipher_activate` — Aktivasi engine
- `sqlcipher_codec_ctx_init` — Inisialisasi context
- `sqlcipher_codec_ctx_set_pass` — Set password enkripsi
- `sqlcipher_codec_ctx_set_kdf_iter` — Konfigurasi iterasi KDF
- `sqlcipher_codec_ctx_integrity_check` — Pemeriksaan integritas
- `sqlcipher_codec_ctx_migrate` — Migrasi database

**Package Java:** `net.sqlcipher`

---

### 9. `libvgjbivjepf.so` — Library Kriptografi (Nama Diobfuskasi)

**Ukuran:** 338 KB  
**SONAME Asli:** `libnativelib.so` (nama file `libvgjbivjepf.so` diobfuskasi)  
**Fungsi Utama:** Enkripsi/dekripsi dan dekompresi aset

**Fitur Kriptografi (mbedTLS):**
- AES encryption/decryption (`mbedtls_internal_aes_encrypt`, `mbedtls_internal_aes_decrypt`)
- GCM authenticated encryption (`mbedtls_gcm_auth_decrypt`)
- Multiple cipher support (`mbedtls_cipher_info_from_type`, `mbedtls_cipher_info_from_string`)
- Padding mode configuration (`mbedtls_cipher_set_padding_mode`)
- Tag-based authentication (`mbedtls_cipher_write_tag`, `mbedtls_cipher_check_tag`)

**Fitur Dekompresi:**
- `inflateInit2_` / `inflate` / `inflateEnd` — Dekompresi data (zlib)

**Fitur Akses Aset:**
- `AAssetManager_fromJava` / `AAssetManager_open` / `AAsset_read` — Membaca aset dari APK
- `fopen` / `fwrite` / `fclose` — Menulis file ke disk

**Referensi:** `com/myxlultimate/app/MainApplication` — Terhubung ke kelas utama aplikasi

**Dependensi:** `libandroid.so`, `libz.so`, `liblog.so`, `libm.so`, `libdl.so`, `libc.so`

**Analisis:** Library ini kemungkinan berfungsi untuk mendekripsi dan mendekompresi aset yang dilindungi dalam APK, kemudian memuatnya ke dalam memori saat aplikasi berjalan.

---

### 10. `libvosWrapperEx.so` — V-Key VOS (Virtual Operating System)

**Ukuran:** 1.8 MB  
**Fungsi Utama:** Proteksi aplikasi mobile menggunakan V-Key VOS SDK

**Fungsi JNI:**
- `initVOSJNI` — Inisialisasi VOS
- `execute` — Eksekusi perintah dalam VOS
- `getFirmwareVersion` / `getProcessorVersion` — Info versi firmware/processor virtual
- `getVmHandle` / `releaseVmHandle` — Manajemen handle mesin virtual
- `registerCallback` — Mendaftarkan callback
- `getVADefaultPath` / `setVADefaultPath` — Manajemen path Virtual Application

**Fitur Keamanan:**
- Secure I/O Bridge: `secure_io_bridge_setup`, `secure_io_bridge_export_keys`, `secure_io_bridge_import_keys`
- File Encryption: `secure_io_bridge_get_file_enc_key` (v1, v2, v3)
- Access Control: `CheckRead`, `CheckWrite`, `CheckExecute`, `CheckReadWrite`
- Secure Buffer: `SecureBuffer_Allocate`, `SecureBuffer_Free`
- Secure Logging: `initVSSecureLog`, `forceSyncLogs`

**Kriptografi (mbedTLS):**
- RSA: `mbedtls_rsa_pkcs1_encrypt`, `mbedtls_rsa_pkcs1_decrypt`, `mbedtls_rsa_check_pubkey`
- AES: `mbedtls_aes_encrypt`, `mbedtls_aes_decrypt`
- Certificate: `mbedtls_oid_get_certificate_policies`
- Key Pair: `mbedtls_pk_check_pair`, `mbedtls_pk_encrypt`, `mbedtls_pk_decrypt`

**Package Java:** `vkey.android.vos.VosWrapper`, `vkey.android.vos.MgService`

**Vendor:** [V-Key](https://www.v-key.com/) — Perusahaan keamanan mobile yang menyediakan Virtual Operating System untuk proteksi aplikasi.

---

### 11. `classes8.dex` — Signature Killer & Hidden API Bypass

**Ukuran:** 17 KB (11 kelas)  
**Fungsi Utama:** Komponen modifikasi APK

**Kelas-kelas:**

#### `bin.mt.signature.KillerApplication`
Kelas utama Signature Killer dari **MT Manager**:
- `hookApkPath()` — Hook path APK (native method)
- `killOpen()` — Mematikan pemeriksaan open
- `killPM()` — Mematikan pemeriksaan Package Manager
- `findField()` — Mencari field via reflection
- `getApkPath()` / `isApkPath()` — Manajemen path APK
- `getDataFile()` — Mendapatkan file data

#### `org.lsposed.hiddenapibypass.HiddenApiBypass`
Library dari **LSPosed** untuk melewati batasan Hidden API Android:
- `addHiddenApiExemptions()` — Menambah pengecualian API tersembunyi
- `clearHiddenApiExemptions()` — Membersihkan pengecualian
- `getDeclaredMethod()` / `getDeclaredMethods()` — Akses method tersembunyi
- `getDeclaredConstructor()` — Akses constructor tersembunyi
- `getInstanceFields()` / `getStaticFields()` — Akses field tersembunyi
- `invoke()` / `newInstance()` — Memanggil method/constructor tersembunyi
- `setHiddenApiExemptions()` — Mengatur pengecualian

---

## 🏗️ Arsitektur Aplikasi myXL Ultimate

### Package Utama (Top 20 berdasarkan jumlah kelas)

| Package | Jumlah Kelas | Deskripsi |
|---|---|---|
| `com/myxlultimate` | 26.489 | Kode aplikasi utama |
| `com/google` | 6.868 | Google libraries (GMS, Firebase, gRPC) |
| `com/moengage` | 2.777 | MoEngage (marketing engagement) |
| `com/datadog` | 1.904 | Datadog (monitoring & analytics) |
| `kotlin/reflect` | 1.628 | Kotlin Reflection |
| `com/facebook` | 1.510 | Facebook SDK |
| `com/medallia` | 661 | Medallia (customer experience) |
| `io/sentry` | 598 | Sentry (error tracking) |
| `io/grpc` | 575 | gRPC (network communication) |
| `com/appsflyer` | 471 | AppsFlyer (attribution) |
| `androidx/room` | 450 | Room Database |
| `kotlinx/coroutines` | 438 | Kotlin Coroutines |
| `androidx/appcompat` | 376 | AppCompat |
| `androidx/core` | 361 | AndroidX Core |
| `androidx/camera` | 333 | CameraX |
| `androidx/datastore` | 281 | DataStore |
| `androidx/paging` | 279 | Paging Library |
| `io/reactivex` | 226 | RxJava |
| `kotlinx/serialization` | 219 | Kotlin Serialization |
| `com/bumptech` | 205 | Glide (image loading) |

### Modul Fitur (39 Modul)

Aplikasi menggunakan arsitektur modular dengan 39 feature module:

| Modul | Deskripsi |
|---|---|
| `feature_about` | Halaman tentang |
| `feature_account` | Manajemen akun |
| `feature_autologin` | Login otomatis |
| `feature_billing` | Tagihan |
| `feature_biz_on` | Fitur bisnis |
| `feature_biz_optimus` | Fitur bisnis Optimus |
| `feature_care` | Layanan pelanggan |
| `feature_creditcard` | Kartu kredit |
| `feature_dashboard` | Dashboard utama |
| `feature_family_hub` | Hub keluarga |
| `feature_family_plan` | Paket keluarga |
| `feature_family_plan_prio` | Paket keluarga Prio |
| `feature_fun` | Hiburan |
| `feature_guest_login` | Login tamu |
| `feature_homebook` | Home book |
| `feature_inbox` | Kotak masuk |
| `feature_lockunlock` | Kunci/buka kunci |
| `feature_login` | Login |
| `feature_loyalty` | Program loyalitas |
| `feature_loyalty_tiering` | Tier loyalitas |
| `feature_mission` | Misi |
| `feature_modem` | Modem |
| `feature_notification` | Notifikasi |
| `feature_onboarding` | Onboarding |
| `feature_prio_club` | Prio Club |
| `feature_product` | Produk |
| `feature_profile` | Profil |
| `feature_referral` | Referral |
| `feature_roaming` | Roaming |
| `feature_setting` | Pengaturan |
| `feature_spend_limit` | Batas pengeluaran |
| `feature_store` | Toko |
| `feature_surprise_event` | Event kejutan |
| `feature_topup` | Top up |
| `feature_transaction_routine_autobuy` | Transaksi rutin (auto buy) |
| `feature_upfront` | Upfront |
| `feature_util` | Utilitas |
| `feature_voucher` | Voucher |
| `feature_xlsatu_biz` | XL Satu Bisnis |

---

## 🛡️ SDK Pihak Ketiga

| SDK | Jumlah Kelas | Kategori | Fungsi |
|---|---|---|---|
| MoEngage | 2.777 | Marketing | Customer engagement, push notification |
| Google Play Services | 2.211 | Platform | Auth, maps, ads, analytics |
| Firebase | 2.004 | Backend | Crashlytics, messaging, in-app messaging, dynamic links, remote config |
| Datadog | 1.904 | Monitoring | APM, RUM, logging, error tracking |
| Facebook SDK | 1.510 | Social | Login, analytics, app events |
| Medallia | 661 | CX | Customer experience feedback |
| Sentry | 598 | Monitoring | Error tracking, crash reporting |
| gRPC | 575 | Network | Remote procedure calls |
| AppsFlyer | 471 | Attribution | Install attribution, deep linking |
| CameraX | 333 | Media | Camera functionality |
| Glide | 205 | Media | Image loading & caching |
| Optimizely | 163 | A/B Testing | Feature flags, experimentation |
| OkHttp | 140 | Network | HTTP client |
| JJWT | 134 | Security | JSON Web Token handling |
| Airbnb Lottie | 92 | UI | Animasi |
| SQLCipher | 76 | Database | Encrypted SQLite |
| Xendit | 74 | Payment | Payment gateway Indonesia |
| Material DateTime Picker | 45 | UI | Date/time picker |
| Snowplow Analytics | 21 | Analytics | Event tracking |
| Dagger Hilt | 19 | DI | Dependency injection |
| V-Key VOS | 1+ | Security | App protection |

---

## 🔐 Analisis Keamanan

### Lapisan Keamanan yang Terdeteksi

1. **V-Key VOS (Virtual Operating System)** — `libvosWrapperEx.so`
   - Menjalankan kode sensitif dalam virtual machine terisolasi
   - Secure I/O bridge untuk enkripsi file
   - Access control (Read/Write/Execute)
   - Secure buffer management

2. **V-Key VGuard Threat Detection** — `libchecks.so`
   - Deteksi root (su binary, SUID/SGID files)
   - Deteksi remote access (VNC, SSH, Telnet)
   - Validasi function pointer (anti-hooking)
   - Monitoring port jaringan
   - Pemeriksaan integritas DEX

3. **Native Key Storage** — `libcardamom.so`
   - 26 kunci/secret disimpan di native code
   - Termasuk SSL cert, encryption key, payment key (Xendit), CIAM credentials
   - Menggunakan random string generation

4. **SQLCipher** — `libsqlcipher.so`
   - Enkripsi database lokal dengan AES-256
   - KDF berbasis password
   - HMAC integrity check

5. **Asset Encryption** — `libvgjbivjepf.so`
   - mbedTLS untuk enkripsi/dekripsi (AES-GCM)
   - Dekompresi aset yang dilindungi
   - Nama file diobfuskasi

6. **JWT Authentication** — JJWT library
   - 134 kelas untuk penanganan JSON Web Token

### Komponen Modifikasi (Non-Standar)

1. **Signature Killer** — `libSignatureKiller.so` + `classes8.dex`
   - Berasal dari **MT Manager** (tool modifikasi APK)
   - Menggunakan **xhook v1.2.0** untuk PLT function hooking
   - Menghook `open`/`openat` untuk mengarahkan pembacaan APK
   - Tujuan: Membuat APK yang dimodifikasi tetap bisa berjalan meski signature berubah

2. **Hidden API Bypass** — `classes8.dex`
   - Berasal dari **LSPosed**
   - Melewati batasan Android Hidden API
   - Mengakses method, constructor, dan field internal Android yang biasanya diblokir

---

## 🔗 Dependency Graph Native Library

```
libsentry-android.so ──→ libsentry.so ──→ liblog.so, libdl.so, libm.so, libc.so
libSignatureKiller.so ──→ liblog.so, libm.so, libdl.so, libc.so
libbarhopper_v2.so ──→ libjnigraphics.so, liblog.so, libm.so, libdl.so, libc.so
libcardamom.so ──→ liblog.so, libm.so, libdl.so, libc.so
libchecks.so ──→ liblog.so, libm.so, libdl.so, libc.so
libdatastore_shared_counter.so ──→ libm.so, libdl.so, libc.so
libsqlcipher.so ──→ liblog.so, libc.so, libm.so, libdl.so
libvgjbivjepf.so ──→ libandroid.so, liblog.so, libz.so, libm.so, libdl.so, libc.so
libvosWrapperEx.so ──→ liblog.so, libandroid.so, libm.so, libdl.so, libc.so
```

---

## 🔑 Hash File (SHA-256)

<details>
<summary>Klik untuk melihat hash SHA-256 semua file</summary>

| File | SHA-256 |
|---|---|
| `classes.dex` | `06bb65d33778ac485351859053101682bf198dc5554fa1c3e5c5c59b6f7bce70` |
| `classes2.dex` | `492994bddd1cc4b22bcc56bbc3677736562fdfce71f9846741177c9db64c7c1c` |
| `classes3.dex` | `86e11dbe2d3f8d70721d46313e9df620378ada02b11a70cee62614f89ef8f62e` |
| `classes4.dex` | `26f55ef6e04b9014668f730263964b6f3d8c78fe914c08a03ee94ff82cc81bf1` |
| `classes5.dex` | `a7bb0e00e375ab1d327e618d9df93ee73e740e6a3a010f8e0d92e5bb1690cc5c` |
| `classes6.dex` | `c041191e2c4e63ba411d447ef29f8df1fc1ed7c8768682ac7a6efcee2810914f` |
| `classes7.dex` | `2543d340e353c67e05ded7f4c27bf190d5c74658a70f8c86c924727661373f66` |
| `classes8.dex` | `64bda3d87b889e49cd7db71cda458cce8b7d82f0df2e2b59e86d07d526475aa6` |
| `libSignatureKiller.so` | `482f0088d1c7cbb01f649c87c5be157a81803718febf39450698eeb668bf1076` |
| `libbarhopper_v2.so` | `924d29770e5b357be1184441bf2d3cd94ca0c47ba7d5553d80723153ea952149` |
| `libcardamom.so` | `5343ab9c99e24e12d92bca6bc0c23c1139fc4df9bf5e0653fb777fcca76fe561` |
| `libchecks.so` | `2f71fb1150416120177fb9fe275538ce32da07e2dee0f99cee327d00a28cfcf8` |
| `libdatastore_shared_counter.so` | `d3e48717c9aa147e0ab21063ba0e8e0211cabf8bf40b222640829519edbf58e1` |
| `libsentry-android.so` | `d32cf3b39f15afc35ec306a3244731fdf7be67a610b95f460a3984b02fff2a1e` |
| `libsentry.so` | `aa20e0165967c01c85e2cccb865ec92bafcd990a07f643d360bf2d32f45f83ae` |
| `libsqlcipher.so` | `c9bbfe340d57b65a18652eb5be0e480ec59c4788606e1db453d5e75a66449db5` |
| `libvgjbivjepf.so` | `74d1d69b35c8e811d1cd694c57d4a1e3e2cdeafdc86811678c4cedc6256634a5` |
| `libvosWrapperEx.so` | `ff7cfd61340f09bcc4311a301ee0b98d818e1ee500cdaa515c034feae94c289c` |

</details>

---

## 📝 Kesimpulan

Repository ini berisi komponen-komponen dari APK **myXL Ultimate** (aplikasi operator seluler XL Axiata) yang telah diekstrak dan **dimodifikasi**. Indikasi modifikasi terlihat dari kehadiran:

1. **Signature Killer** (`libSignatureKiller.so` + `classes8.dex`) — Komponen dari MT Manager yang membypass verifikasi signature APK, memungkinkan APK yang dimodifikasi tetap berjalan.

2. **Hidden API Bypass** (`classes8.dex`) — Library dari LSPosed yang melewati batasan Android Hidden API.

Sementara komponen lainnya merupakan bagian standar dari aplikasi myXL Ultimate, termasuk:
- **Proteksi keamanan berlapis** (V-Key VOS, VGuard, SQLCipher, native key storage)
- **SDK analitik dan monitoring** (Datadog, Sentry, MoEngage, AppsFlyer, Medallia)
- **Infrastruktur pembayaran** (Xendit)
- **Fitur-fitur telekomunikasi** (39 modul fitur untuk dashboard, billing, top-up, roaming, dll.)

**Catatan:** Modifikasi APK dan bypass signature merupakan tindakan yang melanggar Terms of Service sebagian besar aplikasi dan berpotensi melanggar hukum di beberapa yurisdiksi.
