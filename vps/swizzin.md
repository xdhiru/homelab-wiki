# Swizzin Setup & Seedbox Configuration

Swizzin is a modular, lightweight seedbox and media server installation script for Debian and Ubuntu. It allows you to quickly deploy native torrent clients, media players, and web utilities through a single terminal wizard.

---

## Step 1: Install Swizzin
Swizzin must be installed as `root` or a user with full `sudo` privileges. Run the following command to retrieve and start the installation script:

```bash
bash <(curl -sL s5n.sh) && . ~/.bashrc
```

---

## Step 2: The Setup Wizard
During the installation, the script will guide you through an interactive setup:

1.  **System Check**: The script will verify your Debian/Ubuntu version.
2.  **Master User**: You will be prompted to create a master administrative username and password. This user will be used to log into the Swizzin web panel and various installed applications.
3.  **Package Selection**: You will see a list of applications to install. We recommend starting with:
    *   `nginx` (Web Server - required for the panel and reverse proxying)
    *   `panel` (The Swizzin Web Dashboard)
    *   `qbittorrent` or `deluge` (Torrent clients)
    *   `netdata` (Real-time server monitoring)

---

## Step 3: Managing Packages with `box`
Swizzin provides a simple command-line interface called `box` to manage your seedbox.

### 1. Installing Applications
You can install apps at any time by running:
```bash
sudo box install <app-name>
```
*Example:*
```bash
sudo box install qbittorrent plex sonarr radarr jackett
```

### 2. Uninstalling Applications
To remove an app and its configurations:
```bash
sudo box remove <app-name>
```

### 3. User Management
*   **Add a new user:**
    ```bash
    sudo box adduser <username>
    ```
*   **Delete a user:**
    ```bash
    sudo box deluser <username>
    ```
*   **Change a user's password:**
    ```bash
    sudo box chpasswd <username>
    ```

### 4. Utility Commands
*   **List all available and installed packages:**
    ```bash
    sudo box list
    ```
*   **Update the swizzin installer scripts:**
    ```bash
    sudo box update
    ```
*   **Check system and service status:**
    ```bash
    sudo box status
    ```
