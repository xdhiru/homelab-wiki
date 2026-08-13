# Linux System Configurations

When redeploying or rebuilding a server, re-configuring all custom network stack settings, kernel schedules, and key pairs manually can be tedious. 

This guide provides automated scripts to back up all configurations set up in the **VPS Configuration** section, download the backup archive, and restore them on a fresh Debian 12 install.

> [!IMPORTANT]
> **Execution Context:** Both the backup and restore scripts **must be executed as the `root` user** (or with `sudo`). The script requires full root privileges to read and write system-wide configuration files (like `/etc/ssh/sshd_config` and `/etc/default/grub`), modify systemd boot services, and configure global firewall rules.

---

## 1. Backup Script
This script secures your configurations (SSH keys, sysctl rules, systemd services, udev scripts, and firewall parameters) into an encrypted archive `/root/vps_backup.tar.gz.enc` using **AES-256 symmetric encryption** (via `openssl`). It prompts you to define a secure decryption password at runtime.

Create the script on your VPS:
```bash
sudo nano /root/vps_backup.sh
```

Paste the following bash code:
```bash
#!/bin/bash
# VPS Configuration Backup Script
set -e

# Ensure openssl is installed for encryption
if ! command -v openssl &>/dev/null; then
    echo "[*] openssl not found. Installing..."
    sudo apt-get update && sudo apt-get install -y openssl
fi

BACKUP_DIR="/root/vps_backup"
ARCHIVE_PATH="/root/vps_backup.tar.gz"
ENCRYPTED_PATH="${ARCHIVE_PATH}.enc"

echo "=== Starting VPS Configuration Backup ==="

# 1. Clean old backups
rm -rf "$BACKUP_DIR" "$ARCHIVE_PATH" "$ENCRYPTED_PATH"
mkdir -p "$BACKUP_DIR"

# 2. Get secure password from user (supports env, args, prompt, and default fallback)
DEFAULT_PASSWORD="DefaultVpsBackupPassword123!"
PASSWORD="${BACKUP_PASSWORD}"

while getopts "p:" opt; do
    case ${opt} in
        p ) PASSWORD=$OPTARG ;;
    esac
done

if [ -z "$PASSWORD" ]; then
    if [ -t 0 ]; then
        echo "To protect your private keys, please define a decryption password."
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

# 3. Backup SSHD configuration & keys
echo "[*] Backing up SSH & credentials..."
mkdir -p "$BACKUP_DIR/ssh"
cp /etc/ssh/sshd_config "$BACKUP_DIR/ssh/sshd_config"
if [ -d "/root/.ssh" ]; then
    cp -r /root/.ssh "$BACKUP_DIR/ssh/root_keys"
fi

# 4. Backup Hostname & Hosts configuration
echo "[*] Backing up Hostname mapping..."
cp /etc/hostname "$BACKUP_DIR/hostname"
cp /etc/hosts "$BACKUP_DIR/hosts"

# 5. Backup DNS & resolved configurations
echo "[*] Backing up DNS settings..."
cp /etc/systemd/resolved.conf "$BACKUP_DIR/resolved.conf"
cp /etc/resolv.conf "$BACKUP_DIR/resolv.conf"

# 6. Backup Firewall (UFW) configurations
echo "[*] Backing up UFW firewall rules..."
mkdir -p "$BACKUP_DIR/ufw"
cp -r /etc/ufw/* "$BACKUP_DIR/ufw/"

# 6b. Backup Fail2ban configurations
if [ -d "/etc/fail2ban" ]; then
    echo "[*] Backing up Fail2ban configurations..."
    mkdir -p "$BACKUP_DIR/fail2ban"
    cp -r /etc/fail2ban/* "$BACKUP_DIR/fail2ban/"
fi

# 7. Backup Kernel sysctl profiles (BBR)
echo "[*] Backing up sysctl configurations..."
cp /etc/sysctl.d/99-bbr.conf "$BACKUP_DIR/99-bbr.conf"

# 8. Backup Network Tuning Service & Udev rules
echo "[*] Backing up network service and queue rules..."
cp /etc/systemd/system/network-tuning.service "$BACKUP_DIR/network-tuning.service"
if [ -f "/etc/udev/rules.d/99-ens192-txqueuelen.rules" ]; then
    cp /etc/udev/rules.d/99-ens192-txqueuelen.rules "$BACKUP_DIR/99-ens192-txqueuelen.rules"
fi

# 9. Backup GRUB configuration (mitigations=off)
echo "[*] Backing up boot configurations..."
cp /etc/default/grub "$BACKUP_DIR/grub"

# 10. Backup fstab (for manual reference only)
echo "[*] Backing up filesystem table..."
cp /etc/fstab "$BACKUP_DIR/fstab"

# 10b. Backup manually installed packages list
echo "[*] Backing up list of manually installed packages..."
apt-mark showmanual > "$BACKUP_DIR/installed_packages.txt" 2>/dev/null || true

# 11. Archive and compress
echo "[*] Compressing backup folder..."
tar -czf "$ARCHIVE_PATH" -C /root vps_backup

# 12. Encrypt using AES-256 via OpenSSL
echo "[*] Encrypting archive with AES-256..."
openssl enc -aes-256-cbc -pbkdf2 -iter 100000 -salt -pass pass:"$PASSWORD" -in "$ARCHIVE_PATH" -out "$ENCRYPTED_PATH"

# 13. Clean temporary files
rm -rf "$BACKUP_DIR" "$ARCHIVE_PATH"

echo "=== Backup Complete! ==="
echo "Encrypted archive saved at: $ENCRYPTED_PATH"
echo "Run this command on your local machine to download the archive:"
echo "scp -P 22003 root@your_vps_ip:$ENCRYPTED_PATH ./"
```

Make the script executable and run it:
```bash
sudo chmod +x /root/vps_backup.sh
sudo /root/vps_backup.sh
```

---

## 2. Offline Inspection (Optional)
If you have downloaded the encrypted backup to your local machine and want to decrypt and extract the files to inspect or verify their contents offline (runs on Linux, macOS, WSL, or Git Bash), run the following commands in the directory where your `.enc` file is stored:

::: code-group
```bash [Custom Password]
# 1. Decrypt using your custom password (will prompt for password)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -in vps_backup.tar.gz.enc -out vps_backup.tar.gz

# 2. Extract the unencrypted tarball
tar -xzf vps_backup.tar.gz
```
```bash [Default Password]
# 1. Decrypt using the default fallback password
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"DefaultVpsBackupPassword123!" -in vps_backup.tar.gz.enc -out vps_backup.tar.gz

# 2. Extract the unencrypted tarball
tar -xzf vps_backup.tar.gz
```
:::

This will unpack the configurations into a local directory named `vps_backup/` for manual viewing.

---

## 3. Restore Script
Upload the `vps_backup.tar.gz.enc` to `/root/` on your fresh VPS. When run, it prompts for the password to decrypt the archive. It then asks whether to restore **everything** automatically (zero prompts) or enter **interactive mode** to toggle individual components one-by-one.

Create the restore script:
```bash
sudo nano /root/vps_restore.sh
```

Paste the following bash code:
```bash
#!/bin/bash
# VPS Configuration Restore Script
set -e

# Ensure openssl is installed for decryption
if ! command -v openssl &>/dev/null; then
    echo "[*] openssl not found. Installing..."
    sudo apt-get update && sudo apt-get install -y openssl
fi

BACKUP_DIR="/root/vps_backup"
ARCHIVE_PATH="/root/vps_backup.tar.gz"
ENCRYPTED_PATH="${ARCHIVE_PATH}.enc"

if [ ! -f "$ENCRYPTED_PATH" ]; then
    echo "[!] Error: Encrypted backup archive $ENCRYPTED_PATH not found. Upload it first."
    exit 1
fi

echo "=== Starting VPS Configuration Restore ==="

# 1. Install system tools required for restoring these settings (Debian minimal templates lack these)
echo "[*] Installing required system utilities (ufw, ethtool, systemd-resolved, fail2ban)..."
sudo apt-get update && sudo apt-get install -y ufw ethtool systemd-resolved fail2ban curl wget

# 3. Get decryption password (supports env, args, prompt, and default fallback)
DEFAULT_PASSWORD="DefaultVpsBackupPassword123!"
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

# 3. Decrypt archive using AES-256
echo "[*] Decrypting archive..."
if ! openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 -pass pass:"$PASSWORD" -in "$ENCRYPTED_PATH" -out "$ARCHIVE_PATH" 2>/dev/null; then
    echo "[!] Error: Decryption failed. Incorrect password."
    rm -f "$ARCHIVE_PATH"
    exit 1
fi

# 4. Unpack archive
rm -rf "$BACKUP_DIR"
tar -xzf "$ARCHIVE_PATH" -C /root
rm -f "$ARCHIVE_PATH" # Clean unencrypted tarball

# 6. Interactive Restoration Check
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

# --- Module 1: SSH Configurations & Keys ---
if restore_item "Restore SSH Configurations & root keys?"; then
    echo "[*] Restoring SSH configurations..."
    cp "$BACKUP_DIR/ssh/sshd_config" /etc/ssh/sshd_config
    if [ -d "$BACKUP_DIR/ssh/root_keys" ]; then
        mkdir -p /root/.ssh
        cp -r "$BACKUP_DIR/ssh/root_keys"/. /root/.ssh/
        chmod 700 /root/.ssh
        chmod 600 /root/.ssh/*
    fi
    echo "[*] Restarting SSH service..."
    sudo systemctl restart sshd 2>/dev/null || sudo systemctl restart ssh 2>/dev/null || true
fi

# --- Module 2: Hostname ---
if restore_item "Restore Hostname & Hosts mapping?"; then
    echo "[*] Restoring hostname mappings..."
    cp "$BACKUP_DIR/hostname" /etc/hostname
    cp "$BACKUP_DIR/hosts" /etc/hosts
    hostname -F /etc/hostname
fi

# --- Module 3: DNS & systemd-resolved ---
if restore_item "Restore DNS & systemd-resolved Configuration?"; then
    echo "[*] Restoring DNS configuration..."
    cp "$BACKUP_DIR/resolved.conf" /etc/systemd/resolved.conf
    # Unlock, write and relock resolv.conf
    sudo chattr -i /etc/resolv.conf 2>/dev/null || true
    rm -f /etc/resolv.conf
    cp "$BACKUP_DIR/resolv.conf" /etc/resolv.conf
    sudo chattr +i /etc/resolv.conf
    
    sudo systemctl enable --now systemd-resolved
fi

# --- Module 4: UFW Firewall ---
if restore_item "Restore UFW firewall rules?"; then
    echo "[*] Restoring UFW rules..."
    cp -r "$BACKUP_DIR/ufw"/. /etc/ufw/
    echo "[*] Enabling and reloading UFW firewall..."
    sudo ufw --force enable
    sudo ufw reload
fi

# --- Module 4b: Fail2ban configurations ---
if restore_item "Restore Fail2ban configurations?"; then
    echo "[*] Restoring Fail2ban configurations..."
    if [ -d "$BACKUP_DIR/fail2ban" ]; then
        mkdir -p /etc/fail2ban
        cp -r "$BACKUP_DIR/fail2ban"/. /etc/fail2ban/
        sudo systemctl restart fail2ban 2>/dev/null || true
    fi
fi

# --- Module 5: Sysctl configurations (BBR) ---
if restore_item "Restore Sysctl configurations (BBR/FQ)?"; then
    echo "[*] Restoring sysctl profiles..."
    cp "$BACKUP_DIR/99-bbr.conf" /etc/sysctl.d/99-bbr.conf
    sudo sysctl --system
fi

# --- Module 6: Network Tuning Service & Udev rules ---
if restore_item "Restore Network Tuning service & txqueuelen udev rules?"; then
    echo "[*] Restoring network configurations..."
    cp "$BACKUP_DIR/network-tuning.service" /etc/systemd/system/network-tuning.service
    if [ -f "$BACKUP_DIR/99-ens192-txqueuelen.rules" ]; then
        cp "$BACKUP_DIR/99-ens192-txqueuelen.rules" /etc/udev/rules.d/99-ens192-txqueuelen.rules
    fi
    sudo udevadm control --reload-rules 2>/dev/null || true
    sudo udevadm trigger 2>/dev/null || true
    
    sudo systemctl enable network-tuning.service
    sudo systemctl start network-tuning.service 2>/dev/null || true
fi

# --- Module 7: GRUB Configurations ---
if restore_item "Restore GRUB boot options?"; then
    echo "[*] Restoring boot optimizations..."
    cp "$BACKUP_DIR/grub" /etc/default/grub
    echo "[*] Updating GRUB boot menu..."
    sudo update-grub
fi

# Save references before cleanup
if [ -f "$BACKUP_DIR/fstab" ]; then
    cp "$BACKUP_DIR/fstab" /root/restored_fstab_reference
fi
if [ -f "$BACKUP_DIR/installed_packages.txt" ]; then
    cp "$BACKUP_DIR/installed_packages.txt" /root/restored_packages_list.txt
fi

# 6. Cleanup
rm -rf "$BACKUP_DIR"

echo "=== Restore Complete! ==="
echo "Your selected configurations have been successfully restored."
if [ -f "/root/restored_packages_list.txt" ]; then
    echo "A list of previously installed manual packages has been saved to: /root/restored_packages_list.txt"
fi
if [ -f "/root/restored_fstab_reference" ]; then
    echo "Please verify your /etc/fstab mount flags for SSD optimizations manually (your old fstab is saved at: /root/restored_fstab_reference)."
fi
echo "A system reboot is highly recommended to activate sysctl profiles and boot parameters."
echo "Run: sudo reboot"
```

Make the script executable and run it:
```bash
sudo chmod +x /root/vps_restore.sh
sudo /root/vps_restore.sh
```


