# System Benchmarking (YABS)

YABS (Yet Another Benchmarking Script) is the industry-standard benchmark script for virtual private servers. Created by Masonr, it quickly tests and evaluates your system's performance across CPU, disk I/O, and network bandwidth.

Running a benchmark is highly recommended right after securing your VPS to ensure you are getting the performance you paid for.

---

## Step 1: Run YABS (Standard Test)
Run the script using `curl` directly. This will test disk performance (using `fio`), system performance (using `Geekbench`), and network speeds (using `iperf3` to various locations):

```bash
curl -sL yabs.sh | bash
```

---

## Step 2: Custom Parameters (Flags)
If your VPS has limited resources or you want to skip certain tests to save time, you can pass flags to the script.

### 1. Skip Geekbench (CPU Test)
Geekbench tests can take several minutes and put heavy load on the CPU. To skip them:
```bash
curl -sL yabs.sh | bash -s -- -g
```

### 2. Skip Disk I/O Test
To skip the `fio` read/write tests:
```bash
curl -sL yabs.sh | bash -s -- -d
```

### 3. Skip Network Bandwidth Test
To skip the `iperf3` upload/download benchmarks:
```bash
curl -sL yabs.sh | bash -s -- -i
```

### 4. Run Geekbench 5 (Instead of Geekbench 6)
By default, YABS runs Geekbench 6. If you want to compare scores using the older Geekbench 5:
```bash
curl -sL yabs.sh | bash -s -- -5
```

---

## Step 3: Understanding the Results

A typical YABS output consists of three main components:

### 1. Basic System Information
Displays your CPU model, cores, frequency, RAM, swap space, virtualization type (KVM, OpenVZ, etc.), and active operating system.

### 2. Disk I/O Performance (`fio`)
Measures read/write speeds for `4k`, `64k`, `512k`, and `1m` block sizes.
*   **4k blocks**: Critical for database performance and general OS responsiveness. Look for values over **20-30 MB/s** (write) on standard SSDs, and higher on NVMe.
*   **1m blocks**: Represents sequential read/write (large files).

### 3. Geekbench Scores
Provides single-core and multi-core processor performance ratings. This lets you compare your VPS's CPU against other servers and hardware.

### 4. Network Performance (`iperf3`)
Runs speed tests to various server nodes around the world. It provides:
*   **Send/Receive speeds** (throughput).
*   **Latency (Ping)** to global locations.
