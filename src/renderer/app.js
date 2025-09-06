// PlayNexus Port Visualizer - Main Application Logic
class PortVisualizerApp {
  constructor() {
    this.currentResults = null;
    this.scanInProgress = false;
    this.scanStartTime = null;
    this.progressInterval = null;
    this.networkMap = null;
    this.settings = {
      timeout: 5000,
      threads: 50,
      theme: 'dark',
      saveHistory: true
    };
    
    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.setupMenuListeners();
    this.setupProgressListeners();
    await this.loadSettings();
    await this.loadNetworkInterfaces();
    this.applyTheme();
  }

  setupEventListeners() {
    // Scan tab switching
    document.querySelectorAll('.scan-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchScanTab(tab.dataset.tab);
      });
    });

    // Port range selection
    document.querySelectorAll('input[name="portRange"]').forEach(radio => {
      radio.addEventListener('change', () => {
        this.toggleCustomPorts(radio.value === 'custom');
      });
    });

    // Scan controls
    document.getElementById('startPortScanBtn').addEventListener('click', () => {
      this.startPortScan();
    });

    document.getElementById('startDiscoveryBtn').addEventListener('click', () => {
      this.startNetworkDiscovery();
    });

    document.getElementById('startPingBtn').addEventListener('click', () => {
      this.startPing();
    });

    document.getElementById('stopScanBtn').addEventListener('click', () => {
      this.stopScan();
    });

    document.getElementById('stopDiscoveryBtn').addEventListener('click', () => {
      this.stopScan();
    });

    // Network interface detection
    document.getElementById('detectSubnetBtn').addEventListener('click', () => {
      this.detectSubnet();
    });

    // Results tab switching
    document.querySelectorAll('.results-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchResultsTab(tab.dataset.tab);
      });
    });

    // Results actions
    document.getElementById('exportBtn').addEventListener('click', () => {
      this.exportResults();
    });

    document.getElementById('visualizeBtn').addEventListener('click', () => {
      this.switchResultsTab('visualization');
    });

    document.getElementById('newScanBtn').addEventListener('click', () => {
      this.newScan();
    });

    // Settings modal
    document.getElementById('settingsBtn').addEventListener('click', () => {
      this.showSettings();
    });

    document.getElementById('closeSettings').addEventListener('click', () => {
      this.hideSettings();
    });

    document.getElementById('saveSettings').addEventListener('click', () => {
      this.saveSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Help modal
    document.getElementById('helpBtn').addEventListener('click', () => {
      this.showHelp();
    });

    document.getElementById('closeHelp').addEventListener('click', () => {
      this.hideHelp();
    });

    // Table filtering and sorting
    document.getElementById('hostsFilter').addEventListener('input', (e) => {
      this.filterHosts(e.target.value);
    });

    document.getElementById('portsFilter').addEventListener('input', (e) => {
      this.filterPorts(e.target.value);
    });

    document.getElementById('portsStateFilter').addEventListener('change', (e) => {
      this.filterPortsByState(e.target.value);
    });

    // Visualization controls
    document.getElementById('layoutBtn')?.addEventListener('click', () => {
      this.changeNetworkLayout();
    });

    document.getElementById('zoomFitBtn')?.addEventListener('click', () => {
      this.zoomToFit();
    });

    // Modal close on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Enter key handlers
    document.getElementById('targetInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startPortScan();
    });

    document.getElementById('subnetInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startNetworkDiscovery();
    });

    document.getElementById('pingTargetInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.startPing();
    });
  }

  setupMenuListeners() {
    if (window.electronAPI) {
      window.electronAPI.onMenuNewScan(() => {
        this.newScan();
      });

      window.electronAPI.onMenuQuickScan(() => {
        this.quickScan();
      });

      window.electronAPI.onMenuFullScan(() => {
        this.fullScan();
      });

      window.electronAPI.onMenuSettings(() => {
        this.showSettings();
      });

      window.electronAPI.onExportResults((event, filePath) => {
        this.exportToFile(filePath);
      });

      window.electronAPI.onHistoryCleared(() => {
        this.clearResultsDisplay();
      });
    }
  }

  setupProgressListeners() {
    if (window.electronAPI) {
      window.electronAPI.onScanProgress((event, progress) => {
        this.updateProgress(progress);
      });

      window.electronAPI.onDiscoveryProgress((event, progress) => {
        this.updateDiscoveryProgress(progress);
      });

      window.electronAPI.onScanStopped(() => {
        this.onScanStopped();
      });
    }
  }

  switchScanTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.scan-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.scan-tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
  }

  switchResultsTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.results-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.results-tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');

    // Initialize visualization if needed
    if (tabName === 'visualization' && this.currentResults) {
      this.initNetworkVisualization();
    }
  }

  toggleCustomPorts(show) {
    const customPortsGroup = document.getElementById('customPortsGroup');
    customPortsGroup.style.display = show ? 'block' : 'none';
  }

  async startPortScan() {
    const target = document.getElementById('targetInput').value.trim();
    
    if (!target) {
      this.showError('Please enter a target IP address or hostname');
      return;
    }

    if (!this.isValidTarget(target)) {
      this.showError('Please enter a valid IP address or hostname');
      return;
    }

    const portRange = document.querySelector('input[name="portRange"]:checked').value;
    const customPorts = document.getElementById('customPorts').value;

    const options = {
      timeout: this.settings.timeout,
      threads: this.settings.threads,
      commonPorts: portRange === 'common',
      allPorts: portRange === 'all',
      customPorts: portRange === 'custom' ? customPorts : null
    };

    this.startScan('Port Scan', target);

    try {
      const result = await window.electronAPI.scanPorts(target, options);
      
      if (result.success) {
        this.currentResults = result;
        this.displayPortScanResults(result);
      } else {
        this.showError(result.error || 'Port scan failed');
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
    } finally {
      this.stopScan();
    }
  }

  async startNetworkDiscovery() {
    const subnet = document.getElementById('subnetInput').value.trim();
    
    if (!subnet) {
      this.showError('Please enter a subnet in CIDR notation (e.g., 192.168.1.0/24)');
      return;
    }

    if (!this.isValidSubnet(subnet)) {
      this.showError('Please enter a valid subnet in CIDR notation');
      return;
    }

    this.startScan('Network Discovery', subnet);

    try {
      const result = await window.electronAPI.discoverNetwork(subnet);
      
      if (result.success) {
        this.currentResults = result;
        this.displayNetworkDiscoveryResults(result);
      } else {
        this.showError(result.error || 'Network discovery failed');
      }
    } catch (error) {
      this.showError('Network error: ' + error.message);
    } finally {
      this.stopScan();
    }
  }

  async startPing() {
    const target = document.getElementById('pingTargetInput').value.trim();
    
    if (!target) {
      this.showError('Please enter a target IP address or hostname');
      return;
    }

    try {
      const result = await window.electronAPI.pingHost(target);
      this.displayPingResult(result);
    } catch (error) {
      this.showError('Ping failed: ' + error.message);
    }
  }

  startScan(type, target) {
    this.scanInProgress = true;
    this.scanStartTime = Date.now();
    
    // Update UI
    document.getElementById('progressTitle').textContent = `${type}: ${target}`;
    document.getElementById('progressSection').classList.remove('hidden');
    document.getElementById('stopScanBtn').disabled = false;
    document.getElementById('stopDiscoveryBtn').disabled = false;
    
    // Disable scan buttons
    document.getElementById('startPortScanBtn').disabled = true;
    document.getElementById('startDiscoveryBtn').disabled = true;
    document.getElementById('startPingBtn').disabled = true;

    // Start progress timer
    this.progressInterval = setInterval(() => {
      this.updateScanTime();
    }, 1000);
  }

  async stopScan() {
    if (window.electronAPI) {
      await window.electronAPI.stopScan();
    }
    this.onScanStopped();
  }

  onScanStopped() {
    this.scanInProgress = false;
    
    // Clear progress timer
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    // Update UI
    document.getElementById('progressSection').classList.add('hidden');
    document.getElementById('stopScanBtn').disabled = true;
    document.getElementById('stopDiscoveryBtn').disabled = true;
    
    // Enable scan buttons
    document.getElementById('startPortScanBtn').disabled = false;
    document.getElementById('startDiscoveryBtn').disabled = false;
    document.getElementById('startPingBtn').disabled = false;
  }

  updateProgress(progress) {
    const percentage = Math.round((progress.completed / progress.total) * 100);
    
    document.getElementById('progressText').textContent = 
      `${progress.completed} / ${progress.total} (${percentage}%)`;
    document.getElementById('progressFill').style.width = `${percentage}%`;
    
    if (progress.found !== undefined) {
      document.getElementById('foundCount').textContent = progress.found;
    }
    
    // Calculate scan rate
    const elapsed = (Date.now() - this.scanStartTime) / 1000;
    const rate = Math.round(progress.completed / elapsed);
    document.getElementById('scanRate').textContent = `${rate}/s`;
  }

  updateDiscoveryProgress(progress) {
    this.updateProgress(progress);
    document.getElementById('foundCount').textContent = progress.found;
  }

  updateScanTime() {
    if (!this.scanStartTime) return;
    
    const elapsed = Math.floor((Date.now() - this.scanStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    
    document.getElementById('progressTime').textContent = 
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  displayPortScanResults(result) {
    this.showResults();
    
    // Update summary
    document.getElementById('resultsTitle').textContent = `Port Scan Results - ${result.target}`;
    document.getElementById('totalHostsFound').textContent = '1';
    document.getElementById('totalOpenPorts').textContent = result.openPorts.length;
    document.getElementById('scanDuration').textContent = `${Math.round(result.scanTime / 1000)}s`;

    // Display hosts (single target)
    this.displayHostsTable([{
      ip: result.target,
      hostname: result.target,
      openPorts: result.openPorts.length,
      status: 'scanned'
    }]);

    // Display ports
    this.displayPortsTable([...result.openPorts, ...result.closedPorts, ...result.filteredPorts]);

    // Display services
    this.displayServicesChart(result.openPorts);
  }

  displayNetworkDiscoveryResults(result) {
    this.showResults();
    
    // Update summary
    document.getElementById('resultsTitle').textContent = `Network Discovery - ${result.subnet}`;
    document.getElementById('totalHostsFound').textContent = result.hosts.length;
    document.getElementById('totalOpenPorts').textContent = '-';
    document.getElementById('scanDuration').textContent = `${Math.round(result.scanTime / 1000)}s`;

    // Display hosts
    this.displayHostsTable(result.hosts);

    // Switch to hosts tab
    this.switchResultsTab('hosts');
  }

  displayPingResult(result) {
    const message = result.alive 
      ? `✅ ${result.host} is reachable (${result.responseTime}ms)`
      : `❌ ${result.host} is not reachable`;
    
    // Show result in a temporary notification or update UI
    this.showNotification(message, result.alive ? 'success' : 'error');
  }

  displayHostsTable(hosts) {
    const table = document.getElementById('hostsTable');
    
    let html = `
      <div class="table-header hosts-table-row">
        <div>IP Address</div>
        <div>Hostname</div>
        <div>Open Ports</div>
        <div>Response Time</div>
        <div>Status</div>
      </div>
    `;

    hosts.forEach(host => {
      html += `
        <div class="table-row hosts-table-row">
          <div>${this.escapeHtml(host.ip)}</div>
          <div>${this.escapeHtml(host.hostname || host.ip)}</div>
          <div>${host.openPorts || 0}</div>
          <div>${host.responseTime ? host.responseTime + 'ms' : '-'}</div>
          <div><span class="port-state ${host.status}">${host.status}</span></div>
        </div>
      `;
    });

    table.innerHTML = html;
  }

  displayPortsTable(ports) {
    const table = document.getElementById('portsTable');
    
    let html = `
      <div class="table-header ports-table-row">
        <div>Port</div>
        <div>Service</div>
        <div>State</div>
        <div>Protocol</div>
      </div>
    `;

    ports.forEach(port => {
      html += `
        <div class="table-row ports-table-row">
          <div>${port.port}</div>
          <div>${this.escapeHtml(port.service || 'Unknown')}</div>
          <div><span class="port-state ${port.state}">${port.state}</span></div>
          <div>TCP</div>
        </div>
      `;
    });

    table.innerHTML = html;
  }

  displayServicesChart(openPorts) {
    const canvas = document.createElement('canvas');
    const container = document.getElementById('servicesChart');
    container.innerHTML = '';
    container.appendChild(canvas);

    // Count services
    const serviceCounts = {};
    openPorts.forEach(port => {
      const service = port.service || 'Unknown';
      serviceCounts[service] = (serviceCounts[service] || 0) + 1;
    });

    const labels = Object.keys(serviceCounts);
    const data = Object.values(serviceCounts);

    new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#00d4ff', '#28a745', '#ffc107', '#dc3545', '#17a2b8',
            '#6f42c1', '#fd7e14', '#20c997', '#e83e8c', '#6c757d'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#ffffff'
            }
          }
        }
      }
    });
  }

  initNetworkVisualization() {
    if (!this.currentResults || !window.vis) return;

    const container = document.getElementById('networkMap');
    const nodes = new vis.DataSet();
    const edges = new vis.DataSet();

    // Add nodes based on results type
    if (this.currentResults.hosts) {
      // Network discovery results
      this.currentResults.hosts.forEach((host, index) => {
        nodes.add({
          id: index,
          label: host.hostname || host.ip,
          title: `${host.ip}\nResponse: ${host.responseTime}ms`,
          color: { background: '#00d4ff', border: '#0099cc' }
        });
      });
    } else if (this.currentResults.target) {
      // Port scan results
      nodes.add({
        id: 0,
        label: this.currentResults.target,
        title: `${this.currentResults.openPorts.length} open ports`,
        color: { background: '#00d4ff', border: '#0099cc' }
      });

      // Add port nodes
      this.currentResults.openPorts.forEach((port, index) => {
        nodes.add({
          id: index + 1,
          label: `${port.port}\n${port.service}`,
          title: `Port ${port.port} - ${port.service}`,
          color: { background: '#28a745', border: '#1e7e34' },
          shape: 'box'
        });

        edges.add({
          from: 0,
          to: index + 1,
          color: { color: '#28a745' }
        });
      });
    }

    const data = { nodes: nodes, edges: edges };
    const options = {
      nodes: {
        font: { color: '#ffffff' }
      },
      edges: {
        font: { color: '#ffffff' }
      },
      physics: {
        enabled: true,
        stabilization: { iterations: 100 }
      }
    };

    this.networkMap = new vis.Network(container, data, options);
  }

  async detectSubnet() {
    try {
      const result = await window.electronAPI.getNetworkInterfaces();
      
      if (result.success && result.interfaces.length > 0) {
        // Use the first non-loopback interface
        const iface = result.interfaces[0];
        document.getElementById('subnetInput').value = iface.cidr;
      } else {
        this.showError('No network interfaces found');
      }
    } catch (error) {
      this.showError('Failed to detect network interfaces: ' + error.message);
    }
  }

  async loadNetworkInterfaces() {
    // Populate network interface dropdown if needed
    try {
      const result = await window.electronAPI.getNetworkInterfaces();
      // Store interfaces for later use
      this.networkInterfaces = result.success ? result.interfaces : [];
    } catch (error) {
      console.warn('Failed to load network interfaces:', error);
    }
  }

  showResults() {
    document.getElementById('noResults').classList.add('hidden');
    document.getElementById('resultsContent').classList.remove('hidden');
  }

  newScan() {
    // Clear inputs
    document.getElementById('targetInput').value = '';
    document.getElementById('subnetInput').value = '';
    document.getElementById('pingTargetInput').value = '';
    
    // Hide results
    document.getElementById('noResults').classList.remove('hidden');
    document.getElementById('resultsContent').classList.add('hidden');
    
    // Reset progress
    document.getElementById('progressSection').classList.add('hidden');
    
    this.currentResults = null;
  }

  quickScan() {
    document.querySelector('input[name="portRange"][value="common"]').checked = true;
    this.toggleCustomPorts(false);
  }

  fullScan() {
    document.querySelector('input[name="portRange"][value="all"]').checked = true;
    this.toggleCustomPorts(false);
  }

  filterHosts(query) {
    const rows = document.querySelectorAll('#hostsTable .table-row:not(.table-header)');
    const lowerQuery = query.toLowerCase();

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(lowerQuery) ? 'grid' : 'none';
    });
  }

  filterPorts(query) {
    const rows = document.querySelectorAll('#portsTable .table-row:not(.table-header)');
    const lowerQuery = query.toLowerCase();

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(lowerQuery) ? 'grid' : 'none';
    });
  }

  filterPortsByState(state) {
    const rows = document.querySelectorAll('#portsTable .table-row:not(.table-header)');

    rows.forEach(row => {
      if (state === 'all') {
        row.style.display = 'grid';
      } else {
        const stateSpan = row.querySelector('.port-state');
        const portState = stateSpan ? stateSpan.className.split(' ')[1] : '';
        row.style.display = portState === state ? 'grid' : 'none';
      }
    });
  }

  showSettings() {
    // Populate current settings
    document.getElementById('timeoutSetting').value = this.settings.timeout;
    document.getElementById('threadsSetting').value = this.settings.threads;
    document.getElementById('themeSetting').value = this.settings.theme;
    document.getElementById('saveHistorySetting').checked = this.settings.saveHistory;
    
    document.getElementById('settingsModal').classList.remove('hidden');
  }

  hideSettings() {
    document.getElementById('settingsModal').classList.add('hidden');
  }

  async saveSettings() {
    this.settings = {
      timeout: parseInt(document.getElementById('timeoutSetting').value),
      threads: parseInt(document.getElementById('threadsSetting').value),
      theme: document.getElementById('themeSetting').value,
      saveHistory: document.getElementById('saveHistorySetting').checked
    };

    if (window.electronAPI) {
      await window.electronAPI.saveSettings(this.settings);
    }

    this.applyTheme();
    this.hideSettings();
  }

  resetSettings() {
    this.settings = {
      timeout: 5000,
      threads: 50,
      theme: 'dark',
      saveHistory: true
    };

    this.showSettings();
  }

  async loadSettings() {
    if (window.electronAPI) {
      const result = await window.electronAPI.loadSettings();
      if (result.success) {
        this.settings = { ...this.settings, ...result.settings };
      }
    }
  }

  applyTheme() {
    document.body.setAttribute('data-theme', this.settings.theme);
  }

  showHelp() {
    document.getElementById('helpModal').classList.remove('hidden');
  }

  hideHelp() {
    document.getElementById('helpModal').classList.add('hidden');
  }

  exportResults() {
    if (!this.currentResults) {
      this.showError('No results to export');
      return;
    }

    const dataStr = JSON.stringify(this.currentResults, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `port-scan-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '1rem 1.5rem',
      borderRadius: '8px',
      color: 'white',
      fontWeight: '500',
      zIndex: '9999',
      maxWidth: '400px',
      backgroundColor: type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'
    });

    document.body.appendChild(notification);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  // Utility methods
  isValidTarget(target) {
    // Basic validation for IP addresses and hostnames
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
    
    return ipRegex.test(target) || hostnameRegex.test(target);
  }

  isValidSubnet(subnet) {
    const parts = subnet.split('/');
    if (parts.length !== 2) return false;
    
    const ip = parts[0];
    const cidr = parseInt(parts[1]);
    
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    return ipRegex.test(ip) && cidr >= 0 && cidr <= 32;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  changeNetworkLayout() {
    if (this.networkMap) {
      this.networkMap.setOptions({
        layout: {
          randomSeed: Math.random()
        }
      });
    }
  }

  zoomToFit() {
    if (this.networkMap) {
      this.networkMap.fit();
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PortVisualizerApp();
});
