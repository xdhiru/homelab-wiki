# Disk Space Maintenance & Cleaning

Torrent racing generates constant disk read/write cycles, and system logs, package caches, and temporary files can quickly accumulate and fill up your VPS storage. 

This guide details copy-pasteable commands and configurations to limit system log sizes, purge package archives, and reclaim disk space.

---

## Step 1: Cap Systemd Journal Logs (100MB Limit)
By default, the systemd journal logs all system activity and can grow to several gigabytes. We will restrict the journal to a maximum size of 100MB.

### 1. Configure the Journal Limit
Run this automated `sed` command to uncomment and set `SystemMaxUse=100M` in the configuration:
```bash
sudo sed -i 's/#SystemMaxUse=/SystemMaxUse=100M/' /etc/systemd/journald.conf
```
*Alternatively, open `/etc/systemd/journald.conf` with `nano` and set `SystemMaxUse=100M`.*

### 2. Apply and Vacuum
Restart the journal daemon and run the vacuum command to delete any existing log data that exceeds the 100MB threshold:
```bash
# Restart the service
sudo systemctl restart systemd-journald

# Vacuum old logs down to the 100MB limit
sudo journalctl --vacuum-size=100M
```

---

## Step 2: Clean APT Package Cache
The APT package manager stores copies of every downloaded `.deb` package file in `/var/cache/apt/archives/`. These can safely be deleted to recover space.

Run this sequence to clean up the package index caches:
```bash
# Remove old downloaded package archives
sudo apt-get clean

# Remove unused orphan packages and their configuration files
sudo apt-get autoremove --purge -y

# Optional: Clear local package lists (frees ~100MB-200MB)
# Note: You must run 'sudo apt update' before installing new packages after running this.
sudo rm -rf /var/lib/apt/lists/*
```

---

## Step 3: Clear Temporary Directories & Local Logs
Old temporary items and local mail queues can slowly eat away at your disk space over time.

### 1. Clean `/tmp` Files
Delete files in the `/tmp` directory that have not been accessed in the last 7 days:
```bash
sudo find /tmp -type f -atime +7 -delete
```

### 2. Truncate System Mail Logs
VPS mail services (like Postfix) can dump local cron job failure notices into system mailboxes. Empty these mailboxes and log files without deleting the files themselves:
```bash
# Truncate root mail queue
sudo truncate -s 0 /var/mail/root 2>/dev/null

# Truncate default system mail log
sudo truncate -s 0 /var/log/mail.log 2>/dev/null
```

---

## Step 4: Clear PageCache & Inodes (RAM Cache)
If you need to free up memory (RAM) cache immediately (for instance, to allocate more cache space to a torrent client or before executing high-load benchmarks), flush the Linux kernel buffers.

> [!NOTE]
> Flushing RAM caches is safe but will temporarily increase disk read activity as files are re-read from storage.

```bash
# Sync all buffered writes from RAM to SSD first
sync

# Flush PageCache, dentries, and inodes
echo 3 | sudo tee /proc/sys/vm/drop_caches
```
