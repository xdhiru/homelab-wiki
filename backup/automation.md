# Automated Telegram Backups

Running manual backups before server modifications is essential, but configuring a daily automated schedule guarantees you never lose configurations due to unexpected host crashes.

This guide explains how to configure a custom Telegram Bot, secure a private channel, create a consolidated runner script `/root/run_backups.sh` to execute your system and Swizzin backups, and automate the pipeline daily using a `cron` job.

---

## Step 1: Telegram Bot & Private Channel Setup

### 1. Create a Telegram Bot
You will use a Telegram Bot to call the Telegram API and upload your encrypted archives.
1. Open Telegram and search for the official account `@BotFather`.
2. Start a chat and send `/newbot`.
3. Follow the prompts:
   *   **Name**: E.g., `Kevin VPS Backup Bot`
   *   **Username**: Must end with `bot` (e.g., `kevin_vps_backup_bot`).
4. `@BotFather` will reply with your **HTTP API Access Token** (referred to as your `TELEGRAM_BOT_TOKEN`). Keep this token completely private!

### 2. Create a Private Channel
1. In Telegram, create a **New Channel**.
2. Give it a name (e.g., `VPS Backups`) and set it to **Private**.
3. Add your newly created bot to the channel as an **Administrator** with permission to **Post Messages**.

### 3. Get your Channel Chat ID
Private Telegram channels require a unique numerical Chat ID (which always starts with `-100`). To find it:
1. Post a test message (e.g., "Hello World") in your new private channel.
2. Forward that test message to the public bot `@JsonDumpBot` or `@RawDataBot`.
3. The bot will reply with a JSON object. Look for the `forward_from_chat` or `chat` section and copy the ID (it will look like `-1001234567890`). This is your `TELEGRAM_CHAT_ID`.

---

## Step 2: Consolidated Runner Script

We will create a wrapper script `/root/run_backups.sh` that exports the backup passwords, triggers both backup scripts, uploads the encrypted archives to Telegram, and cleans up the local files.

Create the runner script:
```bash
sudo nano /root/run_backups.sh
```

Paste the following configuration, filling in your Telegram credentials and encryption passwords:

```bash
#!/bin/bash
# Consolidated VPS & Swizzin Backup Runner to Telegram
set -e

# --- CONFIGURATION (EDIT THESE VALUES) ---
TELEGRAM_BOT_TOKEN="your_bot_token_here"
TELEGRAM_CHAT_ID="your_channel_chat_id_here" # e.g. -1001234567890
DECRYPTION_PASSWORD="your_secure_aes_decryption_password_here"
# ----------------------------------------

export BACKUP_PASSWORD="$DECRYPTION_PASSWORD"

# Date variables for filenames and message captions
DATE_SUFFIX=$(date '+%Y%m%d_%H%M%S')
DATE_STR=$(date '+%Y-%m-%d %H:%M:%S')
HOSTNAME_STR=$(hostname)

# Unified container naming
CONTAINER_DIR="/root/backup_snapshot"
CONTAINER_TAR="/root/backup_${HOSTNAME_STR}_${DATE_SUFFIX}.tar"

echo "=== Beginning Automated Backups ==="

# Clean old state
rm -rf "$CONTAINER_DIR" "$CONTAINER_TAR"
mkdir -p "$CONTAINER_DIR"

# 1. Run Linux System Configs Backup
echo "[*] Triggering System Configs Backup..."
if [ -f "/root/vps_backup.sh" ]; then
    /bin/bash /root/vps_backup.sh
else
    echo "[!] Error: /root/vps_backup.sh not found."
    exit 1
fi

# Move system backup to snapshot directory
VPS_ARCHIVE="/root/vps_backup.tar.gz.enc"
if [ -f "$VPS_ARCHIVE" ]; then
    mv "$VPS_ARCHIVE" "$CONTAINER_DIR/"
else
    echo "[!] Error: System backup archive was not generated."
    exit 1
fi

# 2. Run Swizzin Configs Backup
echo "[*] Triggering Swizzin Configs Backup..."
if [ -f "/root/swizzin_backup.sh" ]; then
    /bin/bash /root/swizzin_backup.sh
else
    echo "[!] Warning: /root/swizzin_backup.sh not found."
fi

# Move Swizzin backup to snapshot directory
SWIZZIN_ARCHIVE="/root/swizzin_backup.tar.gz.enc"
if [ -f "$SWIZZIN_ARCHIVE" ]; then
    mv "$SWIZZIN_ARCHIVE" "$CONTAINER_DIR/"
else
    echo "[!] Warning: Swizzin backup archive was not generated."
fi

# 3. Create a single dated container containing the encrypted files
echo "[*] Packaging archives into a single dated container..."
tar -cf "$CONTAINER_TAR" -C "$CONTAINER_DIR" .

# 4. Upload the dated container to Telegram
if [ -f "$CONTAINER_TAR" ]; then
    echo "[*] Uploading unified dated backup to Telegram..."
    curl -s -S -F chat_id="${TELEGRAM_CHAT_ID}" \
         -F document=@"${CONTAINER_TAR}" \
         -F caption="📦 **Consolidated Backup: ${HOSTNAME_STR}**
🗓️ Date: ${DATE_STR}
🔒 Status: Secured (AES-256 encrypted contents)
📄 Contents: System config & Swizzin seedbox snapshot" \
         "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument" > /dev/null
    
    echo "[*] Backup uploaded successfully."
else
    echo "[!] Error: Consolidated archive was not created."
    exit 1
fi

# 5. Clean temporary files
rm -rf "$CONTAINER_DIR" "$CONTAINER_TAR"
echo "[*] Local temporary files cleaned."

echo "=== Automated Backups Completed Successfully! ==="
```

Make the script executable:
```bash
sudo chmod +x /root/run_backups.sh
```

### Dry Run Test
Run the script manually once to verify that it executes cleanly and posts the `.tar` file to your private Telegram channel:
```bash
sudo /root/run_backups.sh
```
*Verify that a single unified `.tar` file (e.g., `backup_yourhostname_20260811_030000.tar`) containing your encrypted backups appears inside your private Telegram channel immediately. Once downloaded to your computer, you can extract it to obtain the two individual `vps_backup.tar.gz.enc` and `swizzin_backup.tar.gz.enc` files, ready for restoration.*

---

## Step 3: Schedule the Backups Daily (Cron)

To run the backup automatically every day, we will register the runner script in the system cron table.

Open the root cron schedule:
```bash
sudo crontab -e
```
*If prompted to choose an editor, select `nano`.*

Add the following line at the very bottom of the file:
```text
0 3 * * * /bin/bash /root/run_backups.sh > /var/log/telegram_backup.log 2>&1
```

### Explanation:
*   `0 3 * * *`: Runs the script every day at exactly **3:00 AM** (server time).
*   `/bin/bash /root/run_backups.sh`: Executes the consolidated backup script.
*   `> /var/log/telegram_backup.log 2>&1`: Captures the execution printouts and logs them to `/var/log/telegram_backup.log`. You can read this file at any time to inspect backup statuses.
