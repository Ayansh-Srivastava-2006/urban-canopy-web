// Removed direct firestore imports as we use backend API
const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {

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

  // --- SPA Navigation Logic ---
  const navItems = document.querySelectorAll('.sidebar-nav a[data-target], .sidebar-footer a[data-target]');
  const views = document.querySelectorAll('.view-section');

  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();

      // Update active nav styling
      navItems.forEach(nav => nav.classList.remove('active'));
      item.classList.add('active');

      // Hide all views, display target view
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
        profileMenu.classList.add('hidden'); // Close dropdown

        const targetId = link.getAttribute('data-target');

        // Hide all views
        document.querySelectorAll('.view-section').forEach(v => v.classList.add('hidden'));

        // Show selected view
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
  }

  // --- Chart Instances (initialized with empty data, updated by RTDB) ---
  let districtChartInstance = null;
  let violationChartInstance = null;
  let zoneChartInstance = null;
  let fleetChartInstance = null;

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

  // --- Complaints Page Charts ---

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

  // --- Leaflet Maps (centered on India) ---
  const defaultCenter = [28.366, 77.540];

  // Dashboard mini-map
  let dashboardMap = null;
  let dashboardMarkers = [];
  const mapEl = document.getElementById('cityMap');
  if (mapEl) {
    const mapCenter = [40.7128, -74.0060];
    const map = L.map('cityMap', { zoomControl: false }).setView(mapCenter, 13);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const alertIconHtml = `<div style="background-color: ${colors.red}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>`;
    const unitIconHtml = `<div style="background-color: ${colors.blue}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background-color: white; border-radius: 50%"></div></div>`;

    const alertIcon = L.divIcon({ className: 'custom-div-icon', html: alertIconHtml, iconSize: [14, 14], iconAnchor: [7, 7] });
    const unitIcon = L.divIcon({ className: 'custom-div-icon', html: unitIconHtml, iconSize: [16, 16], iconAnchor: [8, 8] });

    // Fetch live complaints from Firebase
    const loadFirebaseMapMarkers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "complaints"));
        // If collection exists, plot the markers
        if (!querySnapshot.empty) {
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.lat && data.lng) {
              const safeId = escapeHtml(doc.id.substring(0, 5).toUpperCase());
              const safeDescription = escapeHtml(data.description || "Unsafe conditions reported.");
              L.marker([data.lat, data.lng], { icon: alertIcon }).addTo(map)
                .bindPopup(`<b>Complaint ID: ${safeId}</b><br>${safeDescription}`);
            }
          });
        } else {
          throw new Error("No reports initialized in Firebase");
        }
      } catch (err) {
        console.warn("Firestore collection unavailable, loading mock bounds:", err.message);
        const complaints = [[40.7228, -74.0060], [40.7100, -74.0150], [40.7300, -73.9900], [40.7050, -74.0100], [40.7150, -73.9950]];
        complaints.forEach((coord, i) => {
          L.marker(coord, { icon: alertIcon }).addTo(map).bindPopup(`<b>Complaint #${400 + i}</b><br>Unsafe conditions reported.`);
        });
      }
    };
    loadFirebaseMapMarkers();

    const units = [[40.7180, -74.0020], [40.7250, -73.9950], [40.7080, -74.0120]];

    units.forEach((coord, i) => {
      L.marker(coord, { icon: unitIcon }).addTo(map).bindPopup(`<b>Unit ${i + 1}</b><br>En route to inspection.`);
    });
  }

  // --- Full City Map Page Initialize ---
  const fullMapEl = document.getElementById('fullCityMap');
  if (fullMapEl) {
    const mapCenter = [40.7300, -74.0000];

    // Base Layers
    const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd', maxZoom: 20
    });

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 20
    });

    const fullMap = L.map('fullCityMap', { zoomControl: false, layers: [streetLayer] }).setView(mapCenter, 13);
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

  const icons = {
    high: createDotIcon(colors.red),
    pending: createDotIcon(colors.orange),
    investigating: createDotIcon(colors.blue),
    resolved: createDotIcon(colors.green)
  };

  const markers = L.markerClusterGroup({
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  });

  const heatLayerData = [];

  const loadFullMapMarkers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "complaints"));
      if (!querySnapshot.empty) {
        querySnapshot.forEach((doc) => {
          const pt = doc.data();
          if (pt.lat && pt.lng) {
            const type = sanitizeClassToken(pt.type || 'investigating', 'investigating');
            const statusClass = sanitizeClassToken(pt.status || 'under-investigation', 'pending');
            const statusText = escapeHtml(String(pt.status || 'under-investigation').replace('-', ' '));
            const safeImage = escapeHtml(getSafeImageUrl(pt.image || 'assets/violation1.png', 'assets/violation1.png'));
            const safeTitle = escapeHtml(pt.title || 'Unsafe Report');
            const safeId = escapeHtml(doc.id.substring(0, 7).toUpperCase());

            heatLayerData.push([pt.lat, pt.lng, type === 'high' ? 1 : 0.5]);
            const marker = L.marker([pt.lat, pt.lng], { icon: icons[type] || icons['pending'] });

            const popupHtml = `
                <div class="popup-header">
                  <span class="popup-id">${safeId}</span>
                  <span class="popup-status ${statusClass}">${statusText}</span>
                </div>
                <img src="${safeImage}" class="popup-image" alt="Evidence" onerror="this.src='https://placehold.co/240x120?text=No+Image'" />
                <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>${safeTitle}</span></div>
                <div class="popup-detail"><i class="ph ph-map-pin"></i> <span>Live location pinned</span></div>
                <button class="btn btn-primary w-full popup-btn"><i class="ph ph-user-plus"></i> Assign Inspector</button>
              `;
            marker.bindPopup(popupHtml, { className: 'custom-popup' });
            markers.addLayer(marker);
          }
        });
      } else {
        throw new Error("Empty DB");
      }
    } catch (err) {
      console.warn("Full map using dummy markers", err);
      const dataPoints = [
        { coord: [40.7228, -74.0060], type: 'high', title: 'No Green Net', status: 'high-risk', id: '#CMP-8842', image: 'assets/violation1.png' },
        { coord: [40.7100, -74.0150], type: 'pending', title: 'Unsafe Structure', status: 'pending', id: '#CMP-8840', image: 'assets/violation2.png' },
        { coord: [40.7300, -73.9900], type: 'investigating', title: 'No Worker Safety Gear', status: 'under-investigation', id: '#CMP-8839', image: 'assets/violation1.png' },
        { coord: [40.7050, -74.0100], type: 'resolved', title: 'Permit Issues', status: 'resolved', id: '#CMP-8830', image: 'assets/violation2.png' }
      ];
      dataPoints.forEach(pt => {
        const safeStatusClass = sanitizeClassToken(pt.status, 'pending');
        const safeStatusText = escapeHtml(String(pt.status).replace('-', ' '));
        const safeTitle = escapeHtml(pt.title);
        const safeImage = escapeHtml(getSafeImageUrl(pt.image, 'assets/violation1.png'));
        const safeId = escapeHtml(pt.id);

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

// Set up Socket.io connection for real-time updates
if (typeof io !== 'undefined') {
  const socket = io(API_BASE);
  socket.on('new_report', (data) => {
    console.log('Real-time: New report received', data);
    // We can dynamically add to map or show notification
    // E.g. alert('New Report at ' + data.lat + ', ' + data.lng);
  });

  socket.on('report_resolved', (data) => {
    console.log('Real-time: Report resolved', data);
  });
}

});
