#!/usr/bin/env bash
# ==============================================================================
# SafeScout MINE-ENERGY - Automated Installation Script for Raspberry Pi 5
# OS Target: Raspberry Pi OS (Debian 12 Bookworm, 64-bit)
# ==============================================================================

set -e

echo "=========================================================="
echo " Starting SafeScout MINE-ENERGY Installation on Pi 5"
echo "=========================================================="

# 1. Update APT Packages
echo "[1/6] Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y python3-pip python3-venv python3-opencv \
    i2c-tools git nginx curl libgl1-mesa-glx

# 2. Add Pi User to Hardware Permission Groups
echo "[2/6] Configuring hardware dialout and i2c permissions..."
sudo usermod -aG dialout,i2c,gpio pi || true

# 3. Enable Hardware Interfaces (I2C, UART)
echo "[3/6] Enabling hardware I2C & Serial interfaces in config.txt..."
sudo raspi-config nonint do_i2c 0
sudo raspi-config nonint do_serial_hw 0

# 4. Install Python Dependencies
echo "[4/6] Installing backend python requirements..."
pip3 install --break-system-packages -r backend/requirements.txt
pip3 install --break-system-packages pydantic-settings greenlet

# 5. Build Frontend Assets
echo "[5/6] Checking Node.js and building frontend production bundle..."
if command -v node >/dev/null 2>&1; then
    cd frontend
    npm install
    npm run build
    cd ..
else
    echo "Node.js not installed on Pi. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    cd frontend
    npm install
    npm run build
    cd ..
fi

# 6. Configure Systemd Service
echo "[6/6] Registering SafeScout systemd background service..."
sudo cp deployment/safescout-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable safescout-backend.service
sudo systemctl restart safescout-backend.service

echo "=========================================================="
echo " SafeScout MINE-ENERGY Installation Completed Successfully!"
echo " Web Dashboard is running at: http://localhost:8000"
echo " Service Status: sudo systemctl status safescout-backend"
echo "=========================================================="

