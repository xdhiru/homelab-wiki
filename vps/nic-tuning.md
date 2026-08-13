# Advanced 10G NIC Tuning (ethtool)

To fully saturate a 10Gbps network pipe using a virtualized network adapter (like the VMware VMXNET3 driver, commonly named `ens192`), you must configure hardware-level offloading and expand queue ring buffers. 

By offloading packet segmentation and assembly from the CPU to the virtual NIC, you dramatically lower CPU utilization, allowing your 4-core VPS processor to focus on running the torrent client and disk operations.

> [!NOTE]
> **Identify Your Interface Name**: The commands below assume your network interface is named `ens192`. Check your actual interface name using `ip link` or `ip a` and replace `ens192` accordingly.

---

## Step 1: Fix Offloading Chains (The Checksum Wall)
Many NIC drivers (especially VMware VMXNET3) reject TCP Segmentation Offload (TSO) or Scatter-Gather (SG) if IP Checksum Offloading is not enabled first. 

Run this specific sequence to unlock the capabilities of the driver:

```bash
# 1. Turn on fundamental checksumming first
sudo ethtool -K ens192 rx-checksum on tx-checksum-ip-generic on

# 2. Now enable advanced 10Gbps performance offloads
# Note: lro is explicitly set to OFF to prevent TCP SACK/timestamp loss which breaks BBR pacing
sudo ethtool -K ens192 sg on tso on gso on gro on lro off
```

Verify that the changes are active:
```bash
sudo ethtool -k ens192
```
*You should now see `tx-checksumming: on`, `scatter-gather: on`, `tcp-segmentation-offload: on`, and `large-receive-offload: off`.*

> [!IMPORTANT]
> **Why Large Receive Offload (LRO) must be OFF:**
> LRO merges packets indiscriminately at the driver level, stripping standard TCP option headers like Selective Acknowledgements (SACK) and millisecond timestamps. 
> Because our BBR congestion controller relies entirely on these options to measure RTT and pace outgoing traffic, having LRO enabled will corrupt its calculations, leading to throttled upload speeds and lost swarm races.
> **Generic Receive Offload (GRO)** is software-aware and fully preserves these headers, so it is kept **ON**.

---

## Step 2: Expand Ring Parameters (Buffers)
By default, VPS templates assign conservative buffer sizes. Quadruple these buffer queues to absorb massive packet bursts without dropping packets.

First, view your interface's current and maximum ring settings:
```bash
sudo ethtool -g ens192
```
*Look for the "Pre-set maximums" vs "Current hardware settings".*

Execute these commands to expand the buffers to their absolute maximum limits:
```bash
sudo ethtool -G ens192 rx 4096 tx 4096
```

---

## Step 3: Expand Transmit Queue Length (`txqueuelen`)
The transmit queue length (`txqueuelen`) determines how many packets are allowed to queue up in the driver transmit buffer before the kernel starts dropping them. The Linux default is usually `1000` packets. For intense 10Gbps racing bursts, we should expand this queue length to `10000` to prevent drop-outs.

### 1. View Current Queue Length
```bash
ip link show ens192
```
*Look for `qlen 1000` in the output.*

### 2. Set the Queue Length Temporarily
```bash
sudo ip link set dev ens192 txqueuelen 10000
```
Verify the change:
```bash
ip link show ens192
```
*The output should now display `qlen 10000`.*

### 3. Make the Setting Permanent (Udev Rule)
To ensure the queue length scales up automatically whenever the network card is detected on boot, create a persistent udev rule.

> [!IMPORTANT]
> **Identify Your Interface Name:** If your VPS uses a different interface name (like `eth0` instead of `ens192`), make sure to replace `ens192` with your actual device name in both the udev rule filename (e.g., `99-eth0-txqueuelen.rules`) and its contents!

Write the rule file:
```bash
echo 'SUBSYSTEM=="net", ACTION=="add", KERNEL=="ens192", ATTR{txqueuelen}="10000"' | sudo tee /etc/udev/rules.d/99-ens192-txqueuelen.rules
```

---

## Step 4: Make the Settings Permanent (Systemd Service)
Commands run via `ethtool` are reset upon reboot. We will create a custom systemd startup service to apply these optimizations automatically when the VPS boots.

Create the service configuration file:
```bash
sudo nano /etc/systemd/system/network-tuning.service
```

Paste the following service definition:
```ini
[Unit]
Description=Network Interface Card (NIC) Tuning
After=network.target

[Service]
Type=oneshot
# --- Network Interface Configuration ---
ExecStart=/usr/sbin/ethtool -K ens192 rx-checksum on tx-checksum-ip-generic on
ExecStartPost=/usr/sbin/ethtool -K ens192 sg on tso on gso on gro on lro off
ExecStartPost=/usr/sbin/ethtool -G ens192 rx 4096 tx 4096
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```
Save the file and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

Reload systemd, enable the service to run on boot, and start it:
```bash
# Reload daemon
sudo systemctl daemon-reload

# Enable service on boot
sudo systemctl enable network-tuning.service

# Start the service immediately
sudo systemctl start network-tuning.service
```

---

## Step 5: Verify the Service
Check the status of the network tuning service to ensure it completed without errors:

```bash
sudo systemctl status network-tuning.service
```
*The status should show `active (exited)` with `status=0/SUCCESS`.*
