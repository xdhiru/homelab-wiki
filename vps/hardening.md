# VPS OS Hardening

This guide covers the initial OS setup and hardening steps to secure your server once it is provisioned. 

> [!TIP]
> **Pre-Hardening Cleanup (Optional):** If you want to clean telemetry agents, remove injected SSH keys, or remove automated setup histories pre-installed by your VPS provider first, follow the [VPS Provider Cleanup & De-bloating Guide](/vps/provider-cleanup).

---

## Step 1: System Updates

Ensure your operating system package repositories are up to date and all security patches are applied.

```bash
sudo apt update && sudo apt upgrade -y
```

---

## Step 2: Change Hostname

Setting a custom hostname helps identify the server in your command prompts and logs. In this guide, we will name the host `hogwarts`.

Change the system hostname:
```bash
sudo hostnamectl set-hostname hogwarts
```

To prevent resolution issues, open your `/etc/hosts` file:
```bash
sudo nano /etc/hosts
```

Ensure the loopback addresses (`127.0.0.1` and `::1`) are mapped to `hogwarts`. The final file should look like this:
```text
127.0.0.1       localhost hogwarts
::1             localhost ip6-localhost ip6-loopback hogwarts
ff02::1         ip6-allnodes
ff02::2         ip6-allrouters
```

Apply the hostname changes immediately by restarting the hostname daemon and refreshing your shell session:
```bash
sudo systemctl restart systemd-hostnamed
exec bash
```

---

## Step 3: Create a Non-Root Sudo User

It is unsafe to log in and run actions as the root user. Let's create a dedicated administrator user.

```bash
# Create a new user (replace 'adminuser' with your desired username)
sudo adduser adminuser

# Add the user to the sudo group for administrative privileges
sudo usermod -aG sudo adminuser
```

Verify that the user can run commands with administrative privileges:
```bash
su - adminuser
sudo whoami
# This should prompt for your user's password and output 'root'
```

---

## Step 4: Configure SSH Key-Based Authentication

Password-based logins are highly vulnerable to automated brute-force attacks. You should configure cryptographic SSH keys.

### 1. Generate SSH Keys (On Your Local Machine)
Generate a modern Ed25519 key pair, saving it directly to your current working directory:
```bash
ssh-keygen -t ed25519 -f ./id_ed25519 -C "your_email@example.com"
```
This command generates two files in your current directory:
*   `id_ed25519` (Private key - **keep secure!**)
*   `id_ed25519.pub` (Public key - to be uploaded to your server)

### 2. Manually Authorize Public Key on VPS
Because some local environments (like Windows PowerShell or Command Prompt) lack the `ssh-copy-id` tool, we will authorize the key manually.

First, view the contents of the public key file on your local machine:
```bash
# On Windows PowerShell:
Get-Content ./id_ed25519.pub

# On Windows Command Prompt (CMD):
type .\id_ed25519.pub

# On Linux/macOS:
cat ./id_ed25519.pub
```
Copy the entire text output (which starts with `ssh-ed25519...`).

Next, switch back to your VPS terminal (logged in as `adminuser`) and run:
```bash
# Create the .ssh folder if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Open the authorized_keys file
nano ~/.ssh/authorized_keys
```
Paste your public key into the file, save, and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Set the correct permissions on the file:
```bash
chmod 600 ~/.ssh/authorized_keys
```

---

## Step 5: Harden SSH Daemon Settings

Disable direct root logins and password authentication so that the server only accepts incoming connections from authorized SSH keys.

> [!WARNING]
> Keep your current SSH session terminal window open! Do not close it until you have verified that you can successfully log in using a new terminal window.

Edit the SSH server configuration file:
```bash
sudo nano /etc/ssh/sshd_config
```

Ensure the following configuration directives are set in the file:
```text
PermitRootLogin yes
PasswordAuthentication no
PubkeyAuthentication yes
Port 22003 # Optional: Change to a non-standard port to reduce bot scans

# Keep-alive and automatic idle timeout settings
ClientAliveInterval 300
ClientAliveCountMax 2
```

### Understanding Keep-Alive Settings:
*   **`ClientAliveInterval 300`**: Sends an encrypted keep-alive request to the client every 300 seconds (5 minutes) if no data has been received, preventing firewall timeouts from dropping your connection.
*   **`ClientAliveCountMax 2`**: Sets the limit for consecutive unanswered keep-alives. If the client fails to respond 2 times in a row (representing a total of 10 minutes of complete inactivity/disconnection), the server terminates the session. This prevents stale terminal processes from hanging open indefinitely.

Before restarting the daemon, **always** test the configuration file for syntax errors to ensure you don't get locked out of the server:
```bash
sudo sshd -t
```
*If this command completes without output, the configuration is valid.*

Now, restart the SSH service to apply the configuration:
```bash
sudo systemctl restart ssh
```

---

## Step 6: Verify Login

Open a **new** terminal window on your local machine and verify that you can successfully log in using your SSH key and the non-root account:

```bash
# If you changed the port to 22003:
ssh -i ./id_ed25519 adminuser@<YOUR_VPS_IP> -p 22003

# If you kept the default port 22:
ssh -i ./id_ed25519 adminuser@<YOUR_VPS_IP>
```

Once you confirm you can log in, it is safe to close your original root terminal session.
