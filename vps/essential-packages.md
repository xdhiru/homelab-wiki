# Essential System Packages

Debian 12 (Bookworm) provides a highly minimal base installation. Before configuring services, you should install a standard set of system administration, network diagnostics, and terminal multiplexing utilities.

Run the following command to install all essential packages in one go:

```bash
sudo apt update && sudo apt install -y tmux htop curl wget aria2 net-tools dnsutils ufw git unzip tar bash-completion
```

---

## What are these packages?

Here is a breakdown of why these specific tools are recommended for your VPS:

### 1. Terminal & Session Management
*   **`tmux`**: A terminal multiplexer. It allows you to run background terminal sessions that remain active even if your SSH connection drops or you close your laptop.
*   **`bash-completion`**: Adds smart tab-completion support for shell commands, options, and filenames in Bash.

### 2. Monitoring & Diagnostics
*   **`htop`**: An interactive, colorful system process monitor. It replaces the basic `top` command and makes it easy to monitor CPU, RAM, and running processes.

### 3. File Downloads & Transfers
*   **`curl`**: Command-line tool for transferring data using various network protocols (HTTP, HTTPS, FTP, etc.).
*   **`wget`**: A non-interactive network downloader, ideal for downloading files over HTTP/HTTPS from scripts.
*   **`aria2`**: A lightweight multi-protocol & multi-source command-line download utility. It supports HTTP/HTTPS, FTP, SFTP, and BitTorrent, allowing segmented multi-connection downloads to maximize bandwidth.

### 4. Networking & DNS Diagnostics
*   **`net-tools`**: Contains legacy command-line tools for controlling the network subsystem (such as `ifconfig`, `netstat`, `route`).
*   **`dnsutils`**: Provides core DNS lookup utilities like `dig` and `nslookup`, which are essential for troubleshooting domain resolution.
*   **`ufw`**: Uncomplicated Firewall, a user-friendly frontend for managing iptables/nftables firewall rules.

### 5. Utilities & VCS
*   **`git`**: The standard version control system, used for cloning repositories (like docker-compose setups or config files).
*   **`unzip` & `tar`**: Essential compression utilities used to extract zip archives and tape archives (`.tar.gz`).

---

## Installing `mkbrr` (autobrr filter manager)
`mkbrr` is a helper utility from the `autobrr` team that simplifies creating and migrating filters or client instances.

To download the latest release and install it to `/usr/local/bin`:
```bash
# 1. Download the latest linux_x86_64 binary release from GitHub
wget $(curl -s https://api.github.com/repos/autobrr/mkbrr/releases/latest | grep download | grep linux_x86_64 | cut -d\" -f4)

# 2. Extract the binary directly into the system binary path
sudo tar -C /usr/local/bin -xzf mkbrr_*_linux_x86_64.tar.gz mkbrr

# 3. Clean up the downloaded archive
rm mkbrr_*_linux_x86_64.tar.gz
```

### Verify Installation
After installation, verify that `mkbrr` is working correctly:
```bash
mkbrr version
```
