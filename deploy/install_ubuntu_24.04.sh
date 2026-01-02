#!/usr/bin/env bash
set -euo pipefail

# Created: 2026-01-02
# Author: @marcinmajsc
# Repository: https://github.com/marcinmajsc/streamdelay-gui

# Streamdelay-GUI
# Target: Ubuntu 24.04 LTS

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Please run as root (use sudo)" >&2
  exit 1
fi

# Ensure the script is in the extracted package's "deploy" directory
INSTALL_DIR="$(dirname "$(realpath "$0")")"
PACKAGE_ROOT="$(realpath "$INSTALL_DIR/..")"

# Variables (can be overridden via env before running the script)
STREAMGUI_DIR="/opt/streamgui"
STREAMDELAY_DIR="/opt/streamdelay"
PY_VENV_DIR="$STREAMGUI_DIR/.venv"
STATE_DIR="/var/lib/streamgui"
STREAMDELAY_ETC="/etc/streamdelay"

# 1. Update APT and install dependencies
apt update -y
apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
apt install -y \
    python3 \
    python3-venv \
    python3-pip \
    nginx \
    curl \
    git \
    sudo \
    nodejs \
    libgstreamer1.0-dev \
    libgstreamer-plugins-base1.0-dev \
    libgstreamer-plugins-bad1.0-dev \
    gstreamer1.0-plugins-base \
    gstreamer1.0-plugins-good \
    gstreamer1.0-plugins-bad \
    gstreamer1.0-plugins-ugly \
    gstreamer1.0-libav \
    gstreamer1.0-tools \
    gstreamer1.0-x \
    gstreamer1.0-alsa \
    gstreamer1.0-gl \
    gstreamer1.0-gtk3 \
    gstreamer1.0-qt5 \
    gstreamer1.0-pulseaudio \
    cmake \
    build-essential \
    pkg-config \
    ca-certificates
    

# 2. Install Python virtualenv and dependencies for GUI
mkdir -p "$STREAMGUI_DIR"
python3 -m venv "$PY_VENV_DIR"
"$PY_VENV_DIR/bin/pip" install --upgrade pip
"$PY_VENV_DIR/bin/pip" install flask gunicorn requests

# 3. Allowing streamgui (www-data) to restart streamdelay.service via sudo (NOPASSWD)
cat > /etc/sudoers.d/streamgui-streamdelay-restart <<'SUDOERS'
# Allow the Streamdelay-GUI service (www-data) to restart ONLY streamdelay.service without a password.
www-data ALL=(root) NOPASSWD: /bin/systemctl restart streamdelay.service
SUDOERS
chmod 0440 /etc/sudoers.d/streamgui-streamdelay-restart

# 4. Create system user/group for streamdelay (if not present)
if ! id -u streamops &>/dev/null; then
  useradd -r -M -d "$STREAMDELAY_DIR" -s /usr/sbin/nologin streamops
  usermod -aG streamops www-data
fi

# 5. Copy Streamdelay Node project into /opt/streamdelay
# Ensure streamdelay files exist in the package (submodule may be missing)
if [[ ! -d "$PACKAGE_ROOT/streamdelay" ]] || ! compgen -G "$PACKAGE_ROOT/streamdelay/*" > /dev/null; then
  echo "ERROR: '$PACKAGE_ROOT/streamdelay' is missing or empty. Running git submodule update..." >&2
  if ! (cd "$PACKAGE_ROOT" && git submodule update --init --recursive); then
    echo "ERROR: git submodule update failed in '$PACKAGE_ROOT'." >&2
    exit 1
  fi
  if [[ ! -d "$PACKAGE_ROOT/streamdelay" ]] || ! compgen -G "$PACKAGE_ROOT/streamdelay/*" > /dev/null; then
    echo "ERROR: '$PACKAGE_ROOT/streamdelay' is still missing or empty after initializing submodules." >&2
    exit 1
  fi
fi

rm -rf "$STREAMDELAY_DIR"
mkdir -p "$STREAMDELAY_DIR"
cp -r "$PACKAGE_ROOT/streamdelay/"* "$STREAMDELAY_DIR"
chown -R streamops:streamops "$STREAMDELAY_DIR"

cp -r "$PACKAGE_ROOT/streamgui/"* "$STREAMGUI_DIR"
chown -R www-data:www-data "$STREAMGUI_DIR"

# 6. Install Node dependencies (production only)
cd "$STREAMDELAY_DIR"
sudo -u streamops npm ci --include=dev
sudo -u streamops npm install --production
sudo -u streamops npm install tsx

# 7. Prepare /etc/streamdelay configuration
mkdir -p "$STREAMDELAY_ETC"
# Default overlay (placeholder) is provided in the package
cp "$PACKAGE_ROOT/deploy/streamdelay/overlay.png" "$STREAMDELAY_ETC/overlay.png"
# Write out_uri.txt if not present (empty means disabled until user sets key)
touch "$STREAMDELAY_ETC/out_uri.txt"
chown streamops:streamops "$STREAMDELAY_ETC/out_uri.txt"
chmod 0664 "$STREAMDELAY_ETC/out_uri.txt"

# If package contains streamdelay.env, copy it
if [[ -f "$PACKAGE_ROOT/streamdelay/streamdelay.env" ]]; then
  cp "$PACKAGE_ROOT/streamdelay/streamdelay.env" "$STREAMDELAY_ETC/streamdelay.env"
fi

# 8. Prepare StreamGUI state directory
mkdir -p "$STATE_DIR"
chown www-data:www-data "$STATE_DIR"
chmod 0755 "$STATE_DIR"

# 9. Install systemd service files
install -m 0644 "$INSTALL_DIR/systemd/streamgui.service" /etc/systemd/system/streamgui.service
install -m 0644 "$INSTALL_DIR/systemd/streamdelay.service" /etc/systemd/system/streamdelay.service

# Reload systemd and enable services
systemctl daemon-reload
systemctl enable --now streamdelay.service
systemctl enable --now streamgui.service

# 10. Configure nginx as reverse proxy
install -m 0644 "$INSTALL_DIR/nginx/streamgui.conf" /etc/nginx/sites-available/streamgui
if [[ ! -L /etc/nginx/sites-enabled/streamgui ]]; then
  ln -s /etc/nginx/sites-available/streamgui /etc/nginx/sites-enabled/streamgui
fi
# Optionally remove default site if not needed
if [[ -L /etc/nginx/sites-enabled/default ]]; then
  read -r -p "Remove default nginx site /etc/nginx/sites-enabled/default? (Y/N): " _remove_default
  case "$_remove_default" in
      [Yy]*)
        echo "Removing default nginx site: /etc/nginx/sites-enabled/default"
        rm -f /etc/nginx/sites-enabled/default
        ;;
      *)
        echo "Keeping default nginx site enabled."
        ;;
    esac
fi
nginx -t
systemctl restart nginx

echo "Installation complete."
echo "Flask GUI should be available via Nginx on port 80 (and 443 if you manualy configure TLS)."
echo "Streamdelay runs as streamops on port 7070."
