import { db } from './firebase-config.js';
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// Urban Canopy — main.js

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

  // =========================================================
  // 1. SPA NAVIGATION — must never crash
  // =========================================================
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

  // Handle initial hash-based navigation
  const initialHash = window.location.hash.replace('#', '');
  if (initialHash) {
    const hashMap = {
      'dashboard': 'view-dashboard',
      'complaints': 'view-complaints',
      'reports': 'view-complaints',
      'map': 'view-map',
      'notifications': 'view-notifications',
      'settings': 'view-settings',
      'profile': 'view-profile'
    };
    const targetId = hashMap[initialHash];
    if (targetId) {
      views.forEach(v => v.classList.add('hidden'));
      const target = document.getElementById(targetId);
      if (target) target.classList.remove('hidden');
      navItems.forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === targetId) nav.classList.add('active');
      });
    }
  }

  // Bell icon → notifications
  const topBellIcon = document.querySelector('.header-actions .action-icon.has-badge');
  if (topBellIcon) {
    topBellIcon.addEventListener('click', () => {
      const notifNav = document.querySelector('.sidebar-nav a[data-target="view-notifications"]');
      if (notifNav) notifNav.click();
    });
  }

  // =========================================================
  // 2. PROFILE DROPDOWN
  // =========================================================
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

  // =========================================================
  // 3. TAB FILTER BUTTONS (reports table)
  // =========================================================
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

  // =========================================================
  // 4. CHARTS (safe — wrapped in typeof check)
  // =========================================================
  const colors = {
    green: '#059669',
    greenLight: '#6ee7b7',
    red: '#ef4444',
    orange: '#f59e0b',
    blue: '#2563eb',
    textMain: '#0f172a',
    textMuted: '#64748b'
  };

  let distChart, violChart, zChart, fChart;

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = colors.textMuted;

    const distEl = document.getElementById('districtChart');
    if (distEl) {
      distChart = new Chart(distEl.getContext('2d'), {
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
      violChart = new Chart(violEl.getContext('2d'), {
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
      zChart = new Chart(zoneEl.getContext('2d'), {
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
      fChart = new Chart(fleetEl.getContext('2d'), {
        type: 'bar',
        data: { labels: [], datasets: [{ label: 'Count', data: [], backgroundColor: [colors.orange, colors.green, colors.blue], borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, grid: { color: '#e2e8f0' }, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
        }
      });
    }
  }

  // =========================================================
  // 5. LEAFLET MAPS SETUP
  // =========================================================
  let dashMap = null;
  let dashMarkerLayer = null;
  let fullMap = null;
  let fullMapMarkers = null;
  let heatLayer = null;
  let heatMode = false;
  
  const createDotIcon = (dotColor) => L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${dotColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [14, 14], iconAnchor: [7, 7]
  });

  const icons = {
    high: createDotIcon(colors.red),
    pending: createDotIcon(colors.orange),
    investigating: createDotIcon(colors.blue),
    resolved: createDotIcon(colors.green)
  };

  if (typeof L !== 'undefined') {
    const mapEl = document.getElementById('cityMap');
    if (mapEl) {
      dashMap = L.map('cityMap', { zoomControl: false }).setView([40.7128, -74.0060], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
      }).addTo(dashMap);
      L.control.zoom({ position: 'bottomright' }).addTo(dashMap);
      dashMarkerLayer = L.layerGroup().addTo(dashMap);
    }

    const fullMapEl = document.getElementById('fullCityMap');
    if (fullMapEl) {
      const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri', maxZoom: 20
      });

      fullMap = L.map('fullCityMap', { zoomControl: false, layers: [streetLayer] }).setView([40.7300, -74.0000], 13);
      L.control.zoom({ position: 'bottomright' }).addTo(fullMap);
      fullMapMarkers = L.markerClusterGroup({ spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true });
      fullMap.addLayer(fullMapMarkers);

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
          // Note: heatLayerData is maintained below in the data rendering function
          if (heatMode && window.currentHeatLayerData) {
            heatLayer = L.heatLayer(window.currentHeatLayerData, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'lime', 1: 'red' } });
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
  }

  // =========================================================
  // 6. REALTIME FIREBASE DATA INTEGRATION
  // =========================================================
  const renderData = (reports) => {
    // Basic stats
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'pending' || !r.status).length;
    const verified = reports.filter(r => r.status === 'verified').length;
    const resolved = reports.filter(r => r.status === 'resolved' || r.status === 'planted').length;
    const high = reports.filter(r => r.severity === 'High').length;
    const medium = reports.filter(r => r.severity === 'Medium').length;
    const low = reports.filter(r => r.severity === 'Low').length;

    // Update Dashboard DOM elements
    updateEl('stat-total', total);
    updateEl('stat-pending', pending);
    updateEl('stat-verified', verified);
    updateEl('stat-planted', resolved);
    updateEl('notification-badge', pending > 0 ? pending : '');
    
    // Update Central Registry stats
    updateEl('stat-registry-total', total);
    updateEl('stat-critical', high);
    updateEl('stat-medium', medium);
    updateEl('stat-accessible', low);
    
    // Map stats
    updateEl('qsTotal', total);
    updateEl('qsHighRisk', high);

    // Update Charts
    if (distChart) {
      const locationMap = {};
      reports.forEach(r => { const key = r.address ? r.address.split(',')[0] : 'Unknown'; locationMap[key] = (locationMap[key] || 0) + 1; });
      const entries = Object.entries(locationMap).sort((a,b) => b[1]-a[1]).slice(0,6);
      distChart.data.labels = entries.map(e => e[0]);
      distChart.data.datasets[0].data = entries.map(e => e[1]);
      distChart.update();
    }
    if (violChart) {
      violChart.data.labels = ['High', 'Medium', 'Low'];
      violChart.data.datasets[0].data = [high, medium, low];
      violChart.update();
    }
    if (zChart) {
      // Very basic timeline simulation since we only have raw timestamps
      const timeline = {};
      reports.forEach(r => {
        const d = r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-US', {month:'short', day:'numeric'}) : 'N/A';
        timeline[d] = (timeline[d] || 0) + 1;
      });
      const entries = Object.entries(timeline).slice(-7);
      zChart.data.labels = entries.map(e => e[0]);
      zChart.data.datasets[0].data = entries.map(e => e[1]);
      zChart.update();
    }
    if (fChart) {
      fChart.data.labels = ['Pending', 'Verified', 'Resolved'];
      fChart.data.datasets[0].data = [pending, verified, resolved];
      fChart.update();
    }

    // Update Table
    const tbody = document.getElementById('reports-table-body');
    if (tbody) {
      tbody.innerHTML = '';
      if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--text-muted);">No reports yet.</td></tr>';
      } else {
        reports.forEach(r => {
          const safeId = escapeHtml((r.id || '').substring(0, 7).toUpperCase());
          const safeAddr = escapeHtml(r.address || r.location || 'Unknown location');
          const safeSev = escapeHtml(r.severity || 'Medium');
          const safeStatus = escapeHtml(r.status || 'pending');
          const statusClass = sanitizeClassToken(safeStatus, 'pending');
          const imgSrc = escapeHtml(getSafeImageUrl(r.image || r.imageUrl, 'assets/violation1.png'));
          const dateStr = escapeHtml(formatDate(r.timestamp));
          
          const tr = document.createElement('tr');
          tr.setAttribute('data-status', safeStatus);
          tr.innerHTML = `
            <td><strong>#CMP-${safeId}</strong></td>
            <td><div class="visual-log"><img src="${imgSrc}" alt="Evidence" onerror="this.style.display='none'" /></div></td>
            <td><div class="td-content"><span class="td-title">${safeAddr}</span></div></td>
            <td><div class="td-content"><span class="td-title">${dateStr}</span></div></td>
            <td><span class="badge-status status-${safeSev.toLowerCase() === 'high' ? 'red' : 'orange'}">${safeSev}</span></td>
            <td><span class="badge-status status-${statusClass}">${safeStatus}</span></td>
            <td>
              <div class="action-buttons">
                <button class="btn btn-outline" title="Review"><i class="ph ph-eye"></i></button>
              </div>
            </td>
          `;
          tbody.appendChild(tr);
        });
      }
    }

    // Update Recent Activity & Notifications
    const actList = document.getElementById('recent-activity-list');
    const notList = document.getElementById('notifications-list');
    
    if (actList) actList.innerHTML = '';
    if (notList) notList.innerHTML = '';

    if (reports.length === 0) {
      const msg = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No reports yet.</div>';
      if (actList) actList.innerHTML = msg;
      if (notList) notList.innerHTML = msg;
    } else {
      reports.slice(0, 10).forEach((r, idx) => {
        const timeAgo = formatTimeAgo(r.timestamp);
        const iconClass = r.severity === 'High' ? 'light-yellow' : 'light-green';
        const iconPh = r.severity === 'High' ? 'warning' : 'leaf';
        const title = r.status === 'pending' ? 'New Patch Report' : r.status === 'verified' ? 'Patch Verified' : 'Planting Confirmed';
        
        const html = `
          <div class="img-notif-icon ${iconClass}"><i class="ph ph-${iconPh}"></i></div>
          <div class="img-notif-content">
            <h4>${title} — ${escapeHtml(r.severity || 'N/A')}</h4>
            <p>${escapeHtml(r.address || 'Unknown location')}</p>
            <span class="time">${timeAgo.toUpperCase()}</span>
          </div>
        `;
        
        if (actList && idx < 5) {
          const card = document.createElement('div');
          card.className = 'img-notif-card';
          card.innerHTML = html;
          actList.appendChild(card);
        }
        if (notList) {
          const card = document.createElement('div');
          card.className = 'img-notif-card';
          card.innerHTML = html;
          notList.appendChild(card);
        }
      });
    }

    // Update Maps
    if (dashMap && dashMarkerLayer) {
      dashMarkerLayer.clearLayers();
      const bounds = [];
      reports.forEach(r => {
        const lat = r.lat || r.latitude;
        const lng = r.lng || r.longitude;
        if (lat && lng) {
          const m = L.marker([lat, lng], { icon: icons[r.severity === 'High' ? 'high' : 'pending'] })
            .bindPopup(`<b>#CMP-${escapeHtml(r.id.substring(0,5).toUpperCase())}</b><br>${escapeHtml(r.address)}`);
          dashMarkerLayer.addLayer(m);
          bounds.push([lat, lng]);
        }
      });
      if (bounds.length > 0) dashMap.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
    }

    if (fullMap && fullMapMarkers) {
      fullMapMarkers.clearLayers();
      const heatData = [];
      const bounds = [];
      reports.forEach(r => {
        const lat = r.lat || r.latitude;
        const lng = r.lng || r.longitude;
        if (lat && lng) {
          const type = r.severity === 'High' ? 'high' : r.status === 'resolved' ? 'resolved' : 'pending';
          const safeId = escapeHtml((r.id||'').substring(0,7).toUpperCase());
          const safeAddr = escapeHtml(r.address || '');
          const statusClass = sanitizeClassToken(r.status, 'pending');
          const imgSrc = escapeHtml(getSafeImageUrl(r.image || r.imageUrl, 'assets/violation1.png'));
          
          heatData.push([lat, lng, r.severity === 'High' ? 1 : 0.5]);
          bounds.push([lat, lng]);

          const m = L.marker([lat, lng], { icon: icons[type] });
          m.bindPopup(`
            <div class="popup-header">
              <span class="popup-id">#CMP-${safeId}</span>
              <span class="popup-status ${statusClass}">${escapeHtml(r.status || 'Pending')}</span>
            </div>
            <img src="${imgSrc}" class="popup-image" alt="Evidence" onerror="this.style.display='none'" />
            <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>${escapeHtml(r.title || r.severity || 'Report')}</span></div>
            <div class="popup-detail"><i class="ph ph-map-pin"></i> <span>${safeAddr}</span></div>
          `, { className: 'custom-popup' });
          fullMapMarkers.addLayer(m);
        }
      });
      
      window.currentHeatLayerData = heatData;
      if (bounds.length > 0) fullMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      
      if (heatMode && heatLayer && fullMap.hasLayer(heatLayer)) {
        fullMap.removeLayer(heatLayer);
        heatLayer = L.heatLayer(heatData, { radius: 25, blur: 15, maxZoom: 14, gradient: { 0.4: 'blue', 0.6: 'lime', 1: 'red' } });
        fullMap.addLayer(heatLayer);
      }
    }
  };

  // Connect to Firestore Realtime Updates
  try {
    onSnapshot(collection(db, "complaints"), (snapshot) => {
      const records = [];
      snapshot.forEach(doc => {
        records.push({ id: doc.id, ...doc.data() });
      });
      // Sort by newest first
      records.sort((a, b) => {
        const t1 = a.timestamp || a.createdAt || 0;
        const t2 = b.timestamp || b.createdAt || 0;
        return t2 - t1;
      });
      renderData(records);
    }, (error) => {
      console.error("Firestore error:", error);
      // Fallback message if DB fails
      const tbody = document.getElementById('reports-table-body');
      if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:32px;color:var(--red-main);">Error loading data: ${escapeHtml(error.message)}</td></tr>`;
    });
  } catch (err) {
    console.error("Failed to initialize Firebase snapshot:", err);
  }

});
