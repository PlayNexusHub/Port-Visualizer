const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Port scanning
  scanPorts: (target, options) => ipcRenderer.invoke('scan-ports', target, options),
  discoverNetwork: (subnet) => ipcRenderer.invoke('discover-network', subnet),
  pingHost: (host) => ipcRenderer.invoke('ping-host', host),
  stopScan: () => ipcRenderer.invoke('stop-scan'),
  
  // Network interfaces
  getNetworkInterfaces: () => ipcRenderer.invoke('get-network-interfaces'),
  
  // Settings
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  
  // Progress events
  onScanProgress: (callback) => ipcRenderer.on('scan-progress', callback),
  onDiscoveryProgress: (callback) => ipcRenderer.on('discovery-progress', callback),
  onScanStopped: (callback) => ipcRenderer.on('scan-stopped', callback),
  
  // Menu events
  onMenuNewScan: (callback) => ipcRenderer.on('menu-new-scan', callback),
  onMenuQuickScan: (callback) => ipcRenderer.on('menu-quick-scan', callback),
  onMenuFullScan: (callback) => ipcRenderer.on('menu-full-scan', callback),
  onMenuSettings: (callback) => ipcRenderer.on('menu-settings', callback),
  onExportResults: (callback) => ipcRenderer.on('export-results', callback),
  onHistoryCleared: (callback) => ipcRenderer.on('history-cleared', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  
  // Utility
  getVersion: () => process.versions.electron,
  getPlatform: () => process.platform
});
