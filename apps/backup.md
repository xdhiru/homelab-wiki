# Backup & Synchronization Setup

Never lose your configurations. This guide explains how to set up automated backups for your `~/homelab` configuration directories to remote cloud storage using `rclone` and standard cron jobs.

---

## 1. Install Rclone
Rclone is a command-line program to manage files on cloud storage.

```bash
sudo apt update && sudo apt install rclone -y
```

---

## 2. Configure Remote Storage
Run the interactive configuration setup to add a cloud provider (Google Drive, Dropbox, Backblaze B2, AWS S3, etc.):

```bash
rclone config
```
*Follow the interactive instructions to create a new remote named `remote-backup`.*

---

## 3. Create a Backup Script
Create a backup shell script to compress your configurations and sync them:

```bash
mkdir -p ~/scripts
nano ~/scripts/backup.sh
```

Paste the following script:
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/$USER/homelab"
DEST_REMOTE="remote-backup:vps-backups"
ARCHIVE_NAME="vps-backup-$(date +%F).tar.gz"
TEMP_DIR="/tmp/backups"

# Prepare
mkdir -p $TEMP_DIR

# Compress
echo "Compressing homelab directory..."
tar --exclude='**/cache' --exclude='**/downloads' -czf $TEMP_DIR/$ARCHIVE_NAME -C $BACKUP_DIR .

# Upload to remote cloud
echo "Uploading backup archive to cloud..."
rclone copy $TEMP_DIR/$ARCHIVE_NAME $DEST_REMOTE

# Cleanup temporary files
rm -rf $TEMP_DIR

echo "Backup complete!"
```

Make the script executable:
```bash
chmod +x ~/scripts/backup.sh
```

---

## 4. Automate with Cron
Schedule the script to run daily at 2:00 AM.

Open the cron scheduler:
```bash
crontab -e
```

Add the following line at the bottom of the file:
```text
0 2 * * * /home/adminuser/scripts/backup.sh > /dev/null 2>&1
```
*(Make sure to replace `/home/adminuser` with your actual home directory path).*
