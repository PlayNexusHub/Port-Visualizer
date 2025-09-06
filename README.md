# PlayNexus Port Visualizer

Professional network port scanning and visualization tool for cybersecurity professionals and network administrators.

## Overview

The PlayNexus Port Visualizer is a comprehensive network scanning tool that provides real-time port analysis, service detection, and network visualization. Built with modern Electron technology, it offers an intuitive interface for network reconnaissance and security assessments.

## ✨ Key Features

### Network Scanning
- **TCP/UDP Port Scanning** - Comprehensive port discovery with customizable ranges
- **Service Detection** - Automatic identification of running services and versions
- **OS Fingerprinting** - Operating system detection and classification
- **Stealth Scanning** - Multiple scan techniques (SYN, Connect, FIN, NULL, Xmas)
- **Performance Optimization** - Multi-threaded scanning with configurable concurrency

### Visualization & Analysis
- **Interactive Network Maps** - Visual representation of discovered hosts and services
- **Port Status Indicators** - Color-coded port states (open, closed, filtered)
- **Service Banners** - Detailed service information and version detection
- **Vulnerability Indicators** - Highlighting of potentially vulnerable services
- **Real-time Progress** - Live scanning progress with ETA calculations

### Professional Features
- **Export Capabilities** - JSON, CSV, XML, and PDF report generation
- **Scan Profiles** - Pre-configured scan templates for different scenarios
- **History Tracking** - Automatic saving of scan results and comparison
- **Custom Port Lists** - User-defined port ranges and service definitions
- **Network Discovery** - Automatic subnet discovery and host enumeration

## 🚀 Quick Start

### Installation
1. Download the latest release from the releases folder
2. Run the installer as Administrator
3. Launch from Desktop shortcut or Start Menu

### Basic Usage
```bash
cd Port_Visualizer
npm install
npm start
```

1. **Enter Target** - Input IP address, hostname, or CIDR range
2. **Select Scan Type** - Choose from Quick, Full, or Custom scan profiles
3. **Configure Options** - Set port ranges, timing, and scan techniques
4. **Start Scan** - Click "Start Scan" to begin network analysis
5. **Analyze Results** - Review discovered hosts, ports, and services
6. **Export Results** - Save findings in your preferred format

### Example Scan Results
```
Target: 192.168.1.0/24
Scan Type: Full TCP Scan
Hosts Discovered: 12 active hosts
Ports Scanned: 65,535 per host
Time Elapsed: 4m 23s

Host: 192.168.1.1 (Router/Gateway)
├── 22/tcp   - SSH (OpenSSH 8.2)
├── 53/tcp   - DNS (dnsmasq 2.80)
├── 80/tcp   - HTTP (nginx 1.18.0)
├── 443/tcp  - HTTPS (nginx 1.18.0)
└── 8080/tcp - HTTP-Proxy (Squid 4.10)

Host: 192.168.1.100 (Workstation)
├── 135/tcp  - RPC Endpoint Mapper
├── 139/tcp  - NetBIOS Session Service
├── 445/tcp  - SMB (Microsoft Windows)
├── 3389/tcp - RDP (Microsoft Terminal Services)
└── 5357/tcp - Web Services Discovery

Vulnerability Indicators:
⚠️  SSH version may be outdated (192.168.1.1:22)
❌ SMB signing not required (192.168.1.100:445)
⚠️  RDP exposed to network (192.168.1.100:3389)
```

## 🔧 Scan Configuration

### Scan Types
- **Quick Scan** - Top 1,000 most common ports (TCP only)
- **Full Scan** - All 65,535 TCP ports with basic UDP scan
- **Custom Scan** - User-defined port ranges and protocols
- **Stealth Scan** - SYN scan with timing evasion
- **Aggressive Scan** - Service detection with OS fingerprinting

### Port Ranges
```
Common Ranges:
- Well-known ports: 1-1023
- Registered ports: 1024-49151
- Dynamic ports: 49152-65535
- Custom ranges: User-defined (e.g., 80,443,8080-8090)

Protocol Support:
- TCP: Full connection and SYN scanning
- UDP: Basic UDP port probing
- ICMP: Host discovery and ping sweeps
```

### Timing Templates
```
Paranoid (T0): Very slow, 5+ minutes between probes
Sneaky (T1): Slow, 15 seconds between probes
Polite (T2): Normal, 0.4 seconds between probes
Normal (T3): Default timing (recommended)
Aggressive (T4): Fast, 0.1 seconds between probes
Insane (T5): Very fast, may miss results
```

## 📊 Results Analysis

### Port States
- **Open** - Port is accepting connections
- **Closed** - Port is accessible but no service listening
- **Filtered** - Port blocked by firewall or security device
- **Open|Filtered** - Port state uncertain (UDP scans)
- **Unfiltered** - Port accessible but state unknown

### Service Detection
- **Version Detection** - Automatic service version identification
- **Banner Grabbing** - Service banner and header analysis
- **Fingerprinting** - Application and OS detection
- **Vulnerability Mapping** - Known CVE associations
- **Service Classification** - Protocol and service type identification

## 🛠️ Development

### Prerequisites
- Node.js 16+ and npm
- Windows 10/11 for building Windows executables
- Administrative privileges for raw socket access

### Setup
```bash
# Clone or download the source
cd Port_Visualizer

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

### Project Structure
```
Port_Visualizer/
├── src/
│   ├── main.js          # Main Electron process
│   ├── preload.js       # Secure IPC bridge
│   └── renderer/        # UI components
│       ├── index.html   # Main interface
│       ├── styles.css   # Styling
│       └── app.js       # Client-side logic
├── assets/              # Icons and resources
├── scan-profiles/       # Pre-configured scan templates
├── package.json         # Dependencies and scripts
└── README.md           # This file
```

## 🔒 Security & Ethics

### Ethical Use Guidelines
- **Authorized Testing Only** - Only scan networks you own or have explicit permission to test
- **Respect Rate Limits** - Use appropriate timing to avoid overwhelming target systems
- **Legal Compliance** - Ensure compliance with local laws and regulations
- **Responsible Disclosure** - Report vulnerabilities through proper channels

### Application Security
- **Privilege Management** - Minimal required privileges for scanning
- **Input Validation** - All target inputs validated and sanitized
- **Rate Limiting** - Built-in timing controls and request throttling
- **Secure Storage** - Encrypted storage of scan results and configurations

## 📋 System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit)
- **RAM**: 4GB
- **Storage**: 200MB free space
- **Network**: Network interface for scanning
- **Privileges**: Administrator rights for advanced scanning

### Recommended Requirements
- **OS**: Windows 11 (64-bit)
- **RAM**: 8GB
- **Storage**: 1GB free space
- **Network**: Gigabit network interface
- **CPU**: Multi-core processor for concurrent scanning

## 🐛 Troubleshooting

### Common Issues

**"Permission Denied" errors:**
- Run application as Administrator
- Check Windows Firewall settings
- Verify network interface permissions
- Ensure antivirus is not blocking the application

**Slow scanning performance:**
- Reduce concurrency settings
- Use faster timing templates
- Scan smaller port ranges
- Check network bandwidth and latency

**No hosts discovered:**
- Verify target network is accessible
- Check ICMP/ping connectivity
- Try different host discovery methods
- Ensure target hosts are powered on

### Error Codes
- **SCAN_001**: Invalid target format
- **SCAN_002**: Network unreachable
- **SCAN_003**: Permission denied
- **SCAN_004**: Timeout during scan
- **SCAN_005**: Too many concurrent connections

## 📞 Support & Contact

### Getting Help
- **Email**: playnexushq@gmail.com
- **Issues**: Report bugs via GitHub issues
- **Documentation**: Check the user manual in documentation/

### Reporting Issues
Please include:
- Target network information (if safe to share)
- Scan configuration and parameters used
- Error messages and codes
- System information (OS, network setup)
- Expected vs actual results

## 📄 License

MIT License - See LICENSE file for details.

## 🏷️ Version History

### v1.0.0 (Current)
- Initial release with comprehensive network scanning
- Professional UI with real-time visualization
- Multiple scan types and timing templates
- Export functionality (JSON, CSV, XML, PDF)
- Service detection and OS fingerprinting
- History tracking and scan comparison

---

**PlayNexus Port Visualizer** - Professional network reconnaissance
Owner: Nortaq | Contact: playnexushq@gmail.com
