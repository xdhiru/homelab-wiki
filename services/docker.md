# Docker & Docker Compose Setup

Docker is the foundation of a modern homelab. It containerizes services, making deployment, upgrades, and migrations simple. This guide covers how to install Docker and Docker Compose on Debian/Ubuntu systems.

---

## 1. Remove Old Versions
Before installing, remove any outdated docker packages:

```bash
for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done
```

---

## 2. Set Up the Repository
Add Docker's official GPG key and repository setup:

```bash
# Update package list and install helper utilities
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg -y

# Add Docker's GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the stable repository source
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```
*(Note: If you are running Debian, replace `ubuntu` with `debian` in the curl/echo URL path).*

---

## 3. Install Docker Engine
Update your package index and install Docker:

```bash
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
```

---

## 4. Manage Docker as a Non-Root User
By default, running `docker` commands requires `sudo`. Let's avoid this by adding your user to the `docker` group.

```bash
# Create the docker group (usually already exists)
sudo groupadd docker

# Add your current user to the docker group
sudo usermod -aG docker $USER
```

> [!IMPORTANT]
> You must log out and log back in, or run the following command to activate the group changes:
> ```bash
> newgrp docker
> ```

---

## 5. Verify the Installation
Check that Docker is working and running without root privileges:

```bash
# Verify docker version
docker --version

# Verify compose version
docker compose version

# Run a test container
docker run hello-world
```
If you see the message "Hello from Docker!", your installation is correct!
