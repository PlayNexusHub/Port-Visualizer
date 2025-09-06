const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const path = require('path');
const net = require('net');
const { spawn } = require('child_process');
const os = require('os');

// Initialize secure store
const store = new Store({
  encryptionKey: 'playnexus-port-scanner-key-2024'
});

class PortVisualizer {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    this.activeScan = null;
    
    // Security settings
    app.whenReady().then(() => {
      this.createWindow();
      this.setupMenu();
      this.setupIPC();
      
      if (!this.isDev) {
        autoUpdater.checkForUpdatesAndNotify();
      }
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      icon: path.join(__dirname, '../assets/icon.png'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      titleBarStyle: 'default',
      show: false
    });

    this.mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow.show();
      
      if (this.isDev) {
        this.mainWindow.webContents.openDevTools();
      }
    });

    // Security: Prevent new window creation
    this.mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' };
    });

    // Security: Handle external links
    this.mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      
      if (parsedUrl.origin !== 'file://') {
        event.preventDefault();
        shell.openExternal(navigationUrl);
      }
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New Scan',
            accelerator: 'CmdOrCtrl+N',
            click: () => {
              this.mainWindow.webContents.send('menu-new-scan');
            }
          },
          {
            label: 'Export Results',
            accelerator: 'CmdOrCtrl+E',
            click: () => {
              this.exportResults();
            }
          },
          { type: 'separator' },
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      },
      {
        label: 'Scan',
        submenu: [
          {
            label: 'Quick Scan',
            accelerator: 'CmdOrCtrl+Q',
            click: () => {
              this.mainWindow.webContents.send('menu-quick-scan');
            }
          },
          {
            label: 'Full Scan',
            accelerator: 'CmdOrCtrl+F',
            click: () => {
              this.mainWindow.webContents.send('menu-full-scan');
            }
          },
          {
            label: 'Stop Scan',
            accelerator: 'CmdOrCtrl+S',
            click: () => {
              this.stopScan();
            }
          }
        ]
      },
      {
        label: 'Tools',
        submenu: [
          {
            label: 'Settings',
            accelerator: 'CmdOrCtrl+,',
            click: () => {
              this.mainWindow.webContents.send('menu-settings');
            }
          },
          {
            label: 'Clear History',
            click: () => {
              this.clearHistory();
            }
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Documentation',
            click: () => {
              shell.openExternal('https://docs.playnexus.com/port-visualizer');
            }
          },
          {
            label: 'Support',
            click: () => {
              shell.openExternal('mailto:playnexushq@gmail.com?subject=Port Visualizer Support');
            }
          },
          { type: 'separator' },
          {
            label: 'About',
            click: () => {
              this.showAbout();
            }
          }
        ]
      }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }

  setupIPC() {
    // Port scanning
    ipcMain.handle('scan-ports', async (event, target, options) => {
      try {
        return await this.scanPorts(target, options);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Network discovery
    ipcMain.handle('discover-network', async (event, subnet) => {
      try {
        return await this.discoverNetwork(subnet);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Ping host
    ipcMain.handle('ping-host', async (event, host) => {
      try {
        return await this.pingHost(host);
      } catch (error) {
        return {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    });

    // Stop scan
    ipcMain.handle('stop-scan', async () => {
      this.stopScan();
      return { success: true };
    });

    // Save settings
    ipcMain.handle('save-settings', async (event, settings) => {
      try {
        store.set('settings', settings);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Load settings
    ipcMain.handle('load-settings', async () => {
      try {
        const settings = store.get('settings', {
          timeout: 5000,
          threads: 50,
          commonPorts: true,
          allPorts: false,
          customPorts: '22,23,25,53,80,110,443,993,995',
          theme: 'dark'
        });
        return { success: true, settings };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Get network interfaces
    ipcMain.handle('get-network-interfaces', async () => {
      try {
        const interfaces = os.networkInterfaces();
        const result = [];
        
        Object.keys(interfaces).forEach(name => {
          interfaces[name].forEach(iface => {
            if (iface.family === 'IPv4' && !iface.internal) {
              result.push({
                name: name,
                address: iface.address,
                netmask: iface.netmask,
                cidr: iface.cidr
              });
            }
          });
        });
        
        return { success: true, interfaces: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async scanPorts(target, options) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const results = {
        success: true,
        target: target,
        openPorts: [],
        closedPorts: [],
        filteredPorts: [],
        totalPorts: 0,
        scanTime: 0,
        timestamp: new Date().toISOString()
      };

      // Determine ports to scan
      let ports = [];
      if (options.commonPorts) {
        ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 993, 995, 1723, 3306, 3389, 5432, 5900, 8080];
      } else if (options.allPorts) {
        for (let i = 1; i <= 65535; i++) {
          ports.push(i);
        }
      } else if (options.customPorts) {
        ports = options.customPorts.split(',').map(p => parseInt(p.trim())).filter(p => p > 0 && p <= 65535);
      }

      results.totalPorts = ports.length;
      let completed = 0;
      let activeConnections = 0;
      const maxConcurrent = Math.min(options.threads || 50, 200);

      const scanPort = (port) => {
        return new Promise((portResolve) => {
          const socket = new net.Socket();
          const timeout = options.timeout || 5000;

          socket.setTimeout(timeout);
          
          socket.on('connect', () => {
            results.openPorts.push({
              port: port,
              service: this.getServiceName(port),
              state: 'open'
            });
            socket.destroy();
            portResolve();
          });

          socket.on('timeout', () => {
            results.filteredPorts.push({
              port: port,
              service: this.getServiceName(port),
              state: 'filtered'
            });
            socket.destroy();
            portResolve();
          });

          socket.on('error', () => {
            results.closedPorts.push({
              port: port,
              service: this.getServiceName(port),
              state: 'closed'
            });
            portResolve();
          });

          socket.connect(port, target);
        });
      };

      const processPorts = async () => {
        for (let i = 0; i < ports.length; i += maxConcurrent) {
          if (this.activeScan === null) break; // Scan was stopped
          
          const batch = ports.slice(i, i + maxConcurrent);
          await Promise.all(batch.map(port => scanPort(port)));
          
          completed += batch.length;
          
          // Send progress update
          this.mainWindow.webContents.send('scan-progress', {
            completed: completed,
            total: results.totalPorts,
            percentage: Math.round((completed / results.totalPorts) * 100)
          });
        }

        results.scanTime = Date.now() - startTime;
        
        // Sort results by port number
        results.openPorts.sort((a, b) => a.port - b.port);
        results.closedPorts.sort((a, b) => a.port - b.port);
        results.filteredPorts.sort((a, b) => a.port - b.port);

        this.activeScan = null;
        resolve(results);
      };

      this.activeScan = { target, options };
      processPorts();
    });
  }

  async discoverNetwork(subnet) {
    return new Promise((resolve) => {
      const results = {
        success: true,
        subnet: subnet,
        hosts: [],
        totalHosts: 0,
        scanTime: 0,
        timestamp: new Date().toISOString()
      };

      const startTime = Date.now();
      
      // Parse subnet (e.g., 192.168.1.0/24)
      const [network, cidr] = subnet.split('/');
      const networkParts = network.split('.').map(Number);
      const hostBits = 32 - parseInt(cidr);
      const totalHosts = Math.pow(2, hostBits) - 2; // Exclude network and broadcast
      
      results.totalHosts = totalHosts;
      
      let completed = 0;
      const hosts = [];

      // Generate host IPs
      for (let i = 1; i < totalHosts + 1; i++) {
        const hostIP = [...networkParts];
        let remainder = i;
        
        for (let j = 3; j >= 0; j--) {
          if (remainder > 0) {
            hostIP[j] += remainder % 256;
            remainder = Math.floor(remainder / 256);
          }
        }
        
        hosts.push(hostIP.join('.'));
      }

      const pingHost = async (host) => {
        try {
          const isAlive = await this.pingHost(host);
          if (isAlive.success && isAlive.alive) {
            results.hosts.push({
              ip: host,
              hostname: isAlive.hostname || host,
              responseTime: isAlive.responseTime,
              status: 'alive'
            });
          }
        } catch (error) {
          // Host is down or unreachable
        }
        
        completed++;
        
        // Send progress update
        this.mainWindow.webContents.send('discovery-progress', {
          completed: completed,
          total: totalHosts,
          percentage: Math.round((completed / totalHosts) * 100),
          found: results.hosts.length
        });
      };

      const processHosts = async () => {
        const maxConcurrent = 50;
        
        for (let i = 0; i < hosts.length; i += maxConcurrent) {
          if (this.activeScan === null) break;
          
          const batch = hosts.slice(i, i + maxConcurrent);
          await Promise.all(batch.map(host => pingHost(host)));
        }

        results.scanTime = Date.now() - startTime;
        results.hosts.sort((a, b) => {
          const aIP = a.ip.split('.').map(Number);
          const bIP = b.ip.split('.').map(Number);
          
          for (let i = 0; i < 4; i++) {
            if (aIP[i] !== bIP[i]) {
              return aIP[i] - bIP[i];
            }
          }
          return 0;
        });

        this.activeScan = null;
        resolve(results);
      };

      this.activeScan = { subnet };
      processHosts();
    });
  }

  async pingHost(host) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows ? 'ping' : 'ping';
      const pingArgs = isWindows ? ['-n', '1', '-w', '3000', host] : ['-c', '1', '-W', '3', host];

      const ping = spawn(pingCmd, pingArgs);
      let output = '';

      ping.stdout.on('data', (data) => {
        output += data.toString();
      });

      ping.on('close', (code) => {
        const responseTime = Date.now() - startTime;
        const alive = code === 0;
        
        let hostname = host;
        if (alive && output) {
          // Try to extract hostname from ping output
          const hostnameMatch = output.match(/from ([^\s]+)/i) || output.match(/Reply from ([^\s:]+)/i);
          if (hostnameMatch && hostnameMatch[1] !== host) {
            hostname = hostnameMatch[1];
          }
        }

        resolve({
          success: true,
          alive: alive,
          host: host,
          hostname: hostname,
          responseTime: alive ? responseTime : null,
          timestamp: new Date().toISOString()
        });
      });

      ping.on('error', () => {
        resolve({
          success: false,
          alive: false,
          host: host,
          error: 'Ping command failed',
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  getServiceName(port) {
    const services = {
      21: 'FTP',
      22: 'SSH',
      23: 'Telnet',
      25: 'SMTP',
      53: 'DNS',
      80: 'HTTP',
      110: 'POP3',
      135: 'RPC',
      139: 'NetBIOS',
      143: 'IMAP',
      443: 'HTTPS',
      993: 'IMAPS',
      995: 'POP3S',
      1723: 'PPTP',
      3306: 'MySQL',
      3389: 'RDP',
      5432: 'PostgreSQL',
      5900: 'VNC',
      8080: 'HTTP-Alt'
    };
    
    return services[port] || 'Unknown';
  }

  stopScan() {
    this.activeScan = null;
    this.mainWindow.webContents.send('scan-stopped');
  }

  async exportResults() {
    const { filePath } = await dialog.showSaveDialog(this.mainWindow, {
      defaultPath: `port-scan-${new Date().toISOString().split('T')[0]}.json`,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath) {
      this.mainWindow.webContents.send('export-results', filePath);
    }
  }

  clearHistory() {
    store.delete('scanHistory');
    this.mainWindow.webContents.send('history-cleared');
    
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'History Cleared',
      message: 'Scan history has been cleared successfully.'
    });
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About PlayNexus Port Visualizer',
      message: 'PlayNexus Port Visualizer v1.0.0',
      detail: 'Powered by PlayNexus — Subsystems: ClanForge, BotForge.\nOwned by Nortaq.\nContact: playnexushq@gmail.com\n\nProfessional network port scanning and visualization tool for ethical security testing.'
    });
  }
}

// Initialize app
new PortVisualizer();

// Auto-updater events
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available.');
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater. ' + err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded');
  autoUpdater.quitAndInstall();
});
