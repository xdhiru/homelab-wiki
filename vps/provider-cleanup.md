# VPS Provider Cleanup & De-bloating

Many VPS providers provision VMs with pre-installed telemetry agents, background monitoring tools, or pre-configured root keys. If your provider is fully trusted, these steps are optional but highly recommended to ensure you have a clean slate.

---

## Step 1: Secure Root Access & Active Sessions

Immediately secure root access and verify that no unauthorized installation scripts remain logged in.

### 1. Change Root Password
Change the default root password to a strong, unique secret:
```bash
passwd root
```

### 2. Inspect Injected Authorized SSH Keys
Some providers inject public keys to manage VMs or perform background maintenance. Check for lingering keys:
```bash
# View existing public keys authorized for root
cat /root/.ssh/authorized_keys

# Remove any keys that you did not explicitly add
nano /root/.ssh/authorized_keys
```

### 3. Terminate Extraneous Active Sessions
List all active shell terminals logged into the server:
```bash
w
```
Find your current terminal TTY:
```bash
tty
```
Forcefully terminate any other active shell sessions (replace `pts/1` with the target session's TTY name):
```bash
sudo pkill -9 -t pts/1
```

---

## Step 2: Purge Provider Telemetry & Management Agents

Remove background hypervisor agents and pre-installed management scripts.

### 1. Purge cloud-init
`cloud-init` is standard for seeding configurations on initial boot, but leaving it active can allow the host to re-execute configuration scripts or ping home.
```bash
# Stop and disable cloud-init services
sudo systemctl stop cloud-init
sudo systemctl disable cloud-init

# Purge cloud-init package and dependencies
sudo apt-get purge cloud-init -y

# Delete leftover configuration files
sudo rm -rf /etc/cloud/ /var/lib/cloud/
```

### 2. Purge Hypervisor Tools
If you are running on virtualized platforms (like VMware or QEMU), you can purge guest agents that allow the host machine to execute guest-level scripts:
```bash
# For VMware guests
sudo apt-get purge open-vm-tools open-vm-tools-desktop -y

# For QEMU/KVM guests
sudo apt-get purge qemu-guest-agent -y
```

### 3. Purge Cloud Provider Agents
Remove telemetry or agent services pre-installed by platforms like DigitalOcean, Linode, AWS, or Azure:
```bash
sudo apt-get purge amazon-ssm-agent waagent digitalocean-agent linode-longview -y
```

### 4. Remove Orphan Packages & Cleanup
Clean up unused package configurations:
```bash
sudo apt-get autoremove --purge -y
sudo apt-get clean
```

---

## Step 3: Remove Leftover Deployment Artifacts

Automated deploy scripts might leave plain text scripts, configuration files, or logs containing passwords.

### 1. Clear Command Histories
Wipe active shell histories to prevent command-line passwords or tokens from staying on disk:
```bash
# Clear active session history
history -c
history -w

# Reset shell history files
cat /dev/null > ~/.bash_history
cat /dev/null > ~/.zsh_history
```

### 2. Inspect Scheduled Crontabs
Verify no recurring status update pingbacks or telemetry scripts are scheduled:
```bash
# Check current user crontab
crontab -l

# Check root crontab
sudo crontab -u root -l

# View system cron jobs
ls -la /etc/cron*
```

---

## Step 4: Audit Network Ports & Running Processes

Audit your VPS to check for unauthorized processes or listening services before exposing it to the network.

### 1. Check Active Listening Ports
Ensure no unexpected services are exposed to the web:
```bash
sudo ss -tulpn
```

### 1b. Disable LLMNR (Port 5355) — Recommended
If the output of `ss -tulpn` shows `systemd-resolve` listening on port `5355` (LLMNR), you should disable it.

*   **What it is:** Link-Local Multicast Name Resolution. It is used to resolve hostnames on local networks without a DNS server.
*   **Privacy/Security Risk:** On a public cloud VPS, it listens on your public network interface. Leaving it open can leak your hostname or broadcast information to the public internet, and it is vulnerable to spoofing attacks.
*   **How to fix it:**
    1. Open the systemd-resolved configuration file:
       ```bash
       sudo nano /etc/systemd/resolved.conf
       ```
    2. Find the line `#LLMNR=yes` (or add it if it doesn't exist), uncomment it, and change it to:
       ```ini
       LLMNR=no
       ```
    3. Save the file and restart the service:
       ```bash
       sudo systemctl restart systemd-resolved
       ```
    *(Note: This security measure is also handled automatically in the [DNS Setup](file:///g:/personal-wiki/vps/dns-setup.md) guide when applying the full optimized resolution configurations.)*

### 2. Inspect Running Processes
List currently active processes and services:
```bash
# View active process tree
ps aux

# Check systemd running services
systemctl list-units --type=service --state=running
```
