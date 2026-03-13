#!/data/data/com.termux/files/usr/bin/bash
# AIO-Mod Toolkit v2.0 — Dependency Installer for Termux
set -e

echo "[INFO] Updating packages..."
pkg update -y && pkg upgrade -y

echo "[INFO] Installing required packages..."
pkg install -y \
    wget \
    openjdk-21 \
    radare2 \
    android-tools \
    aapt \
    zip \
    unzip \
    curl \
    python3

echo "[INFO] Installing Python dependencies..."
pip3 install requests

clear
echo "=========================================="
echo "  Dependencies installed successfully!"
echo "=========================================="
echo ""
echo "  Run the toolkit with:"
echo "    python3 aio-mod.py"
echo ""
