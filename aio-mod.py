#!/usr/bin/env python3
"""
AIO-Mod Toolkit v2.0 — Open Source APK Modding Toolkit

A clean, transparent Python 3 recreation for Termux (Android terminal).
No obfuscation · No anti-debug · No kill switch · No remote password

Requirements (Termux):
    pkg install openjdk-21 radare2 aapt android-tools zip unzip python3
    pip3 install requests

Usage:
    python3 aio-mod.py
"""

import os
import sys
import re
import struct
import hashlib
import zlib
import shutil
import zipfile
import subprocess
import glob as globmod
from pathlib import Path

try:
    import requests
except ImportError:
    print("[INFO] 'requests' package not found. Attempting install ...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "requests", "-q"],
    )
    if result.returncode != 0:
        print("[ERROR] Failed to install 'requests'. Run: pip3 install requests")
        sys.exit(1)
    import requests

# ────────────────────────────────── ANSI Colors ──────────────────────────────

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
CYAN = "\033[96m"
WHITE = "\033[97m"
BOLD = "\033[1m"
RESET = "\033[0m"

# ──────────────────────────────── Paths / URLs ───────────────────────────────

TOOL_DIR = os.path.join(os.path.expanduser("~"), ".aio-toolkit")
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Default certificate values for custom signing
CERT_DEFAULTS = {
    "CN": "t.me/user_legend",
    "OU": "will69",
    "O": "will69",
    "L": "MARS",
    "ST": "SATURN",
    "C": "PLUTO",
    "EMAIL": "will69@sign.com",
}

TOOL_URLS = {
    "APKEditor.jar": (
        "https://github.com/willstore69/tools/raw/refs/heads/main/APKEditor.jar"
    ),
    "apksigner.jar": (
        "https://github.com/willstore69/tools/raw/refs/heads/main/apksigner.jar"
    ),
    "testkey.pk8": (
        "https://github.com/willstore69/tools/raw/refs/heads/main/testkey.pk8"
    ),
    "testkey.x509.pem": (
        "https://raw.githubusercontent.com/willstore69/tools/refs/heads/main/"
        "testkey.x509.pem"
    ),
    "ManifestEditor.jar": (
        "https://github.com/qomg/AndroidManifestEditor/releases/download/"
        "v1.0.2/ManifestEditor-1.0.2.jar"
    ),
}

# ──────────────────────────── Logging Helpers ────────────────────────────────


def info(msg):
    print(f"  {CYAN}[INFO]{RESET} {msg}")


def success(msg):
    print(f"  {GREEN}[SUCCESS]{RESET} {msg}")


def error(msg):
    print(f"  {RED}[ERROR]{RESET} {msg}")


def warn(msg):
    print(f"  {YELLOW}[WARN]{RESET} {msg}")


def banner():
    print(
        f"\n{BOLD}{CYAN}"
        "╔══════════════════════════════════════════╗\n"
        "║       AIO-MOD TOOLKIT v2.0 (OSS)        ║\n"
        "║    Open Source APK Modding Toolkit       ║\n"
        "╚══════════════════════════════════════════╝"
        f"{RESET}\n"
    )


def clear():
    os.system("clear" if os.name != "nt" else "cls")


def pause():
    input(f"\n  {BOLD}Press Enter to continue...{RESET}")


# ─────────────────────────── Tool Management ─────────────────────────────────


def ensure_tool_dir():
    os.makedirs(TOOL_DIR, exist_ok=True)


def download_tool(name):
    """Download a tool to TOOL_DIR if not already present."""
    ensure_tool_dir()
    dest = os.path.join(TOOL_DIR, name)
    if os.path.isfile(dest):
        return dest
    if name not in TOOL_URLS:
        error(f"Unknown tool: {name}")
        return None
    url = TOOL_URLS[name]
    info(f"Downloading {name} ...")
    try:
        resp = requests.get(url, stream=True, timeout=120, allow_redirects=True)
        resp.raise_for_status()
        with open(dest, "wb") as fh:
            for chunk in resp.iter_content(chunk_size=8192):
                fh.write(chunk)
        success(f"{name} downloaded.")
        return dest
    except Exception as exc:
        error(f"Failed to download {name}: {exc}")
        if os.path.exists(dest):
            os.remove(dest)
        return None


def tool_path(name):
    """Return full path to a tool, downloading first if necessary."""
    path = os.path.join(TOOL_DIR, name)
    if os.path.isfile(path):
        return path
    return download_tool(name)


# ──────────────────────────── APK Discovery ──────────────────────────────────


def find_apk_files():
    """Find APK / XAPK / APKS files in the current working directory."""
    files = []
    for ext in ("*.apk", "*.xapk", "*.apks"):
        files.extend(globmod.glob(ext))
    files.sort()
    return files


def select_apk():
    """Interactive picker for APK files in the current directory."""
    files = find_apk_files()
    if not files:
        error("No APK/XAPK/APKS files found in the current directory.")
        return None
    print(f"\n  {BOLD}Found files:{RESET}")
    for idx, name in enumerate(files, 1):
        size_mb = os.path.getsize(name) / (1024 * 1024)
        ext_label = os.path.splitext(name)[1].upper()
        print(
            f"  {YELLOW}[{idx}]{RESET} {name} "
            f"{CYAN}({size_mb:.1f} MB){RESET} {MAGENTA}{ext_label}{RESET}"
        )
    print(f"  {YELLOW}[0]{RESET} Cancel")
    try:
        choice = int(input(f"\n  {BOLD}Select file: {RESET}"))
        if choice == 0:
            return None
        if 1 <= choice <= len(files):
            return files[choice - 1]
    except (ValueError, EOFError):
        pass
    error("Invalid selection.")
    return None


def resolve_apk(filepath):
    """Convert XAPK / APKS to a plain APK when necessary."""
    if filepath is None:
        return None
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".apk":
        return filepath

    if ext == ".xapk":
        info("Extracting base APK from XAPK ...")
        tmp = filepath + "_xapk_tmp"
        os.makedirs(tmp, exist_ok=True)
        subprocess.run(["unzip", "-o", "-q", filepath, "-d", tmp], check=True)
        for fname in os.listdir(tmp):
            if fname.endswith(".apk"):
                out = filepath.replace(".xapk", "_base.apk")
                shutil.copy2(os.path.join(tmp, fname), out)
                shutil.rmtree(tmp, ignore_errors=True)
                success(f"Base APK extracted: {out}")
                return out
        shutil.rmtree(tmp, ignore_errors=True)
        error("No base APK found inside XAPK.")
        return None

    if ext == ".apks":
        info("Merging APKS bundle ...")
        editor = tool_path("APKEditor.jar")
        if not editor:
            return None
        out = filepath.replace(".apks", "_merged.apk")
        result = subprocess.run(
            ["java", "-jar", editor, "m", "-i", filepath, "-o", out],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and os.path.isfile(out):
            success(f"APKS merged: {out}")
            return out
        error(f"Failed to merge APKS: {result.stderr.strip()}")
        return None

    error(f"Unsupported file format: {ext}")
    return None


# ─────────────────────── File / APK Helpers ──────────────────────────────────


def make_work_dir(prefix="aio_work"):
    """Create a temporary working directory in the current directory."""
    path = os.path.join(os.getcwd(), f"{prefix}_{os.getpid()}")
    os.makedirs(path, exist_ok=True)
    return path


def extract_apk(apk_path, dest_dir):
    """Extract APK contents into *dest_dir*."""
    info(f"Extracting {os.path.basename(apk_path)} ...")
    subprocess.run(["unzip", "-o", "-q", apk_path, "-d", dest_dir], check=True)
    success("APK extracted.")


def repack_apk(source_dir, output_apk):
    """Repack a directory into an APK (zip archive)."""
    info(f"Repacking to {os.path.basename(output_apk)} ...")
    if os.path.isfile(output_apk):
        os.remove(output_apk)
    # Strip old signature so apksigner starts fresh
    meta = os.path.join(source_dir, "META-INF")
    if os.path.isdir(meta):
        shutil.rmtree(meta)
    saved_cwd = os.getcwd()
    os.chdir(source_dir)
    try:
        subprocess.run(["zip", "-r", "-q", output_apk, "."], check=True)
    finally:
        os.chdir(saved_cwd)
    success(f"Repacked: {os.path.basename(output_apk)}")


def sign_apk_default(apk_path):
    """Sign an APK with the default test keys."""
    signer = tool_path("apksigner.jar")
    pk8 = tool_path("testkey.pk8")
    pem = tool_path("testkey.x509.pem")
    if not all((signer, pk8, pem)):
        error("Missing signing tools.")
        return False
    info("Signing APK with default test keys ...")
    result = subprocess.run(
        [
            "java", "-jar", signer, "sign",
            "--key", pk8,
            "--cert", pem,
            "--v1-signing-enabled", "true",
            "--v2-signing-enabled", "true",
            "--v3-signing-enabled", "true",
            "--v4-signing-enabled", "false",
            apk_path,
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode == 0:
        success("APK signed successfully.")
        return True
    error(f"Signing failed: {result.stderr.strip()}")
    return False


def modify_manifest(manifest_path, app_name=None, extract_native_libs=None):
    """Modify an AndroidManifest.xml using ManifestEditor."""
    editor = tool_path("ManifestEditor.jar")
    if not editor:
        return False
    if app_name:
        info(f"Setting application name → {app_name}")
        subprocess.run(
            ["java", "-jar", editor, manifest_path, "-an", app_name],
            capture_output=True, text=True, check=True,
        )
    if extract_native_libs is not None:
        val = "true" if extract_native_libs else "false"
        info(f"Setting extractNativeLibs → {val}")
        subprocess.run(
            ["java", "-jar", editor, manifest_path, "-f",
             "-extractNativeLibs", val],
            capture_output=True, text=True, check=True,
        )
    return True


def _dex_sort_key(name):
    """Extract numeric index from a classesN.dex filename for sorting."""
    m = re.search(r"(\d+)", name)
    return int(m.group(1)) if m else 0


def shift_dex_files(apk_dir, shift_by=1):
    """Rename classes*.dex → classes(N+shift).dex in descending order."""
    dex_files = sorted(
        (f for f in os.listdir(apk_dir) if re.match(r"classes\d*\.dex$", f)),
        key=_dex_sort_key,
        reverse=True,
    )
    for dname in dex_files:
        m = re.match(r"classes(\d*)\.dex$", dname)
        num = int(m.group(1)) if m.group(1) else 1
        new_name = f"classes{num + shift_by}.dex"
        os.rename(os.path.join(apk_dir, dname), os.path.join(apk_dir, new_name))
        info(f"  {dname} → {new_name}")


def extract_core_zip(core_zip, dest_dir):
    """Extract a (possibly password-protected) core zip."""
    os.makedirs(dest_dir, exist_ok=True)
    # Try without password first, then common passwords
    for pw in [None, "will69", "willgacor69", "srpatch", ""]:
        cmd = ["unzip", "-o", "-q"]
        if pw is not None:
            cmd += ["-P", pw]
        cmd += [core_zip, "-d", dest_dir]
        r = subprocess.run(cmd, capture_output=True)
        if r.returncode == 0:
            return True
    error("Cannot extract core zip (password protected?).")
    return False


# ──────────────────────── DexManipulator Class ───────────────────────────────


class DexManipulator:
    """Parse and patch Dalvik Executable (DEX) files."""

    DEX_MAGIC = b"dex\n"
    # const/4 v0, 0x0 ; return v0
    PATCH_BYTES = b"\x12\x00\x0f\x00"

    def __init__(self, dex_path):
        self.dex_path = dex_path
        with open(dex_path, "rb") as fh:
            self.data = bytearray(fh.read())
        if self.data[:4] != self.DEX_MAGIC:
            raise ValueError(f"Not a valid DEX file: {dex_path}")

    # ── low-level readers ────────────────────────────────────────────────

    def read_uint32(self, offset):
        return struct.unpack_from("<I", self.data, offset)[0]

    def read_uint16(self, offset):
        return struct.unpack_from("<H", self.data, offset)[0]

    def write_uint32(self, offset, value):
        struct.pack_into("<I", self.data, offset, value)

    def write_uint16(self, offset, value):
        struct.pack_into("<H", self.data, offset, value)

    def parse_uleb128(self, offset):
        """Parse a ULEB128 value. Returns (value, new_offset)."""
        result = shift = 0
        while True:
            byte = self.data[offset]
            result |= (byte & 0x7F) << shift
            offset += 1
            if (byte & 0x80) == 0:
                break
            shift += 7
        return result, offset

    # ── string table ─────────────────────────────────────────────────────

    def get_string(self, string_idx):
        """Look up a string by index in the DEX string table."""
        string_ids_off = self.read_uint32(0x3C)
        string_data_off = self.read_uint32(string_ids_off + string_idx * 4)
        # skip ULEB128 utf16_size
        _, off = self.parse_uleb128(string_data_off)
        end = self.data.index(0, off)
        return self.data[off:end].decode("utf-8", errors="replace")

    # ── method parsing ───────────────────────────────────────────────────

    def parse_dex_methods(self):
        """Return a list of (method_name, code_offset, method_idx) tuples."""
        methods = []

        method_ids_size = self.read_uint32(0x58)
        method_ids_off = self.read_uint32(0x5C)
        class_defs_size = self.read_uint32(0x60)
        class_defs_off = self.read_uint32(0x64)

        # Build method-idx → name map
        method_names = {}
        for i in range(method_ids_size):
            base = method_ids_off + i * 8
            name_idx = self.read_uint32(base + 4)
            try:
                method_names[i] = self.get_string(name_idx)
            except Exception:
                method_names[i] = f"<unknown_{i}>"

        # Walk class definitions
        for c in range(class_defs_size):
            cls_base = class_defs_off + c * 32
            class_data_off = self.read_uint32(cls_base + 24)
            if class_data_off == 0:
                continue

            off = class_data_off
            static_fields_size, off = self.parse_uleb128(off)
            instance_fields_size, off = self.parse_uleb128(off)
            direct_methods_size, off = self.parse_uleb128(off)
            virtual_methods_size, off = self.parse_uleb128(off)

            # Skip fields (each has two ULEB128 values)
            for _ in range(static_fields_size + instance_fields_size):
                _, off = self.parse_uleb128(off)
                _, off = self.parse_uleb128(off)

            # Parse direct + virtual methods
            for count in (direct_methods_size, virtual_methods_size):
                method_idx = 0
                for _ in range(count):
                    idx_diff, off = self.parse_uleb128(off)
                    _access, off = self.parse_uleb128(off)
                    code_off, off = self.parse_uleb128(off)
                    method_idx += idx_diff
                    if code_off != 0 and method_idx in method_names:
                        methods.append(
                            (method_names[method_idx], code_off, method_idx)
                        )

        return methods

    # ── header fixup ─────────────────────────────────────────────────────

    def fix_dex_headers(self):
        """Recalculate file_size, SHA-1, and Adler-32 in the DEX header."""
        # file_size at offset 0x20
        self.write_uint32(0x20, len(self.data))
        # SHA-1 at offset 12 — covers bytes 32..end
        sha1 = hashlib.sha1(bytes(self.data[32:])).digest()
        self.data[12:32] = sha1
        # Adler-32 at offset 8 — covers bytes 12..end
        checksum = zlib.adler32(bytes(self.data[12:])) & 0xFFFFFFFF
        self.write_uint32(8, checksum)

    # ── patch a method to return false ───────────────────────────────────

    def patch(self, target_method_name):
        """Find *target_method_name* and replace its body with `return 0`."""
        info(f"Searching for method: {target_method_name}")
        methods = self.parse_dex_methods()

        patched = 0
        for name, code_off, _idx in methods:
            if target_method_name not in name:
                continue
            info(f"Patching method '{name}' at code offset 0x{code_off:X}")
            # code_item: regs(2) ins(2) outs(2) tries(2) debug(4) insns_size(4) insns[]
            self.write_uint16(code_off, 1)       # registers_size = 1
            self.write_uint16(code_off + 4, 0)   # outs_size = 0
            self.write_uint16(code_off + 6, 0)   # tries_size = 0
            self.write_uint32(code_off + 12, 2)  # insns_size = 2 code units
            self.data[code_off + 16 : code_off + 20] = self.PATCH_BYTES
            patched += 1

        if patched == 0:
            warn(f"Method '{target_method_name}' not found in DEX.")
            return False

        self.fix_dex_headers()
        success(f"Patched {patched} method(s).")
        return True

    def save(self, output_path=None):
        path = output_path or self.dex_path
        with open(path, "wb") as fh:
            fh.write(self.data)
        success(f"DEX saved: {os.path.basename(path)}")


# ───────────────────── Feature 1: Signature Killer v1 ────────────────────────


def sig_killer_v1():
    """Signature Killer v1 — MT VIP Method (will_core.zip)."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ SIGNATURE KILLER v1 (MT VIP) ═══{RESET}\n")

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    core_zip = os.path.join(SCRIPT_DIR, "will_core.zip")
    if not os.path.isfile(core_zip):
        error(f"will_core.zip not found in {SCRIPT_DIR}")
        error("Place will_core.zip alongside this script and retry.")
        pause()
        return

    work = make_work_dir("sigkill_v1")
    apk_dir = os.path.join(work, "apk")
    core_dir = os.path.join(work, "core")

    try:
        # ── extract core zip ─────────────────────────────────────────────
        if not extract_core_zip(core_zip, core_dir):
            pause()
            return

        # ── extract APK ──────────────────────────────────────────────────
        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        # ── save original signatures ─────────────────────────────────────
        meta_src = os.path.join(apk_dir, "META-INF")
        sig_files = {}
        if os.path.isdir(meta_src):
            for fname in os.listdir(meta_src):
                fp = os.path.join(meta_src, fname)
                if os.path.isfile(fp):
                    with open(fp, "rb") as fh:
                        sig_files[fname] = fh.read()

        # ── patch will69.dex ─────────────────────────────────────────────
        will_dex = None
        for root, _dirs, files in os.walk(core_dir):
            for f in files:
                if f == "will69.dex":
                    will_dex = os.path.join(root, f)
                    break
            if will_dex:
                break

        if will_dex:
            try:
                dex = DexManipulator(will_dex)
                dex.patch("isValid")
                dex.save()
            except Exception as exc:
                warn(f"DEX patch skipped: {exc}")

        # ── shift existing DEX files ─────────────────────────────────────
        info("Shifting DEX files ...")
        shift_dex_files(apk_dir, shift_by=1)

        # ── inject will69.dex as classes.dex ─────────────────────────────
        if will_dex:
            shutil.copy2(will_dex, os.path.join(apk_dir, "classes.dex"))
            info("Injected will69.dex → classes.dex")

        # ── inject native libraries ──────────────────────────────────────
        arch_names = {"arm64-v8a", "armeabi-v7a", "armeabi", "x86", "x86_64"}
        for root, _dirs, files in os.walk(core_dir):
            for f in files:
                if not f.endswith(".so"):
                    continue
                rel = os.path.relpath(os.path.join(root, f), core_dir)
                matched_arch = next((a for a in arch_names if a in rel), None)
                if matched_arch:
                    dest = os.path.join(apk_dir, "lib", matched_arch, f)
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    shutil.copy2(os.path.join(root, f), dest)
                    info(f"Injected {f} → lib/{matched_arch}/")
                else:
                    # Copy into every arch dir that already exists
                    lib_root = os.path.join(apk_dir, "lib")
                    if os.path.isdir(lib_root):
                        for arch in os.listdir(lib_root):
                            dest = os.path.join(lib_root, arch, f)
                            os.makedirs(os.path.dirname(dest), exist_ok=True)
                            shutil.copy2(os.path.join(root, f), dest)
                            info(f"Injected {f} → lib/{arch}/")

        # ── copy original signature into assets/ ─────────────────────────
        if sig_files:
            assets = os.path.join(apk_dir, "assets")
            os.makedirs(assets, exist_ok=True)
            for name, data in sig_files.items():
                with open(os.path.join(assets, name), "wb") as fh:
                    fh.write(data)
            info("Original signatures copied to assets/")

        # ── modify AndroidManifest.xml ───────────────────────────────────
        manifest = os.path.join(apk_dir, "AndroidManifest.xml")
        if os.path.isfile(manifest):
            modify_manifest(
                manifest, app_name="will.gacor69", extract_native_libs=True
            )

        # ── repack & sign ────────────────────────────────────────────────
        output = os.path.splitext(apk_file)[0] + "_sigkill_v1.apk"
        repack_apk(apk_dir, os.path.abspath(output))
        sign_apk_default(os.path.abspath(output))
        success(f"Output: {output}")

    except Exception as exc:
        error(f"Signature Killer v1 failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ───────────────────── Feature 2: Signature Killer v2 ────────────────────────


def sig_killer_v2():
    """Signature Killer v2 — SRPatch Method (will2/will3_core.zip)."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ SIGNATURE KILLER v2 (SRPatch) ═══{RESET}\n")

    print(f"  {YELLOW}[1]{RESET} will2_core.zip")
    print(f"  {YELLOW}[2]{RESET} will3_core.zip")
    try:
        c = int(input(f"\n  {BOLD}Select core: {RESET}"))
    except (ValueError, EOFError):
        return
    core_name = "will2_core.zip" if c == 1 else "will3_core.zip"
    core_zip = os.path.join(SCRIPT_DIR, core_name)
    if not os.path.isfile(core_zip):
        error(f"{core_name} not found in {SCRIPT_DIR}")
        pause()
        return

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    work = make_work_dir("sigkill_v2")
    apk_dir = os.path.join(work, "apk")
    core_dir = os.path.join(work, "core")

    try:
        if not extract_core_zip(core_zip, core_dir):
            pause()
            return

        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        # ── locate core DEX files ────────────────────────────────────────
        core_dex = srpatch_dex = None
        for root, _dirs, files in os.walk(core_dir):
            for f in files:
                full = os.path.join(root, f)
                if f == "core.dex":
                    core_dex = full
                elif f == "srpatch.dex":
                    srpatch_dex = full

        shift = 1 + (1 if srpatch_dex else 0)
        info("Shifting DEX files ...")
        shift_dex_files(apk_dir, shift_by=shift)

        if core_dex:
            shutil.copy2(core_dex, os.path.join(apk_dir, "classes.dex"))
            info("Injected core.dex → classes.dex")

        if srpatch_dex:
            shutil.copy2(srpatch_dex, os.path.join(apk_dir, "classes2.dex"))
            info("Injected srpatch.dex → classes2.dex")

        # ── inject native libraries ──────────────────────────────────────
        for root, _dirs, files in os.walk(core_dir):
            for f in files:
                if not f.endswith(".so"):
                    continue
                rel = os.path.relpath(os.path.join(root, f), core_dir)
                for arch in ("arm64-v8a", "armeabi-v7a", "x86", "x86_64"):
                    if arch in rel:
                        dest = os.path.join(apk_dir, "lib", arch, f)
                        os.makedirs(os.path.dirname(dest), exist_ok=True)
                        shutil.copy2(os.path.join(root, f), dest)
                        info(f"Injected {f} → lib/{arch}/")
                        break

        # ── manifest ─────────────────────────────────────────────────────
        manifest = os.path.join(apk_dir, "AndroidManifest.xml")
        if os.path.isfile(manifest):
            modify_manifest(
                manifest, app_name="com.srp.patch.Init",
                extract_native_libs=True,
            )

        # ── repack & sign ────────────────────────────────────────────────
        output = os.path.splitext(apk_file)[0] + "_sigkill_v2.apk"
        repack_apk(apk_dir, os.path.abspath(output))
        sign_apk_default(os.path.abspath(output))
        success(f"Output: {output}")

    except Exception as exc:
        error(f"Signature Killer v2 failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ──────────────────────── Feature 3: Auto Sign APK ──────────────────────────


def auto_sign():
    """Sign APK with default test keys or a custom-generated keystore."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ AUTO SIGN APK ═══{RESET}\n")
    print(f"  {YELLOW}[1]{RESET} Default Sign (testkey)")
    print(f"  {YELLOW}[2]{RESET} Custom Signature")
    print(f"  {YELLOW}[3]{RESET} Full Info Certificate")
    print(f"  {YELLOW}[0]{RESET} Kembali")

    try:
        choice = int(input(f"\n  {BOLD}Select: {RESET}"))
    except (ValueError, EOFError):
        return

    if choice == 0:
        return

    # ── default sign ─────────────────────────────────────────────────────
    if choice == 1:
        apk_file = resolve_apk(select_apk())
        if apk_file:
            sign_apk_default(apk_file)
            success(f"Signed: {apk_file}")
        pause()

    # ── custom signature ─────────────────────────────────────────────────
    elif choice == 2:
        apk_file = resolve_apk(select_apk())
        if not apk_file:
            return

        print(f"\n  {BOLD}{CYAN}Custom Certificate Info:{RESET}")
        d = CERT_DEFAULTS
        cn = input(f"  CN  [{CYAN}{d['CN']}{RESET}]: ").strip() or d["CN"]
        ou = input(f"  OU  [{CYAN}{d['OU']}{RESET}]: ").strip() or d["OU"]
        o = input(f"  O   [{CYAN}{d['O']}{RESET}]: ").strip() or d["O"]
        loc = input(f"  L   [{CYAN}{d['L']}{RESET}]: ").strip() or d["L"]
        st = input(f"  ST  [{CYAN}{d['ST']}{RESET}]: ").strip() or d["ST"]
        c = input(f"  C   [{CYAN}{d['C']}{RESET}]: ").strip() or d["C"]
        email = (
            input(f"  Email [{CYAN}{d['EMAIL']}{RESET}]: ").strip() or d["EMAIL"]
        )

        ks_path = os.path.join(os.getcwd(), "custom.keystore")
        dname = (
            f"CN={cn}, OU={ou}, O={o}, L={loc}, ST={st}, C={c}, "
            f"EMAILADDRESS={email}"
        )

        if os.path.isfile(ks_path):
            os.remove(ks_path)

        info("Generating custom keystore ...")
        result = subprocess.run(
            [
                "keytool", "-genkey", "-v",
                "-keystore", ks_path,
                "-alias", "will",
                "-keyalg", "RSA",
                "-keysize", "2048",
                "-validity", "10000",
                "-storepass", "android",
                "-keypass", "android",
                "-dname", dname,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            error(f"keytool failed: {result.stderr.strip()}")
            pause()
            return
        success("Custom keystore generated.")

        signer = tool_path("apksigner.jar")
        if not signer:
            pause()
            return

        info("Signing with custom keystore ...")
        result = subprocess.run(
            [
                "java", "-jar", signer, "sign",
                "--ks", ks_path,
                "--ks-key-alias", "will",
                "--ks-pass", "pass:android",
                "--key-pass", "pass:android",
                "--v1-signing-enabled", "true",
                "--v2-signing-enabled", "true",
                "--v3-signing-enabled", "true",
                "--v4-signing-enabled", "false",
                apk_file,
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            success(f"Signed with custom cert: {apk_file}")
        else:
            error(f"Signing failed: {result.stderr.strip()}")
        pause()

    # ── full certificate info ────────────────────────────────────────────
    elif choice == 3:
        apk_file = resolve_apk(select_apk())
        if not apk_file:
            return
        work = make_work_dir("cert_info")
        try:
            extract_apk(apk_file, work)
            meta_dir = os.path.join(work, "META-INF")
            found_cert = False
            if os.path.isdir(meta_dir):
                for fname in os.listdir(meta_dir):
                    if fname.upper().endswith((".RSA", ".DSA", ".EC")):
                        cert = os.path.join(meta_dir, fname)
                        print(f"\n  {BOLD}{CYAN}Certificate: {fname}{RESET}\n")
                        subprocess.run(
                            ["keytool", "-printcert", "-file", cert],
                            check=False,
                        )
                        found_cert = True
                        break
            if not found_cert:
                warn("No certificate found in META-INF/")
        finally:
            shutil.rmtree(work, ignore_errors=True)
        pause()


# ──────────────────── Feature 4: Bypass SSL Flutter ──────────────────────────


def bypass_ssl_flutter():
    """Patch libflutter.so to bypass SSL certificate verification."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ BYPASS SSL FLUTTER ═══{RESET}\n")

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    work = make_work_dir("ssl_bypass")
    apk_dir = os.path.join(work, "apk")

    try:
        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        # ── find libflutter.so for each arch ─────────────────────────────
        flutter_libs = []
        lib_dir = os.path.join(apk_dir, "lib")
        if os.path.isdir(lib_dir):
            for arch in sorted(os.listdir(lib_dir)):
                so = os.path.join(lib_dir, arch, "libflutter.so")
                if os.path.isfile(so):
                    flutter_libs.append((arch, so))

        if not flutter_libs:
            error("No libflutter.so found in APK. Not a Flutter app?")
            pause()
            return

        print(f"\n  {BOLD}Found libflutter.so:{RESET}")
        for i, (arch, path) in enumerate(flutter_libs, 1):
            sz = os.path.getsize(path) / (1024 * 1024)
            print(f"  {YELLOW}[{i}]{RESET} {arch} ({sz:.1f} MB)")
        print(f"  {YELLOW}[0]{RESET} Patch ALL")

        try:
            sel = int(input(f"\n  {BOLD}Select arch: {RESET}"))
        except (ValueError, EOFError):
            return

        if sel == 0:
            targets = flutter_libs
        elif 1 <= sel <= len(flutter_libs):
            targets = [flutter_libs[sel - 1]]
        else:
            error("Invalid selection.")
            return

        for arch, so_path in targets:
            info(f"Patching libflutter.so ({arch}) ...")

            is_arm64 = "arm64" in arch or "aarch64" in arch

            # ARM64: mov x0, #0 ; ret
            patch_arm64 = bytes.fromhex("000080d2c0035fd6")
            # ARM32: mov r0, #0 ; bx lr
            patch_arm32 = bytes.fromhex("0000a0e31eff2fe1")

            try:
                # Step 1 — run r2 analysis and search for SSL functions
                r2_search = "aaa; afl~ssl_crypto"
                result = subprocess.run(
                    ["r2", "-q", "-c", r2_search, so_path],
                    capture_output=True, text=True, timeout=180,
                )

                verify_addrs = []
                for line in result.stdout.splitlines():
                    low = line.lower()
                    if any(k in low for k in ("ssl", "verify", "x509")):
                        m = re.search(r"(0x[0-9a-fA-F]+)", line)
                        if m:
                            verify_addrs.append(m.group(1))

                if not verify_addrs:
                    # Fallback: search for string reference
                    info("Function list empty — trying string-ref search ...")
                    r2_str = 'aaa; / ssl_crypto_x509_session_verify_cert_chain'
                    result = subprocess.run(
                        ["r2", "-q", "-c", r2_str, so_path],
                        capture_output=True, text=True, timeout=180,
                    )
                    for line in result.stdout.splitlines():
                        m = re.search(r"(0x[0-9a-fA-F]+)", line)
                        if m:
                            verify_addrs.append(m.group(1))

                if verify_addrs:
                    for addr in verify_addrs[:5]:
                        info(f"SSL Patched (ret0): {addr}")
                        subprocess.run(
                            ["r2", "-q", "-w", "-c",
                             f"s {addr}; wao ret0", so_path],
                            capture_output=True, text=True, timeout=30,
                        )
                    success(f"libflutter.so patched ({arch})")
                else:
                    # Last resort — raw binary pattern patch
                    warn("R2 search returned no hits. Attempting raw patch ...")
                    with open(so_path, "rb") as fh:
                        data = bytearray(fh.read())

                    needle = b"ssl_crypto_x509_session_verify_cert_chain"
                    idx = data.find(needle)
                    if idx >= 0:
                        info(f"SSL string found at 0x{idx:X} — patching via r2 xref")
                        subprocess.run(
                            ["r2", "-q", "-w", "-c",
                             f"aaa; axt @ 0x{idx:x}; wao ret0", so_path],
                            capture_output=True, text=True, timeout=180,
                        )
                        success(f"Patched via string xref ({arch})")
                    else:
                        warn(
                            f"SSL pattern not found in {arch}. "
                            "Manual patching may be required."
                        )

            except FileNotFoundError:
                error("radare2 (r2) not found.  Install: pkg install radare2")
                pause()
                return
            except subprocess.TimeoutExpired:
                warn(f"r2 analysis timed out for {arch}.")

        # ── repack & sign ────────────────────────────────────────────────
        output = os.path.splitext(apk_file)[0] + "_ssl_bypass.apk"
        repack_apk(apk_dir, os.path.abspath(output))
        sign_apk_default(os.path.abspath(output))
        success(f"Output: {output}")

    except Exception as exc:
        error(f"SSL bypass failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ─────────────────────── Feature 5: DPT Unpack ──────────────────────────────


def dpt_unpack():
    """Unpack DPT-protected APK payloads from assets/."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ DPT UNPACK ═══{RESET}\n")

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    work = make_work_dir("dpt_unpack")
    apk_dir = os.path.join(work, "apk")

    try:
        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        assets = os.path.join(apk_dir, "assets")
        payload_path = None

        if os.path.isdir(assets):
            # Search for valid APK / DEX payloads
            for pattern in ("*.apk", "*.dex", "*.bin", "*.dat", "*.jar"):
                for fp in globmod.glob(os.path.join(assets, pattern)):
                    with open(fp, "rb") as fh:
                        hdr = fh.read(4)
                    if hdr[:3] == b"PK\x03" or hdr[:4] == b"dex\n":
                        payload_path = fp
                        info(f"DPT payload found: {os.path.basename(fp)}")
                        break
                if payload_path:
                    break

            # Heuristic — look for large unrecognised files
            if not payload_path:
                for fname in sorted(os.listdir(assets)):
                    fp = os.path.join(assets, fname)
                    if os.path.isfile(fp) and os.path.getsize(fp) > 100_000:
                        info(
                            f"Possible encrypted payload: {fname} "
                            f"({os.path.getsize(fp)} bytes)"
                        )
                        payload_path = fp
                        break

        if not payload_path:
            error("Pattern DPT zonk! Asset payload tidak ditemukan.")
            pause()
            return

        base = os.path.splitext(apk_file)[0]
        unpacked = base + "_unpacked.apk"

        with open(payload_path, "rb") as fh:
            hdr = fh.read(4)

        if hdr[:3] == b"PK\x03":
            shutil.copy2(payload_path, unpacked)
            success(f"Unpacked APK: {unpacked}")
        elif hdr[:4] == b"dex\n":
            info("Payload is a raw DEX — repacking as APK ...")
            repack_dir = os.path.join(work, "repack")
            shutil.copytree(apk_dir, repack_dir)
            shutil.copy2(payload_path, os.path.join(repack_dir, "classes.dex"))
            repack_apk(repack_dir, os.path.abspath(unpacked))
        else:
            shutil.copy2(payload_path, unpacked)
            warn(f"Payload extracted (unknown format): {unpacked}")

        repack_out = base + "_dpt_repack.apk"
        if os.path.isfile(unpacked):
            shutil.copy2(unpacked, repack_out)
            sign_apk_default(repack_out)
            success(f"Repacked & signed: {repack_out}")

    except Exception as exc:
        error(f"DPT Unpack failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ──────────────────── Feature 6: Smali Patcher ──────────────────────────────

# fmt: off
SMALI_PATTERNS = {
    "ad_methods": {
        "desc": "Ad method body removal",
        "pattern": re.compile(
            r"(\.method\s+(?:public|private|protected)\s+"
            r"(?:static\s+)?(?!abstract|native)"
            r"[^\n]*?(?:loadAd|renderAd|showAd|displayAd|"
            r"Ad(?:Clicked|Dismissed|Shown|Loaded|Failed|Opened|Closed|"
            r"Impression|Request))"
            r"\([^\)]*\)V\s*\n"
            r"\s+\.registers\s+\d+)"
            r"([\s\S]*?)"
            r"(\.end method)",
            re.MULTILINE,
        ),
        "replace": r"\1\n    return-void\n\3",
    },
    "ad_invocations": {
        "desc": "Ad invocation removal",
        "pattern": re.compile(
            r"^\s*invoke-(?:virtual|static|direct|interface)\s+\{[^}]*\},\s+"
            r"L[^;]*;->(?:loadAd|requestNativeAd|showInterstitial|"
            r"showBannerAd|loadBannerAd|loadInterstitialAd|"
            r"loadRewardedAd|showRewardedAd|loadNativeAd|showNativeAd|"
            r"requestAd|fetchAd|displayBannerAd|initializeAds|"
            r"loadAdBanner|loadAdInterstitial|onAdLoaded|onAdClicked|"
            r"onAdImpression|loadRewardedInterstitialAd|"
            r"showRewardedInterstitialAd)\(.*",
            re.MULTILINE,
        ),
        "replace": "# [PATCHED] ad call removed",
    },
    "screenshot_protection": {
        "desc": "Screenshot/FLAG_SECURE removal",
        "pattern": re.compile(
            r"(const/)16(\s+([pv]\d+),\s+0x)200"
            r"(0(?:(?!\.end\smethod)[\s\S])*?"
            r"invoke-virtual\s+\{[pv]\d+,\s+\3(?:,\s+[pv]\d+)?\},\s+"
            r"Landroid/view/Window;->(?:add|set)Flags\(II?\)V)",
            re.MULTILINE,
        ),
        "replace": r"\g<1>16\g<2>0\g<4>",
    },
    "surface_secure": {
        "desc": "SurfaceView.setSecure removal",
        "pattern": re.compile(
            r"(?:const/4\s+([pv]\d+),\s+0x0\n\n\s*)?"
            r"(invoke-virtual\s+\{(?:[pv]\d{1,2}),\s+"
            r"(\1|(?:[pv]\d+))\},\s+"
            r"Landroid/view/SurfaceView;->setSecure\(Z\)V)",
            re.MULTILINE,
        ),
        "replace": "# [PATCHED] setSecure removed",
    },
    "installer_spoof": {
        "desc": "Installer source → com.android.vending",
        "pattern": re.compile(
            r"(invoke-virtual\s+\{[pv]\d+(?:,\s+[pv]\d+)?\},\s+"
            r"Landroid/content/pm/"
            r"(?:InstallSourceInfo|PackageManager);->"
            r"getInstall(?:er|ing)PackageName"
            r"\((?:Ljava/lang/String;)?\)"
            r"Ljava/lang/String;\n"
            r"(?:\s*(?:[.#][^\n]*)?\n)*"
            r"\s*move-result-object\s+([pv]\d+))"
            r'(?:\n\n\s*const-string\s+\2,\s+".*")?',
            re.MULTILINE,
        ),
        "replace": r'\1\n\n    const-string \2, "com.android.vending"',
    },
    "vpn_bypass": {
        "desc": "VPN / hasTransport bypass",
        "pattern": re.compile(
            r"(const/4\s+([pv]\d+),\s+0x4"
            r"(?:(?!\.end\smethod)[\s\S])*?"
            r"invoke-virtual\s+\{[pv]\d+,\s+\2\},\s+"
            r"Landroid/net/NetworkCapabilities;->hasTransport\(I\)Z\n"
            r"(?:\s*(?:[.#][^\n]*)?\n)*"
            r"\s{4}move-result\s+([pv]\d+))"
            r"(?:\n\n\s*const/4\s+\3,\s+0x0)?",
            re.MULTILINE,
        ),
        "replace": r"\1\n\n    const/4 \3, 0x0",
    },
    "final_class": {
        "desc": "Remove 'final' modifier from classes",
        "pattern": re.compile(r"^(\.class.*?) final ", re.MULTILINE),
        "replace": r"\1 ",
    },
}
# fmt: on


def smali_patcher():
    """Decompile DEX → patch smali → reassemble → repack & sign."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ SMALI PATCHER (STABLE) ═══{RESET}\n")

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    # Quick APK info via aapt
    info("Dumping APK info via aapt ...")
    subprocess.run(
        ["aapt", "dump", "badging", apk_file],
        capture_output=False, timeout=15,
    )

    work = make_work_dir("smali_patch")
    apk_dir = os.path.join(work, "apk")
    smali_root = os.path.join(work, "smali_out")

    try:
        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        dex_files = sorted(
            f for f in os.listdir(apk_dir) if re.match(r"classes\d*\.dex$", f)
        )
        if not dex_files:
            error("No DEX files found.")
            pause()
            return

        info(f"Found {len(dex_files)} DEX file(s)")

        # ── decompile each DEX ───────────────────────────────────────────
        processed = []
        for dex_name in dex_files:
            dex_path = os.path.join(apk_dir, dex_name)
            out = os.path.join(smali_root, dex_name.replace(".dex", ""))
            os.makedirs(out, exist_ok=True)
            info(f"Decompiling {dex_name} ...")

            ok = False
            for cmd in (
                ["baksmali", "d", dex_path, "-o", out],
                ["java", "-jar", "baksmali.jar", "d", dex_path, "-o", out],
            ):
                r = subprocess.run(cmd, capture_output=True, text=True)
                if r.returncode == 0:
                    ok = True
                    break

            if ok:
                processed.append((dex_name, out))
            else:
                warn(f"Could not decompile {dex_name} (baksmali missing?)")

        if not processed:
            error("No DEX files could be decompiled.")
            pause()
            return

        # ── apply smali patches ──────────────────────────────────────────
        total_patches = 0
        for dex_name, sdir in processed:
            info(f"Patching smali from {dex_name} ...")
            for root, _dirs, files in os.walk(sdir):
                for fname in files:
                    if not fname.endswith(".smali"):
                        continue
                    fpath = os.path.join(root, fname)
                    with open(fpath, "r", encoding="utf-8", errors="replace") as fh:
                        content = fh.read()
                    original = content
                    for _pname, pdata in SMALI_PATTERNS.items():
                        content, cnt = pdata["pattern"].subn(
                            pdata["replace"], content
                        )
                        total_patches += cnt
                    if content != original:
                        with open(fpath, "w", encoding="utf-8") as fh:
                            fh.write(content)

        success(f"Applied {total_patches} patch(es) across all smali files")

        # ── reassemble DEX ───────────────────────────────────────────────
        for dex_name, sdir in processed:
            dex_path = os.path.join(apk_dir, dex_name)
            info(f"Reassembling {dex_name} ...")
            ok = False
            for cmd in (
                ["smali", "a", sdir, "-o", dex_path],
                ["java", "-jar", "smali.jar", "a", sdir, "-o", dex_path],
            ):
                r = subprocess.run(cmd, capture_output=True, text=True)
                if r.returncode == 0:
                    ok = True
                    break
            if not ok:
                error(f"Failed to reassemble {dex_name}")

        # ── repack & sign ────────────────────────────────────────────────
        output = os.path.splitext(apk_file)[0] + "_patched.apk"
        repack_apk(apk_dir, os.path.abspath(output))
        sign_apk_default(os.path.abspath(output))
        success(f"Output: {output}")

    except Exception as exc:
        error(f"Smali Patcher failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ─────────────────── Feature 7: Universal .so Patcher ────────────────────────


def so_patcher():
    """Patch any native .so function to return 0 using radare2."""
    clear()
    print(f"\n  {BOLD}{MAGENTA}═══ UNIVERSAL .SO PATCHER ═══{RESET}\n")

    apk_file = resolve_apk(select_apk())
    if not apk_file:
        return

    work = make_work_dir("so_patch")
    apk_dir = os.path.join(work, "apk")

    try:
        os.makedirs(apk_dir, exist_ok=True)
        extract_apk(apk_file, apk_dir)

        # ── enumerate .so files ──────────────────────────────────────────
        so_files = []
        lib_dir = os.path.join(apk_dir, "lib")
        if os.path.isdir(lib_dir):
            for root, _dirs, files in os.walk(lib_dir):
                for f in files:
                    if f.endswith(".so"):
                        rel = os.path.relpath(os.path.join(root, f), apk_dir)
                        so_files.append((rel, os.path.join(root, f)))

        if not so_files:
            error("No .so files found in APK.")
            pause()
            return

        print(f"\n  {BOLD}Native libraries:{RESET}")
        for i, (rel, path) in enumerate(so_files, 1):
            sz = os.path.getsize(path) / 1024
            print(f"  {YELLOW}[{i}]{RESET} {rel} ({sz:.0f} KB)")

        try:
            sel = int(input(f"\n  {BOLD}Select .so file: {RESET}"))
            if not 1 <= sel <= len(so_files):
                return
        except (ValueError, EOFError):
            return

        _target_rel, target_path = so_files[sel - 1]
        keyword = input(
            f"\n  {BOLD}Enter keyword to search (e.g. isPremium): {RESET}"
        ).strip()
        if not keyword:
            return

        info("Dumping symbols via R2 CLI (Export Mode) ...")

        try:
            # Search exported symbols and function list
            result = subprocess.run(
                ["r2", "-q", "-c", "aaa; iE", target_path],
                capture_output=True, text=True, timeout=180,
            )

            matches = [
                ln.strip()
                for ln in result.stdout.splitlines()
                if keyword.lower() in ln.lower()
            ]

            if not matches:
                result = subprocess.run(
                    ["r2", "-q", "-c", "aaa; afl", target_path],
                    capture_output=True, text=True, timeout=180,
                )
                matches = [
                    ln.strip()
                    for ln in result.stdout.splitlines()
                    if keyword.lower() in ln.lower()
                ]

            if not matches:
                warn(f"No functions matching '{keyword}'.")
                pause()
                return

            print(f"\n  {BOLD}Matching functions:{RESET}")
            for i, m in enumerate(matches, 1):
                print(f"  {YELLOW}[{i}]{RESET} {m}")

            try:
                fn_sel = int(input(f"\n  {BOLD}Select function to patch: {RESET}"))
                if not 1 <= fn_sel <= len(matches):
                    return
            except (ValueError, EOFError):
                return

            addr_m = re.search(r"(0x[0-9a-fA-F]+)", matches[fn_sel - 1])
            if not addr_m:
                error("Could not extract function address.")
                pause()
                return

            addr = addr_m.group(1)
            info(f"Patching function at {addr} → return 0 ...")

            result = subprocess.run(
                ["r2", "-q", "-w", "-c", f"s {addr}; wao ret0", target_path],
                capture_output=True, text=True, timeout=30,
            )
            if result.returncode == 0:
                success(f"Function patched at {addr}")
            else:
                error(f"Patch failed: {result.stderr.strip()}")
                pause()
                return

        except FileNotFoundError:
            error("radare2 (r2) not found.  Install: pkg install radare2")
            pause()
            return
        except subprocess.TimeoutExpired:
            error("r2 analysis timed out.")
            pause()
            return

        # ── repack & sign ────────────────────────────────────────────────
        output = os.path.splitext(apk_file)[0] + "_so_patched.apk"
        repack_apk(apk_dir, os.path.abspath(output))
        sign_apk_default(os.path.abspath(output))
        success(f"Output: {output}")

    except Exception as exc:
        error(f".so Patcher failed: {exc}")
    finally:
        shutil.rmtree(work, ignore_errors=True)

    pause()


# ──────────────────────────── Main Menu ──────────────────────────────────────


def main():
    """Entry point — display main menu and dispatch features."""
    ensure_tool_dir()

    while True:
        clear()
        banner()
        print(f"  {BOLD}{WHITE}MENU UTAMA{RESET}\n")
        print(f"  {YELLOW}[1]{RESET} Signature Killer v1")
        print(f"  {YELLOW}[2]{RESET} Signature Killer v2 (SRPatch)")
        print(f"  {YELLOW}[3]{RESET} Auto Sign APK")
        print(f"  {YELLOW}[4]{RESET} Bypass SSL Flutter")
        print(f"  {YELLOW}[5]{RESET} DPT Unpack")
        print(f"  {YELLOW}[6]{RESET} Smali Patcher")
        print(f"  {YELLOW}[7]{RESET} Universal .SO Patcher")
        print(f"  {YELLOW}[0]{RESET} Exit\n")

        try:
            choice = input(f"  {BOLD}Select: {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        dispatch = {
            "1": sig_killer_v1,
            "2": sig_killer_v2,
            "3": auto_sign,
            "4": bypass_ssl_flutter,
            "5": dpt_unpack,
            "6": smali_patcher,
            "7": so_patcher,
        }

        if choice == "0":
            print(f"\n  {CYAN}Goodbye!{RESET}\n")
            sys.exit(0)
        elif choice in dispatch:
            dispatch[choice]()
        else:
            warn("Invalid option.")
            pause()


if __name__ == "__main__":
    main()
