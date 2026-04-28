// Urban Canopy — main.js
// No backend API needed; all UI is self-contained with mock data fallbacks.

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

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = colors.textMuted;

    const distEl = document.getElementById('districtChart');
    if (distEl) {
      new Chart(distEl.getContext('2d'), {
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
      new Chart(violEl.getContext('2d'), {
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
      new Chart(zoneEl.getContext('2d'), {
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
      new Chart(fleetEl.getContext('2d'), {
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
  // 5. LEAFLET MAPS (safe — wrapped in typeof check)
  // =========================================================
  if (typeof L !== 'undefined') {

    const defaultCenter = [28.366, 77.540];

    // --- Helper: create dot icon by color ---
    const createDotIcon = (dotColor) => L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color: ${dotColor}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [14, 14], iconAnchor: [7, 7]
    });

    const alertIcon = createDotIcon(colors.red);
    const unitIconHtml = `<div style="background-color: ${colors.blue}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%"></div></div>`;
    const unitIcon = L.divIcon({ className: 'custom-div-icon', html: unitIconHtml, iconSize: [16, 16], iconAnchor: [8, 8] });

    const icons = {
      high: createDotIcon(colors.red),
      pending: createDotIcon(colors.orange),
      investigating: createDotIcon(colors.blue),
      resolved: createDotIcon(colors.green)
    };

    // Mock data for maps
    const mockComplaints = [
      [40.7228, -74.0060], [40.7100, -74.0150], [40.7300, -73.9900], [40.7050, -74.0100], [40.7150, -73.9950]
    ];
    const mockUnits = [
      [40.7180, -74.0020], [40.7250, -73.9950], [40.7080, -74.0120]
    ];
    const mockFullMapData = [
      { coord: [40.7228, -74.0060], type: 'high', title: 'No Green Net', status: 'high-risk', id: '#CMP-8842', image: 'assets/violation1.png' },
      { coord: [40.7100, -74.0150], type: 'pending', title: 'Unsafe Structure', status: 'pending', id: '#CMP-8840', image: 'assets/violation2.png' },
      { coord: [40.7300, -73.9900], type: 'investigating', title: 'No Worker Safety Gear', status: 'under-investigation', id: '#CMP-8839', image: 'assets/violation1.png' },
      { coord: [40.7050, -74.0100], type: 'resolved', title: 'Permit Issues', status: 'resolved', id: '#CMP-8830', image: 'assets/violation2.png' }
    ];

    // --- Dashboard mini-map ---
    const mapEl = document.getElementById('cityMap');
    if (mapEl) {
      const dashMap = L.map('cityMap', { zoomControl: false }).setView([40.7128, -74.0060], 13);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
      }).addTo(dashMap);
      L.control.zoom({ position: 'bottomright' }).addTo(dashMap);

      mockComplaints.forEach((coord, i) => {
        L.marker(coord, { icon: alertIcon }).addTo(dashMap).bindPopup(`<b>Complaint #${400 + i}</b><br>Unsafe conditions reported.`);
      });
      mockUnits.forEach((coord, i) => {
        L.marker(coord, { icon: unitIcon }).addTo(dashMap).bindPopup(`<b>Unit ${i + 1}</b><br>En route to inspection.`);
      });
    }

    // --- Full City Map ---
    const fullMapEl = document.getElementById('fullCityMap');
    if (fullMapEl) {
      const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO', subdomains: 'abcd', maxZoom: 20
      });
      const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri', maxZoom: 20
      });

      const fullMap = L.map('fullCityMap', { zoomControl: false, layers: [streetLayer] }).setView([40.7300, -74.0000], 13);
      L.control.zoom({ position: 'bottomright' }).addTo(fullMap);

      const fullMapMarkers = L.markerClusterGroup({ spiderfyOnMaxZoom: true, showCoverageOnHover: false, zoomToBoundsOnClick: true });
      fullMap.addLayer(fullMapMarkers);

      const heatLayerData = [];
      let heatMode = false;
      let heatLayer = null;

      // Populate full map with mock data
      const bounds = [];
      mockFullMapData.forEach(pt => {
        const safeStatusClass = sanitizeClassToken(pt.status, 'pending');
        const safeStatusText = escapeHtml(String(pt.status).replace(/-/g, ' '));
        const safeTitle = escapeHtml(pt.title);
        const safeImage = escapeHtml(getSafeImageUrl(pt.image, 'assets/violation1.png'));
        const safeId = escapeHtml(pt.id);

        heatLayerData.push([pt.coord[0], pt.coord[1], pt.type === 'high' ? 1 : 0.5]);

        const marker = L.marker(pt.coord, { icon: icons[pt.type] || icons.pending });
        marker.bindPopup(`
          <div class="popup-header">
            <span class="popup-id">${safeId}</span>
            <span class="popup-status ${safeStatusClass}">${safeStatusText}</span>
          </div>
          <img src="${safeImage}" class="popup-image" alt="Evidence" onerror="this.src='https://placehold.co/240x120?text=No+Image'" />
          <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>${safeTitle}</span></div>
          <div class="popup-detail"><i class="ph ph-map-pin"></i> <span>Live location pinned</span></div>
          <button class="btn btn-primary w-full popup-btn"><i class="ph ph-user-plus"></i> Assign Inspector</button>
        `, { className: 'custom-popup' });
        fullMapMarkers.addLayer(marker);
        bounds.push(pt.coord);
      });

      if (bounds.length > 0) fullMap.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

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

  } // end Leaflet check

  // =========================================================
  // 6. RECENT ACTIVITY & NOTIFICATIONS (static placeholder)
  // =========================================================
  const activityList = document.getElementById('recent-activity-list');
  if (activityList) {
    activityList.innerHTML = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No reports yet.</div>';
  }

  const notifList = document.getElementById('notifications-list');
  if (notifList) {
    notifList.innerHTML = '<div class="img-notif-card" style="justify-content:center;color:var(--text-muted);font-size:13px;">No activity yet.</div>';
  }

});
