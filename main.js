import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {

  // --- Utility Functions ---
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
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
    } catch { return fallback; }
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
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('hidden');
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
      if (!profileBtn.contains(e.target)) profileMenu.classList.add('hidden');
    });
    document.querySelectorAll('.spa-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        profileMenu.classList.add('hidden');
        const targetId = link.getAttribute('data-target');
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));
        const targetView = document.getElementById(targetId);
        if (targetView) targetView.classList.remove('hidden');
        const allNavs = document.querySelectorAll('.sidebar-nav a[data-target], .sidebar-footer a[data-target]');
        allNavs.forEach(nav => nav.classList.remove('active'));
        const match = document.querySelector(`.sidebar-nav a[data-target="${targetId}"], .sidebar-footer a[data-target="${targetId}"]`);
        if (match) match.classList.add('active');
        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      });
    });
  }

  // --- Tab filter buttons ---
  document.querySelectorAll('.tab-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');
      document.querySelectorAll('#reports-table-body tr[data-status]').forEach(row => {
        row.style.display = (filter === 'all' || row.getAttribute('data-status') === filter) ? '' : 'none';
      });
    });
  });

  // --- Theme Colors ---
  const colors = {
    green: '#059669', greenLight: '#6ee7b7', red: '#ef4444',
    orange: '#f59e0b', blue: '#2563eb', textMain: '#0f172a', textMuted: '#64748b'
  };

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = colors.textMuted;
  }

  // --- Chart Instances ---
  let districtChartInstance = null;
  let violationChartInstance = null;
  let zoneChartInstance = null;
  let fleetChartInstance = null;

  const distEl = document.getElementById('districtChart');
  if (distEl) {
    districtChartInstance = new Chart(distEl.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Reports', data: [], backgroundColor: colors.green, borderRadius: 4, barPercentage: 0.6 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
    });
  }

  const violEl = document.getElementById('violationChart');
  if (violEl) {
    violationChartInstance = new Chart(violEl.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: [colors.red, colors.orange, colors.green, colors.blue, colors.textMuted], borderWidth: 0, hoverOffset: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } } } }
    });
  }

  const zoneEl = document.getElementById('zoneChart');
  if (zoneEl) {
    zoneChartInstance = new Chart(zoneEl.getContext('2d'), {
      type: 'line',
      data: { labels: [], datasets: [{ label: 'Reports', data: [], borderColor: colors.green, backgroundColor: 'rgba(5, 150, 105, 0.1)', fill: true, tension: 0.4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' } }, x: { grid: { display: false } } } }
    });
  }

  const fleetEl = document.getElementById('fleetChart');
  if (fleetEl) {
    fleetChartInstance = new Chart(fleetEl.getContext('2d'), {
      type: 'bar',
      data: { labels: [], datasets: [{ label: 'Count', data: [], backgroundColor: [colors.orange, colors.green, colors.blue], borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } } }
    });
  }

  // --- Leaflet Maps ---
  const defaultCenter = [28.366, 77.540];

  // Dashboard mini-map
  let dashboardMap = null;
  const mapEl = document.getElementById('cityMap');
  if (mapEl) {
    dashboardMap = L.map('cityMap', { zoomControl: false }).setView(defaultCenter, 13);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
    }).addTo(dashboardMap);
    L.control.zoom({ position: 'bottomright' }).addTo(dashboardMap);
  }

  // Full City Map
  let fullMap = null;
  let fullMapMarkers = null;
  let heatMode = false;
  let heatLayer = null;
  const heatLayerData = [];

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

    const btnStreet = document.getElementById('btnStreet');
    const btnSatellite = document.getElementById('btnSatellite');
    const btnHeatmap = document.getElementById('btnHeatmap');

    if (btnStreet) btnStreet.addEventListener('click', (e) => {
      fullMap.removeLayer(satelliteLayer); fullMap.addLayer(streetLayer);
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
    });
    if (btnSatellite) btnSatellite.addEventListener('click', (e) => {
      fullMap.removeLayer(streetLayer); fullMap.addLayer(satelliteLayer);
      document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active')); e.target.classList.add('active');
    });
    if (btnHeatmap && typeof L.heatLayer !== 'undefined') {
      btnHeatmap.addEventListener('click', (e) => {
        heatMode = !heatMode;
        if (heatMode) {
          heatLayer = L.heatLayer(heatLayerData, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'lime', 1: 'red' } });
          fullMap.addLayer(heatLayer); fullMap.removeLayer(fullMapMarkers); e.target.classList.add('active');
        } else {
          if (heatLayer) fullMap.removeLayer(heatLayer);
          fullMap.addLayer(fullMapMarkers); e.target.classList.remove('active');
        }
      });
    }
  }

  // --- Map icon helper ---
  const createDotIcon = (color) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });

  const icons = {
    high: createDotIcon(colors.red),
    pending: createDotIcon(colors.orange),
    investigating: createDotIcon(colors.blue),
    resolved: createDotIcon(colors.green)
  };

  // ============================================================
  // MAIN DATA LOADING — fetch from Firestore and populate everything
  // ============================================================
  const loadAllData = async () => {
    let reports = [];

    try {
      const querySnapshot = await getDocs(collection(db, "complaints"));
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const d = doc.data();
          reports.push({
            id: doc.id,
            address: d.address || d.location || 'Unknown',
            description: d.description || '',
            severity: d.severity || 'Medium',
            status: d.status || 'pending',
            latitude: d.lat || d.latitude || null,
            longitude: d.lng || d.longitude || null,
            timestamp: d.timestamp || d.createdAt || Date.now(),
            image: d.image || d.imageUrl || ''
          });
        });
      }
    } catch (err) {
      console.warn("Firestore unavailable, using empty data:", err.message);
    }

    const sorted = [...reports].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending').length;
    const verified = reports.filter(r => r.status === 'verified').length;
    const planted = reports.filter(r => r.status === 'planted').length;
    const high = reports.filter(r => r.severity === 'High').length;
    const medium = reports.filter(r => r.severity === 'Medium').length;
    const accessible = reports.filter(r => r.severity === 'Low').length;

    // --- Update stat cards ---
    updateEl('stat-total', total);
    updateEl('stat-pending', pending);
    updateEl('stat-verified', verified);
    updateEl('stat-planted', planted);
    updateEl('stat-registry-total', total);
    updateEl('stat-critical', high);
    updateEl('stat-medium', medium);
    updateEl('stat-accessible', accessible);
    updateEl('notification-badge', pending);
    updateEl('qsTotal', total);
    updateEl('qsHighRisk', high);

    // --- Update Charts ---
    // District chart — group by address
    if (districtChartInstance) {
      const districtMap = {};
      reports.forEach(r => { const key = r.address.split(',')[0] || 'Unknown'; districtMap[key] = (districtMap[key] || 0) + 1; });
      const entries = Object.entries(districtMap).sort((a, b) => b[1] - a[1]).slice(0, 8);
      districtChartInstance.data.labels = entries.map(e => e[0]);
      districtChartInstance.data.datasets[0].data = entries.map(e => e[1]);
      districtChartInstance.update();
    }

    // Severity doughnut
    if (violationChartInstance) {
      const sevCounts = { High: 0, Medium: 0, Low: 0 };
      reports.forEach(r => { sevCounts[r.severity] = (sevCounts[r.severity] || 0) + 1; });
      violationChartInstance.data.labels = Object.keys(sevCounts);
      violationChartInstance.data.datasets[0].data = Object.values(sevCounts);
      violationChartInstance.update();
    }

    // Timeline chart
    if (zoneChartInstance) {
      const monthMap = {};
      reports.forEach(r => {
        const d = new Date(r.timestamp);
        const key = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        monthMap[key] = (monthMap[key] || 0) + 1;
      });
      const mEntries = Object.entries(monthMap).slice(-7);
      zoneChartInstance.data.labels = mEntries.map(e => e[0]);
      zoneChartInstance.data.datasets[0].data = mEntries.map(e => e[1]);
      zoneChartInstance.update();
    }

    // Status bar chart
    if (fleetChartInstance) {
      fleetChartInstance.data.labels = ['Pending', 'Verified', 'Planted'];
      fleetChartInstance.data.datasets[0].data = [pending, verified, planted];
      fleetChartInstance.update();
    }

    // --- Reports Table ---
    const tbody = document.getElementById('reports-table-body');
    if (tbody) {
      if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No reports found.</td></tr>';
      } else {
        tbody.innerHTML = '';
        sorted.forEach(report => {
          const safeId = escapeHtml(report.id.substring(0, 7).toUpperCase());
          const safeAddr = escapeHtml(report.address);
          const safeSev = escapeHtml(report.severity);
          const safeStatus = escapeHtml(report.status);
          const statusClass = sanitizeClassToken(report.status, 'pending');
          const imgSrc = getSafeImageUrl(report.image, 'assets/violation1.png');
          const dateStr = formatDate(report.timestamp);
          const tr = document.createElement('tr');
          tr.setAttribute('data-status', report.status);
          tr.innerHTML = `
            <td><strong>#${safeId}</strong></td>
            <td><div class="visual-log"><img src="${escapeHtml(imgSrc)}" alt="Evidence" onerror="this.style.display='none'" /></div></td>
            <td><div class="td-content"><span class="td-title">${safeAddr}</span></div></td>
            <td><div class="td-content"><span class="td-title">${dateStr}</span></div></td>
            <td><span class="badge-status status-${statusClass}">${safeSev}</span></td>
            <td><span class="badge-status status-${statusClass}">${safeStatus}</span></td>
            <td><div class="action-buttons">
              <button class="btn btn-outline" title="Review"><i class="ph ph-eye"></i></button>
              <button class="btn btn-outline" title="Assign"><i class="ph ph-user-plus"></i></button>
            </div></td>`;
          tbody.appendChild(tr);
        });
      }
    }

    // --- Dashboard mini-map markers ---
    if (dashboardMap) {
      const alertIcon = createDotIcon(colors.red);
      reports.forEach(r => {
        if (r.latitude && r.longitude) {
          L.marker([r.latitude, r.longitude], { icon: alertIcon })
            .addTo(dashboardMap)
            .bindPopup(`<b>${escapeHtml(r.id.substring(0,5).toUpperCase())}</b><br>${escapeHtml(r.description || 'Report submitted')}`);
        }
      });
      const validCoords = reports.filter(r => r.latitude && r.longitude);
      if (validCoords.length > 0) {
        const bounds = validCoords.map(r => [r.latitude, r.longitude]);
        dashboardMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
      }
    }

    // --- Full map markers ---
    if (fullMap && fullMapMarkers) {
      const bounds = [];
      reports.forEach(r => {
        if (r.latitude && r.longitude) {
          const sevKey = r.severity === 'High' ? 'high' : r.status === 'pending' ? 'pending' : r.status === 'verified' ? 'investigating' : 'resolved';
          const marker = L.marker([r.latitude, r.longitude], { icon: icons[sevKey] || icons.pending });
          const statusClass = sanitizeClassToken(r.status, 'pending');
          const imgSrc = escapeHtml(getSafeImageUrl(r.image, 'assets/violation1.png'));
          marker.bindPopup(`
            <div class="popup-header">
              <span class="popup-id">${escapeHtml(r.id.substring(0,7).toUpperCase())}</span>
              <span class="popup-status ${statusClass}">${escapeHtml(r.status)}</span>
            </div>
            <img src="${imgSrc}" class="popup-image" alt="Evidence" onerror="this.src='https://placehold.co/240x120?text=No+Image'" />
            <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>${escapeHtml(r.severity)}</span></div>
            <div class="popup-detail"><i class="ph ph-map-pin"></i> <span>${escapeHtml(r.address)}</span></div>
          `, { className: 'custom-popup' });
          fullMapMarkers.addLayer(marker);
          heatLayerData.push([r.latitude, r.longitude, r.severity === 'High' ? 1 : 0.5]);
          bounds.push([r.latitude, r.longitude]);
        }
      });
      if (bounds.length > 0) fullMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }

    // --- Recent Activity ---
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
              <p>${escapeHtml(report.address)}</p>
              <span class="time">${timeAgo.toUpperCase()}</span>
            </div>`;
          activityList.appendChild(card);
        });
      }
    }

    // --- Notifications Page ---
    const notifList = document.getElementById('notifications-list');
    if (notifList) {
      if (reports.length === 0) {
        notifList.innerHTML = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No activity yet.</div>';
      } else {
        notifList.innerHTML = '';
        sorted.forEach(report => {
          const timeAgo = formatTimeAgo(report.timestamp);
          const isPending = report.status === 'pending';
          const card = document.createElement('div');
          card.className = 'img-notif-card';
          card.innerHTML = `
            <div class="img-notif-icon ${isPending ? 'light-yellow' : 'light-green'}">
              <i class="ph ph-${isPending ? 'hourglass' : 'check'}"></i>
            </div>
            <div class="img-notif-content">
              <h4>${isPending ? 'Report Submitted' : 'Report Verified'} — ${escapeHtml(report.severity || '')}</h4>
              <p>${escapeHtml(report.address)}</p>
              <p style="font-size:11px;margin-top:4px;">${escapeHtml(report.description || '').substring(0, 80)}${(report.description || '').length > 80 ? '...' : ''}</p>
              <span class="time">${timeAgo.toUpperCase()}</span>
            </div>`;
          notifList.appendChild(card);
        });
      }
    }
  };

  // --- Kick off data loading ---
  loadAllData();

});
