# Swizzin Seedbox Configurations

If you are running the Swizzin seedbox installer to host native apps like `qBittorrent`, `autobrr`, `Prowlarr`, and the `qui` control client, you can automate backing up and restoring their configs, systemd templates, Nginx server structures, and SSL certificates using the scripts below.

> [!IMPORTANT]
> **Execution Context:** Both the backup and restore scripts **must be executed as the `root` user** (or with `sudo`).
> *   **Privileges**: The script requires root access to stop and start system services (such as Nginx and client daemons), copy SSL certificates, and write systemd configuration units.
> *   **Ownership Handling**: Since the scripts are run as `root`, the restore script automatically runs a recursive `chown` at the end of the restore phase to transfer ownership of the restored `/home/kevin/.config`, `/home/kevin/.local/share`, `/home/kevin/.wireguard`, and `/home/kevin/.ssh` directories back to your Swizzin user (`kevin`), preventing permission blocks.

> [!WARNING]
> **Data vs. Configs:** These scripts **only** back up application configurations, databases, keys, and settings. They **do not** back up your actual downloaded torrent payload files or media libraries (typically stored in `/home/kevin/downloads/` or `/home/kevin/data/`), which are usually hundreds of gigabytes in size. Archiving directories of that size would crash your VPS by running out of disk space. Back up your media payload files separately or let the restored qBittorrent client re-download them.

---

## 1. Backup Script
This script gathers your active Swizzin configurations, Nginx structures, SSL keys, and local application states, and secures them into an encrypted archive `/root/swizzin_backup.tar.gz.enc` using **AES-256 symmetric encryption** (via `openssl`). 

It temporarily stops your torrent clients and indexers to prevent database corruption (SQLite database locks) before copying, and prompts you to define a secure decryption password at runtime.

Create the script on your VPS:
```bash
sudo nano /root/swizzin_backup.sh
```

Paste the following bash code:
```bash
#!/bin/bash
# Swizzin Config Backup Script
set -e

# Ensure openssl is installed for encryption
if ! command -v openssl &>/dev/null; then
    echo "[*] openssl not found. Installing..."
    sudo apt-get update && sudo apt-get install -y openssl
fi

USER_NAME="kevin"
BACKUP_DIR="/root/swizzin_backup"
ARCHIVE_PATH="/root/swizzin_backup.tar.gz"
ENCRYPTED_PATH="${ARCHIVE_PATH}.enc"

echo "=== Starting Swizzin App & Nginx Backup ==="

# 1. Clean previous runs
rm -rf "$BACKUP_DIR" "$ARCHIVE_PATH" "$ENCRYPTED_PATH"
mkdir -p "$BACKUP_DIR"

# 2. Get secure password (supports env, args, prompt, and default fallback)
DEFAULT_PASSWORD="DefaultSwizzinBackupPassword123!"
PASSWORD="${BACKUP_PASSWORD}"

while getopts "p:" opt; do
    case ${opt} in
        p ) PASSWORD=$OPTARG ;;
    esac
done

if [ -z "$PASSWORD" ]; then
    if [ -t 0 ]; then
        echo "To protect your API keys and credentials, please define an encryption password."
        read -s -p "Enter encryption password (Press Enter for default): " PASS_1
        echo
        if [ -z "$PASS_1" ]; then
            echo "[*] Using default embedded password."
            PASSWORD="$DEFAULT_PASSWORD"
        else
            read -s -p "Confirm encryption password: " PASS_2
            echo
            if [ "$PASS_1" == "$PASS_2" ]; then
                PASSWORD="$PASS_1"
            else
                echo "[!] Passwords do not match. Using default embedded password."
                PASSWORD="$DEFAULT_PASSWORD"
            fi
        fi
    else
        echo "[*] Non-interactive session. Using default embedded password."
        PASSWORD="$DEFAULT_PASSWORD"
    fi
fi

# 3. Stop application services temporarily to prevent database corruption (SQLite WAL/lockfiles)
echo "[*] Temporarily stopping services for safe DB copy..."
# Find any active WireGuard interfaces and stop them
for wg_conf in /etc/wireguard/*.conf; do
    if [ -f "$wg_conf" ]; then
        systemctl stop wg-quick@$(basename "$wg_conf" .conf) 2>/dev/null || true
    fi
done
systemctl stop qbittorrent@$USER_NAME autobrr@$USER_NAME prowlarr qui@$USER_NAME syncthing@$USER_NAME panel nginx 2>/dev/null || true

# 4. Backup User App Configs
echo "[*] Backing up application configurations for $USER_NAME..."
mkdir -p "$BACKUP_DIR/config"
for app in qBittorrent autobrr Prowlarr qui syncthing; do
    if [ -d "/home/$USER_NAME/.config/$app" ]; then
        echo "  -> Copying $app config..."
        cp -r "/home/$USER_NAME/.config/$app" "$BACKUP_DIR/config/"
    fi
done

# 4b. Backup qBittorrent Torrent & Resume state databases (BT_backup)
echo "[*] Backing up qBittorrent active state database..."
if [ -d "/home/$USER_NAME/.local/share/qBittorrent" ]; then
    mkdir -p "$BACKUP_DIR/local_share"
    cp -r "/home/$USER_NAME/.local/share/qBittorrent" "$BACKUP_DIR/local_share/"
fi

# 4c. Backup WireGuard user client configuration profiles
if [ -d "/home/$USER_NAME/.wireguard" ]; then
    echo "[*] Backing up user WireGuard profiles..."
    mkdir -p "$BACKUP_DIR/user_home"
    cp -r "/home/$USER_NAME/.wireguard" "$BACKUP_DIR/user_home/"
fi

# 4e. Backup user SSH keys (authorized_keys, keypairs)
if [ -d "/home/$USER_NAME/.ssh" ]; then
    echo "[*] Backing up user SSH keys..."
    mkdir -p "$BACKUP_DIR/user_home"
    cp -r "/home/$USER_NAME/.ssh" "$BACKUP_DIR/user_home/"
fi

# 4d. Backup WireGuard system-level configuration interface files
if [ -d "/etc/wireguard" ]; then
    echo "[*] Backing up system WireGuard configurations..."
    mkdir -p "$BACKUP_DIR/wireguard"
    cp -r /etc/wireguard "$BACKUP_DIR/"
fi

# 5. Restart application services immediately to minimize downtime
echo "[*] Restarting services..."
for wg_conf in /etc/wireguard/*.conf; do
    if [ -f "$wg_conf" ]; then
        systemctl start wg-quick@$(basename "$wg_conf" .conf) 2>/dev/null || true
    fi
done
systemctl start qbittorrent@$USER_NAME autobrr@$USER_NAME prowlarr qui@$USER_NAME syncthing@$USER_NAME panel nginx 2>/dev/null || true

# 6. Backup Nginx Configurations & SSL Certificates
echo "[*] Backing up Nginx configurations and SSL keys..."
mkdir -p "$BACKUP_DIR/nginx"
cp /etc/nginx/nginx.conf "$BACKUP_DIR/nginx/"
cp /etc/htpasswd "$BACKUP_DIR/nginx/htpasswd"
if [ -d "/etc/nginx/apps" ]; then
    cp -r /etc/nginx/apps "$BACKUP_DIR/nginx/"
fi
if [ -d "/etc/nginx/sites-enabled" ]; then
    cp -r /etc/nginx/sites-enabled "$BACKUP_DIR/nginx/"
fi
if [ -d "/etc/nginx/ssl" ]; then
    cp -r /etc/nginx/ssl "$BACKUP_DIR/nginx/"
fi
if [ -d "/etc/nginx/conf.d" ]; then
    cp -r /etc/nginx/conf.d "$BACKUP_DIR/nginx/"
fi
if [ -d "/etc/nginx/snippets" ]; then
    cp -r /etc/nginx/snippets "$BACKUP_DIR/nginx/"
fi

# 7. Backup Systemd Services
echo "[*] Backing up systemd service definition units..."
mkdir -p "$BACKUP_DIR/systemd"
for svc in qbittorrent@.service autobrr@.service prowlarr.service qui@.service syncthing@.service panel.service; do
    if [ -f "/etc/systemd/system/$svc" ]; then
        cp "/etc/systemd/system/$svc" "$BACKUP_DIR/systemd/"
    fi
done

# 8. Backup Swizzin Panel Config
echo "[*] Backing up Swizzin settings..."
if [ -f "/opt/swizzin/swizzin.cfg" ]; then
    mkdir -p "$BACKUP_DIR/swizzin"
    cp /opt/swizzin/swizzin.cfg "$BACKUP_DIR/swizzin/"
fi

# 8b. Backup acme.sh configurations & SSL certificate renewal setups
if [ -d "/root/.acme.sh" ]; then
    echo "[*] Backing up acme.sh configurations..."
    mkdir -p "$BACKUP_DIR/acme"
    cp -r /root/.acme.sh "$BACKUP_DIR/acme/"
fi

# 8c. Backup root crontab (e.g. acme.sh cron triggers)
echo "[*] Backing up root crontab..."
crontab -l > "$BACKUP_DIR/crontab_root" 2>/dev/null || true

# 9. Archive, Compress, and Encrypt using AES-256 via OpenSSL
echo "[*] Creating compressed tarball..."
tar -czf "$ARCHIVE_PATH" -C /root swizzin_backup

echo "[*] Encrypting archive with AES-256..."
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -pass pass:"$PASSWORD" -in "$ARCHIVE_PATH" -out "$ENCRYPTED_PATH"

# 10. Clean up temporary folders
rm -rf "$BACKUP_DIR" "$ARCHIVE_PATH"

echo "=== Backup Complete! ==="
echo "Encrypted archive saved at: $ENCRYPTED_PATH"
echo "Download this file to your local computer using:"
echo "scp -P 22003 root@your_vps_ip:$ENCRYPTED_PATH ./"
```

Make the script executable and run it:
```bash
sudo chmod +x /root/swizzin_backup.sh
sudo /root/swizzin_backup.sh
```

---

## 2. Offline Inspection (Optional)
If you have downloaded the encrypted backup to your local machine and want to decrypt and extract the files to inspect or verify their contents offline (runs on Linux, macOS, WSL, or Git Bash), run the following commands in the directory where your `.enc` file is stored:

::: code-group
```bash [Custom Password]
# 1. Decrypt using your custom password (will prompt for password)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in swizzin_backup.tar.gz.enc -out swizzin_backup.tar.gz

# 2. Extract the unencrypted tarball
tar -xzf swizzin_backup.tar.gz
```
```bash [Default Password]
# 1. Decrypt using the default fallback password
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"DefaultSwizzinBackupPassword123!" -in swizzin_backup.tar.gz.enc -out swizzin_backup.tar.gz

# 2. Extract the unencrypted tarball
tar -xzf swizzin_backup.tar.gz
```
:::

This will unpack the seedbox configurations into a local directory named `swizzin_backup/` for manual viewing.

---

## 2. Restore Script

The restore script does not install the application packages themselves; it only restores your configuration databases, active states, and custom settings. 

### Recommended Restoration Workflow:

1.  **Fresh OS Install**: Begin with a clean Debian 12 installation.
2.  **Restore Linux System Configs**: Run your System Restore script first (from the system configurations backup page) to recover SSH, firewall, sysctl, and udev rules.
3.  **Install Swizzin**: Run the Swizzin installer:
    ```bash
    bash <(curl -sL s5n.sh) && . ~/.bashrc
    ```
    *   **User Setup**: When prompted, create the admin user `kevin` (this matches the user path in the backup script).
    *   **Select Packages**: In the Swizzin wizard, select and install Nginx and all the applications you previously had (e.g., `qbittorrent`, `autobrr`, `prowlarr`, `qui`, `wireguard`). This registers the system accounts, security groups, and service scripts, starting them with default, blank configs.
4.  **Upload Backup File**: Upload `swizzin_backup.tar.gz.enc` to `/root/` on the new VPS.
5.  **Execute Swizzin Restore Script**: Create and run the restore script below. It will temporarily stop the default services, overwrite their blank configurations with your backed-up settings and databases, repair directory ownership back to `kevin`, and restart all services with your full state restored.

When run, it prompts for the decryption password, and then asks whether to restore **everything** automatically or enter **interactive mode** to toggle individual components one-by-one.

Create the restore script:
```bash
sudo nano /root/swizzin_restore.sh
```

Paste the following bash code:
```bash
#!/bin/bash
# Swizzin Config Restore Script
set -e

# Ensure openssl is installed for decryption
if ! command -v openssl &>/dev/null; then
    echo "[*] openssl not found. Installing..."
    sudo apt-get update && sudo apt-get install -y openssl
fi

USER_NAME="kevin"
BACKUP_DIR="/root/swizzin_backup"
ARCHIVE_PATH="/root/swizzin_backup.tar.gz"
ENCRYPTED_PATH="${ARCHIVE_PATH}.enc"

if [ ! -f "$ENCRYPTED_PATH" ]; then
    echo "[!] Error: Encrypted backup archive $ENCRYPTED_PATH not found. Upload it first."
    exit 1
fi

echo "=== Starting Swizzin App & Nginx Restore ==="

# 1. Get decryption password (supports env, args, prompt, and default fallback)
DEFAULT_PASSWORD="DefaultSwizzinBackupPassword123!"
PASSWORD="${BACKUP_PASSWORD}"

while getopts "p:" opt; do
    case ${opt} in
        p ) PASSWORD=$OPTARG ;;
    esac
done

if [ -z "$PASSWORD" ]; then
    if [ -t 0 ]; then
        read -s -p "Enter decryption password (Press Enter for default): " PASS_INPUT
        echo
        PASSWORD="${PASS_INPUT:-$DEFAULT_PASSWORD}"
    else
        echo "[*] Non-interactive session. Using default embedded password."
        PASSWORD="$DEFAULT_PASSWORD"
    fi
fi

# 2. Decrypt archive using AES-256
echo "[*] Decrypting archive..."
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"$PASSWORD" -in "$ENCRYPTED_PATH" -out "$ARCHIVE_PATH" 2>/dev/null; then
    echo "[!] Error: Decryption failed. Incorrect password."
    rm -f "$ARCHIVE_PATH"
    exit 1
fi

# 3. Extract backup
rm -rf "$BACKUP_DIR"
tar -xzf "$ARCHIVE_PATH" -C /root
rm -f "$ARCHIVE_PATH" # Clean unencrypted tarball

# 4. Stop running services before overwriting config directories
echo "[*] Stopping active services..."
for wg_conf in /etc/wireguard/*.conf; do
    if [ -f "$wg_conf" ]; then
        systemctl stop wg-quick@$(basename "$wg_conf" .conf) 2>/dev/null || true
    fi
done
systemctl stop nginx panel prowlarr qbittorrent@$USER_NAME autobrr@$USER_NAME qui@$USER_NAME syncthing@$USER_NAME 2>/dev/null || true

# 5. Interactive Restoration Check
echo
if [ -t 0 ]; then
    read -p "Restore ALL components automatically? [Y/n] (Press enter for Yes): " ALL_RESTORE
    ALL_RESTORE=${ALL_RESTORE:-Y}
else
    echo "[*] Non-interactive session. Restoring all components automatically."
    ALL_RESTORE="Y"
fi

restore_item() {
    local prompt="$1"
    if [[ "$ALL_RESTORE" =~ ^[Yy]$ ]]; then
        return 0
    fi
    read -p "$prompt [y/N]: " CHOICE
    if [[ "$CHOICE" =~ ^[Yy]$ ]]; then
        return 0
    fi
    return 1
}

# --- Module 1: qBittorrent Config & State ---
if restore_item "Restore qBittorrent Configuration & Torrent resume state?"; then
    echo "[*] Restoring qBittorrent config..."
    mkdir -p "/home/$USER_NAME/.config"
    if [ -d "$BACKUP_DIR/config/qBittorrent" ]; then
        rm -rf "/home/$USER_NAME/.config/qBittorrent"
        cp -r "$BACKUP_DIR/config/qBittorrent" "/home/$USER_NAME/.config/"
    fi
    if [ -d "$BACKUP_DIR/local_share/qBittorrent" ]; then
        echo "[*] Restoring qBittorrent active state database..."
        rm -rf "/home/$USER_NAME/.local/share/qBittorrent"
        mkdir -p "/home/$USER_NAME/.local/share"
        cp -r "$BACKUP_DIR/local_share/qBittorrent" "/home/$USER_NAME/.local/share/"
    fi
fi

# --- Module 2: autobrr Config ---
if restore_item "Restore autobrr Configuration & Filter Database?"; then
    echo "[*] Restoring autobrr config..."
    mkdir -p "/home/$USER_NAME/.config"
    if [ -d "$BACKUP_DIR/config/autobrr" ]; then
        rm -rf "/home/$USER_NAME/.config/autobrr"
        cp -r "$BACKUP_DIR/config/autobrr" "/home/$USER_NAME/.config/"
    fi
fi

# --- Module 3: Prowlarr Config ---
if restore_item "Restore Prowlarr Configuration & Database?"; then
    echo "[*] Restoring Prowlarr config..."
    mkdir -p "/home/$USER_NAME/.config"
    if [ -d "$BACKUP_DIR/config/Prowlarr" ]; then
        rm -rf "/home/$USER_NAME/.config/Prowlarr"
        cp -r "$BACKUP_DIR/config/Prowlarr" "/home/$USER_NAME/.config/"
    fi
fi

# --- Module 4: qui Config ---
if restore_item "Restore qui Configuration & Database?"; then
    echo "[*] Restoring qui config..."
    mkdir -p "/home/$USER_NAME/.config"
    if [ -d "$BACKUP_DIR/config/qui" ]; then
        rm -rf "/home/$USER_NAME/.config/qui"
        cp -r "$BACKUP_DIR/config/qui" "/home/$USER_NAME/.config/"
    fi
fi

# --- Module 5: Syncthing Config ---
if restore_item "Restore Syncthing Configuration?"; then
    echo "[*] Restoring Syncthing config..."
    mkdir -p "/home/$USER_NAME/.config"
    if [ -d "$BACKUP_DIR/config/syncthing" ]; then
        rm -rf "/home/$USER_NAME/.config/syncthing"
        cp -r "$BACKUP_DIR/config/syncthing" "/home/$USER_NAME/.config/"
    fi
fi

# --- Module 5b: User SSH Keys ---
if restore_item "Restore user SSH keys (authorized_keys, keypairs)?"; then
    echo "[*] Restoring user SSH keys..."
    if [ -d "$BACKUP_DIR/user_home/.ssh" ]; then
        rm -rf "/home/$USER_NAME/.ssh"
        mkdir -p "/home/$USER_NAME"
        cp -r "$BACKUP_DIR/user_home/.ssh" "/home/$USER_NAME/"
    fi
fi

# --- Ownership Repair for App Data ---
echo "[*] Aligning ownership permissions on restored user files..."
chown -R $USER_NAME:$USER_NAME "/home/$USER_NAME/.config" "/home/$USER_NAME/.local" "/home/$USER_NAME/.wireguard" "/home/$USER_NAME/.ssh" 2>/dev/null || true
chmod -R 755 "/home/$USER_NAME/.config" "/home/$USER_NAME/.local" 2>/dev/null || true
chmod -R 700 "/home/$USER_NAME/.wireguard" "/home/$USER_NAME/.ssh" 2>/dev/null || true

# --- Module 6: Nginx Configurations ---
if restore_item "Restore Nginx proxy servers, conf.d and snippets?"; then
    echo "[*] Restoring Nginx configurations..."
    cp "$BACKUP_DIR/nginx/nginx.conf" /etc/nginx/nginx.conf
    cp "$BACKUP_DIR/nginx/htpasswd" /etc/htpasswd
    if [ -d "$BACKUP_DIR/nginx/apps" ]; then
        cp -r "$BACKUP_DIR/nginx/apps"/. /etc/nginx/apps/
    fi
    if [ -d "$BACKUP_DIR/nginx/sites-enabled" ]; then
        cp -r "$BACKUP_DIR/nginx/sites-enabled"/. /etc/nginx/sites-enabled/
    fi
    if [ -d "$BACKUP_DIR/nginx/conf.d" ]; then
        cp -r "$BACKUP_DIR/nginx/conf.d"/. /etc/nginx/conf.d/
    fi
    if [ -d "$BACKUP_DIR/nginx/snippets" ]; then
        cp -r "$BACKUP_DIR/nginx/snippets"/. /etc/nginx/snippets/
    fi
fi

# --- Module 7: SSL Certificates ---
if restore_item "Restore SSL Certificates (/etc/nginx/ssl)?"; then
    echo "[*] Restoring SSL certificates..."
    if [ -d "$BACKUP_DIR/nginx/ssl" ]; then
        mkdir -p /etc/nginx/ssl
        cp -r "$BACKUP_DIR/nginx/ssl"/. /etc/nginx/ssl/
        chmod -R 600 /etc/nginx/ssl/*
    fi
fi

# --- Module 8: WireGuard VPN Configuration ---
if restore_item "Restore WireGuard VPN system profiles and client profiles?"; then
    echo "[*] Restoring WireGuard configurations..."
    if [ -d "$BACKUP_DIR/user_home/.wireguard" ]; then
        rm -rf "/home/$USER_NAME/.wireguard"
        cp -r "$BACKUP_DIR/user_home/.wireguard" "/home/$USER_NAME/"
        chown -R $USER_NAME:$USER_NAME "/home/$USER_NAME/.wireguard"
        chmod -R 700 "/home/$USER_NAME/.wireguard"
    fi
    if [ -d "$BACKUP_DIR/wireguard" ]; then
        mkdir -p /etc/wireguard
        cp -r "$BACKUP_DIR/wireguard"/. /etc/wireguard/
        chmod -R 700 /etc/wireguard
        chmod 600 /etc/wireguard/* 2>/dev/null || true
    fi
fi

# --- Module 9: Systemd unit templates ---
if restore_item "Restore systemd service unit definitions?"; then
    echo "[*] Restoring systemd unit files..."
    if [ -d "$BACKUP_DIR/systemd" ]; then
        cp -r "$BACKUP_DIR/systemd"/. /etc/systemd/system/
    fi
fi

# --- Module 10: Swizzin Panel Configuration ---
if restore_item "Restore Swizzin Dashboard settings (swizzin.cfg)?"; then
    echo "[*] Restoring Swizzin settings..."
    if [ -f "$BACKUP_DIR/swizzin/swizzin.cfg" ]; then
        mkdir -p /opt/swizzin
        cp "$BACKUP_DIR/swizzin/swizzin.cfg" /opt/swizzin/swizzin.cfg
    fi
fi

# --- Module 10b: acme.sh SSL renewal configuration ---
if restore_item "Restore acme.sh SSL certificate renewal setups?"; then
    echo "[*] Restoring acme.sh configurations..."
    if [ -d "$BACKUP_DIR/acme/.acme.sh" ]; then
        rm -rf /root/.acme.sh
        cp -r "$BACKUP_DIR/acme/.acme.sh" /root/
        chmod -R 700 /root/.acme.sh
    fi
fi

# --- Module 10c: root crontab ---
if restore_item "Restore root crontab (e.g. acme.sh cron triggers)?"; then
    if [ -f "$BACKUP_DIR/crontab_root" ]; then
        echo "[*] Restoring root crontab..."
        crontab "$BACKUP_DIR/crontab_root"
    fi
fi

# 6. Reload and Restart
echo "[*] Reloading systemd daemons and restarting services..."
systemctl daemon-reload

# Start and enable restored WireGuard interface services automatically
for wg_conf in /etc/wireguard/*.conf; do
    if [ -f "$wg_conf" ]; then
        interface=$(basename "$wg_conf" .conf)
        echo "  -> Enabling & starting WireGuard interface $interface..."
        systemctl enable wg-quick@$interface 2>/dev/null || true
        systemctl start wg-quick@$interface 2>/dev/null || true
    fi
done

systemctl enable nginx panel prowlarr qbittorrent@$USER_NAME autobrr@$USER_NAME qui@$USER_NAME 2>/dev/null || true
systemctl start nginx panel prowlarr qbittorrent@$USER_NAME autobrr@$USER_NAME qui@$USER_NAME 2>/dev/null || true

# 7. Cleanup
rm -rf "$BACKUP_DIR"

echo "[*] Testing Nginx syntax..."
nginx -t

echo "=== Restore Complete! ==="
echo "Verify that all Swizzin web interfaces are accessible."
```

Make the script executable and run it:
```bash
sudo chmod +x /root/swizzin_restore.sh
sudo /root/swizzin_restore.sh
```


