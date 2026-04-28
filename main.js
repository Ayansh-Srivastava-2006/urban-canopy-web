import { realtimeDb } from './firebase-config.js';
import { ref, onValue } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

document.addEventListener('DOMContentLoaded', () => {

  // --- Utility Functions ---
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));

  const sanitizeClassToken = (value, fallback = 'pending') => {
    const token = String(value ?? '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    return token || fallback;
  };

  const getSafeImageUrl = (value, fallback = 'assets/violation1.png') => {
    const raw = String(value ?? '').trim();
    if (!raw) return fallback;
    try {
      const parsed = new URL(raw, window.location.href);
      return (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : fallback;
    } catch {
      return fallback;
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const updateEl = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = typeof value === 'number' ? value.toLocaleString() : value;
  };

  // --- SPA Navigation Logic ---
  const navItems = document.querySelectorAll('.sidebar-nav a[data-target], .sidebar-footer a[data-target]');
  const views = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');
      const targetId = item.getAttribute('data-target');
      views.forEach(v => v.classList.add('hidden'));
      document.getElementById(targetId).classList.remove('hidden');
      setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
    });
  });

  const topBellIcon = document.querySelector('.header-actions .action-icon.has-badge');
  if (topBellIcon) {
    topBellIcon.addEventListener('click', () => {
      const notifNav = document.querySelector('.sidebar-nav a[data-target="view-notifications"]');
      if (notifNav) notifNav.click();
    });
  }

  // --- Profile Dropdown Logic ---
  const profileBtn = document.getElementById('profileDropdownBtn');
  const profileMenu = document.getElementById('profileDropdownMenu');

  if (profileBtn && profileMenu) {
    profileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!profileBtn.contains(e.target)) {
        profileMenu.classList.add('hidden');
      }
    });

    const spaLinks = document.querySelectorAll('.spa-link');
    spaLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        profileMenu.classList.add('hidden');
        const targetId = link.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(targetId);
        if (targetView) targetView.classList.remove('hidden');
        const allNavs = document.querySelectorAll('.sidebar-nav a[data-target], .sidebar-footer a[data-target]');
        allNavs.forEach(nav => nav.classList.remove('active'));
        const matchingSidebar = document.querySelector(`.sidebar-nav a[data-target="${targetId}"], .sidebar-footer a[data-target="${targetId}"]`);
        if (matchingSidebar) matchingSidebar.classList.add('active');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      });
    });
  }

  // --- Theme Colors ---
  const colors = {
    green: '#059669',
    greenLight: '#6ee7b7',
    red: '#ef4444',
    orange: '#f59e0b',
    blue: '#2563eb',
    textMain: '#0f172a',
    textMuted: '#64748b'
  };

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = colors.textMuted;

  // --- Chart Instances (initialized with empty data, updated by RTDB) ---
  let districtChartInstance = null;
  let violationChartInstance = null;
  let zoneChartInstance = null;
  let fleetChartInstance = null;

  const distEl = document.getElementById('districtChart');
  if (distEl) {
    districtChartInstance = new Chart(distEl.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Reports', data: [], backgroundColor: colors.green, borderRadius: 4, barPercentage: 0.6 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f172a', padding: 12, titleFont: { size: 13, weight: 'bold' }, bodyFont: { size: 13 } } },
        scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0', drawBorder: false }, ticks: { stepSize: 1 } }, x: { grid: { display: false, drawBorder: false } } }
      }
    });
  }

  const violEl = document.getElementById('violationChart');
  if (violEl) {
    violationChartInstance = new Chart(violEl.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [colors.red, colors.orange, colors.green, colors.blue, colors.textMuted], borderWidth: 0, hoverOffset: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '75%',
        plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } } }
      }
    });
  }

  const zoneEl = document.getElementById('zoneChart');
  if (zoneEl) {
    zoneChartInstance = new Chart(zoneEl.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Reports', data: [], borderColor: colors.green, backgroundColor: 'rgba(5, 150, 105, 0.1)', fill: true, tension: 0.4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { display: false } } }
      }
    });
  }

  const fleetEl = document.getElementById('fleetChart');
  if (fleetEl) {
    fleetChartInstance = new Chart(fleetEl.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Count', data: [], backgroundColor: [colors.orange, colors.green, colors.blue], borderRadius: 4 }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
      }
    });
  }

  // --- Leaflet Maps (centered on India) ---
  const defaultCenter = [28.366, 77.540];

  // Dashboard mini-map
  let dashboardMap = null;
  let dashboardMarkers = [];
  const mapEl = document.getElementById('cityMap');
  if (mapEl) {
    dashboardMap = L.map('cityMap', { zoomControl: false }).setView(defaultCenter, 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(dashboardMap);
    L.control.zoom({ position: 'bottomright' }).addTo(dashboardMap);
  }

  // Full city map
  let fullMap = null;
  let fullMapMarkers = null;
  let heatLayerData = [];
  let heatLayer = null;
  let heatMode = false;
  const fullMapEl = document.getElementById('fullCityMap');
  if (fullMapEl) {
    const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
    });
    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri', maxZoom: 20
    });

    fullMap = L.map('fullCityMap', { zoomControl: false, layers: [streetLayer] }).setView(defaultCenter, 13);
    L.control.zoom({ position: 'bottomright' }).addTo(fullMap);

    fullMapMarkers = L.markerClusterGroup({ spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true });
    fullMap.addLayer(fullMapMarkers);

    // Layer toggle buttons
    const btnStreet = document.getElementById('btnStreet');
    const btnSatellite = document.getElementById('btnSatellite');
    const btnHeatmap = document.getElementById('btnHeatmap');

    if (btnStreet) {
      btnStreet.addEventListener('click', (e) => {
        fullMap.removeLayer(satelliteLayer);
        fullMap.addLayer(streetLayer);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    }
    if (btnSatellite) {
      btnSatellite.addEventListener('click', (e) => {
        fullMap.removeLayer(streetLayer);
        fullMap.addLayer(satelliteLayer);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    }
    if (btnHeatmap && typeof L.heatLayer !== 'undefined') {
      btnHeatmap.addEventListener('click', (e) => {
        heatMode = !heatMode;
        if (heatMode) {
          heatLayer = L.heatLayer(heatLayerData, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'lime', 1: 'red' } });
          fullMap.addLayer(heatLayer);
          fullMap.removeLayer(fullMapMarkers);
          e.target.classList.add('active');
        } else {
          if (heatLayer) fullMap.removeLayer(heatLayer);
          fullMap.addLayer(fullMapMarkers);
          e.target.classList.remove('active');
        }
      });
    }
  }

  // --- Helper: Create map marker icon by severity ---
  const createDotIcon = (severity) => {
    const color = severity === 'High' ? colors.red : severity === 'Medium' ? colors.orange : colors.green;
    return L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });
  };

  // --- Firebase Realtime Database Listener ---
  const reportsRef = ref(realtimeDb, 'reports');

  onValue(reportsRef, (snapshot) => {
    const data = snapshot.val();
    const reports = data ? Object.values(data) : [];
    const sorted = [...reports].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    // --- 1. Compute Stats ---
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const verified = reports.filter(r => r.status === 'verified').length;
    const planted = reports.filter(r => r.status === 'planted').length;
    const highCount = reports.filter(r => r.severity === 'High').length;
    const mediumCount = reports.filter(r => r.severity === 'Medium').length;
    const accessibleCount = reports.filter(r => r.accessible === true).length;

    // --- 2. Update Dashboard Stat Cards ---
    updateEl('stat-total', total);
    updateEl('stat-pending', pending);
    updateEl('stat-verified', verified);
    updateEl('stat-planted', planted);

    // --- 3. Update Registry Stat Cards ---
    updateEl('stat-registry-total', total);
    updateEl('stat-critical', highCount);
    updateEl('stat-medium', mediumCount);
    updateEl('stat-accessible', accessibleCount);

    // --- 4. Update Notification Badge ---
    updateEl('notification-badge', pending);

    // --- 5. Update Quick Stats (Map Page) ---
    updateEl('qsTotal', total);
    updateEl('qsHighRisk', highCount);

    // --- 6. Update Charts ---

    // Severity doughnut chart
    if (violationChartInstance) {
      const sevCounts = {};
      reports.forEach(r => { const s = r.severity || 'Unknown'; sevCounts[s] = (sevCounts[s] || 0) + 1; });
      violationChartInstance.data.labels = Object.keys(sevCounts);
      violationChartInstance.data.datasets[0].data = Object.values(sevCounts);
      violationChartInstance.update();
    }

    // Location bar chart
    if (districtChartInstance) {
      const locCounts = {};
      reports.forEach(r => {
        const addr = r.address || 'Unknown';
        const parts = addr.split(',');
        const short = parts.length > 1 ? parts[1].trim() : parts[0].trim();
        locCounts[short] = (locCounts[short] || 0) + 1;
      });
      districtChartInstance.data.labels = Object.keys(locCounts);
      districtChartInstance.data.datasets[0].data = Object.values(locCounts);
      districtChartInstance.update();
    }

    // Timeline line chart (group by date)
    if (zoneChartInstance) {
      const dateCounts = {};
      sorted.forEach(r => {
        const d = formatDate(r.timestamp);
        dateCounts[d] = (dateCounts[d] || 0) + 1;
      });
      zoneChartInstance.data.labels = Object.keys(dateCounts);
      zoneChartInstance.data.datasets[0].data = Object.values(dateCounts);
      zoneChartInstance.update();
    }

    // Status bar chart
    if (fleetChartInstance) {
      const statusCounts = { 'Pending': pending, 'Verified': verified, 'Planted': planted };
      fleetChartInstance.data.labels = Object.keys(statusCounts);
      fleetChartInstance.data.datasets[0].data = Object.values(statusCounts);
      fleetChartInstance.update();
    }

    // --- 7. Populate Reports Table ---
    const tableBody = document.getElementById('reports-table-body');
    if (tableBody) {
      if (reports.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No reports found in database.</td></tr>';
      } else {
        tableBody.innerHTML = '';
        sorted.forEach(report => {
          const shortId = report.id ? report.id.substring(0, 8).toUpperCase() : 'N/A';
          const imageUrl = getSafeImageUrl(report.imageUrl);
          const statusClass = sanitizeClassToken(report.status);
          const dateStr = formatDate(report.timestamp);
          const row = document.createElement('tr');
          row.innerHTML = `
            <td><strong>#${escapeHtml(shortId)}</strong></td>
            <td><div class="visual-log"><img src="${escapeHtml(imageUrl)}" alt="Evidence" onerror="this.src='assets/violation1.png'" /></div></td>
            <td><div class="td-content"><span class="td-title">${escapeHtml(report.address || 'Unknown')}</span><span class="td-sub">${escapeHtml(report.violationType || 'N/A')}</span></div></td>
            <td><div class="td-content"><span class="td-title">${dateStr}</span><span class="td-sub">Via Citizen App</span></div></td>
            <td><span class="badge-status status-${statusClass}">${escapeHtml((report.severity || 'N/A'))}</span></td>
            <td><span class="badge-status status-${statusClass}">${escapeHtml((report.status || 'pending'))}</span></td>
            <td><div class="action-buttons"><button class="btn btn-outline" title="Review"><i class="ph ph-eye"></i></button><button class="btn btn-outline" title="Verify"><i class="ph ph-check"></i></button></div></td>
          `;
          tableBody.appendChild(row);
        });
      }
    }

    // --- 8. Update Dashboard Map ---
    if (dashboardMap) {
      dashboardMarkers.forEach(m => dashboardMap.removeLayer(m));
      dashboardMarkers = [];
      const bounds = [];
      reports.forEach(report => {
        if (report.latitude && report.longitude) {
          const icon = createDotIcon(report.severity);
          const marker = L.marker([report.latitude, report.longitude], { icon })
            .addTo(dashboardMap)
            .bindPopup(`<b>${escapeHtml(report.address || 'Report')}</b><br>Severity: ${escapeHtml(report.severity || 'N/A')}<br>Status: ${escapeHtml(report.status || 'pending')}`);
          dashboardMarkers.push(marker);
          bounds.push([report.latitude, report.longitude]);
        }
      });
      if (bounds.length > 0) dashboardMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // --- 9. Update Full City Map ---
    if (fullMap && fullMapMarkers) {
      fullMapMarkers.clearLayers();
      heatLayerData = [];
      const bounds = [];
      reports.forEach(report => {
        if (report.latitude && report.longitude) {
          const icon = createDotIcon(report.severity);
          const safeImage = escapeHtml(getSafeImageUrl(report.imageUrl));
          const safeAddr = escapeHtml(report.address || 'Unknown');
          const safeSeverity = escapeHtml(report.severity || 'N/A');
          const safeStatus = escapeHtml(report.status || 'pending');
          const safeId = escapeHtml(report.id ? report.id.substring(0, 8).toUpperCase() : 'N/A');
          const statusClass = sanitizeClassToken(report.status);

          heatLayerData.push([report.latitude, report.longitude, report.severity === 'High' ? 1 : 0.5]);

          const marker = L.marker([report.latitude, report.longitude], { icon });
          marker.bindPopup(`
            <div class="popup-header">
              <span class="popup-id">${safeId}</span>
              <span class="popup-status ${statusClass}">${safeStatus}</span>
            </div>
            <img src="${safeImage}" class="popup-image" alt="Evidence" onerror="this.src='https://placehold.co/240x120?text=No+Image'" />
            <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>Severity: ${safeSeverity}</span></div>
            <div class="popup-detail"><i class="ph ph-map-pin"></i> <span>${safeAddr}</span></div>
          `, { className: 'custom-popup' });

          fullMapMarkers.addLayer(marker);
          bounds.push([report.latitude, report.longitude]);
        }
      });
      if (bounds.length > 0) fullMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

      // Refresh heatmap if active
      if (heatMode && heatLayer) {
        fullMap.removeLayer(heatLayer);
        heatLayer = L.heatLayer(heatLayerData, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'lime', 1: 'red' } });
        fullMap.addLayer(heatLayer);
      }
    }

    // --- 10. Update Recent Activity (Dashboard) ---
    const activityList = document.getElementById('recent-activity-list');
    if (activityList) {
      if (reports.length === 0) {
        activityList.innerHTML = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No reports yet.</div>';
      } else {
        activityList.innerHTML = '';
        sorted.slice(0, 5).forEach(report => {
          const timeAgo = formatTimeAgo(report.timestamp);
          const iconClass = report.severity === 'High' ? 'light-yellow' : 'light-green';
          const iconPh = report.severity === 'High' ? 'warning' : 'leaf';
          const title = report.status === 'pending' ? 'New Patch Report' : report.status === 'verified' ? 'Patch Verified' : 'Planting Confirmed';
          const card = document.createElement('div');
          card.className = 'img-notif-card';
          card.innerHTML = `
            <div class="img-notif-icon ${iconClass}"><i class="ph ph-${iconPh}"></i></div>
            <div class="img-notif-content">
              <h4>${title} — ${escapeHtml(report.severity || 'N/A')}</h4>
              <p>${escapeHtml(report.address || 'Unknown location')}</p>
              <span class="time">${timeAgo.toUpperCase()}</span>
            </div>
          `;
          activityList.appendChild(card);
        });
      }
    }

    // --- 11. Update Notifications Page ---
    const notifList = document.getElementById('notifications-list');
    if (notifList) {
      if (reports.length === 0) {
        notifList.innerHTML = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No activity yet.</div>';
      } else {
        notifList.innerHTML = '';
        sorted.forEach(report => {
          const timeAgo = formatTimeAgo(report.timestamp);
          const card = document.createElement('div');
          card.className = 'img-notif-card';
          const isPending = report.status === 'pending';
          card.innerHTML = `
            <div class="img-notif-icon ${isPending ? 'light-yellow' : 'light-green'}">
              <i class="ph ph-${isPending ? 'hourglass' : 'check'}"></i>
            </div>
            <div class="img-notif-content">
              <h4>${isPending ? 'Report Submitted' : 'Report Verified'} — ${escapeHtml(report.severity || '')}</h4>
              <p>${escapeHtml(report.address || 'Unknown location')}</p>
              <p style="font-size:11px;margin-top:4px;">${escapeHtml(report.description || '').substring(0, 80)}${(report.description || '').length > 80 ? '...' : ''}</p>
              <span class="time">${timeAgo.toUpperCase()}</span>
            </div>
          `;
          notifList.appendChild(card);
        });
      }
    }

  }, (error) => {
    console.error('Error listening to reports:', error);
  });

});
