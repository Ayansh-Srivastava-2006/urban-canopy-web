// Removed direct firestore imports as we use backend API
const API_BASE = 'http://localhost:5000';

document.addEventListener('DOMContentLoaded', () => {

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

      // Fire global resize to force Leaflet & ChartJS to repaint correctly on previously hidden tabs
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
      // Close dropdown if clicking outside
      if (!profileBtn.contains(e.target)) {
        profileMenu.classList.add('hidden');
      }
    });

    // General Dropdown SPA Routing
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

        // Manage sidebar active states: clear them if not a primary sidebar item
        const navItems = document.querySelectorAll('.sidebar-nav a[data-target], .sidebar-footer a[data-target]');
        navItems.forEach(nav => nav.classList.remove('active'));
        
        // Let's specifically try to trigger active if corresponding sidebar link exists
        const matchingSidebar = document.querySelector(`.sidebar-nav a[data-target="${targetId}"], .sidebar-footer a[data-target="${targetId}"]`);
        if (matchingSidebar) {
           matchingSidebar.classList.add('active');
        }

        setTimeout(() => window.dispatchEvent(new Event('resize')), 50);
      });
    });
  }

  // --- Theme Colors ---
  const colors = {
    blue: '#2563eb',
    blueLight: '#93c5fd',
    red: '#ef4444',
    orange: '#f59e0b',
    green: '#10b981',
    textMain: '#0f172a',
    textMuted: '#64748b',
    bgApp: '#f4f7f9'
  };

  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = colors.textMuted;

  // --- Dashboard Page Charts ---
  
  const distEl = document.getElementById('districtChart');
  if (distEl) {
    new Chart(distEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Downtown', 'Northville', 'Westside', 'East Port', 'South End', 'Uptown'],
        datasets: [{
          label: 'Active Complaints',
          data: [142, 89, 210, 65, 114, 98],
          backgroundColor: colors.blue,
          borderRadius: 4,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f172a',
            padding: 12,
            titleFont: { size: 13, weight: 'bold' },
            bodyFont: { size: 13 }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e2e8f0', drawBorder: false }, ticks: { stepSize: 50 } },
          x: { grid: { display: false, drawBorder: false } }
        }
      }
    });
  }

  const violEl = document.getElementById('violationChart');
  if (violEl) {
    new Chart(violEl.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: ['No Green Net', 'Worker Safety', 'Unsafe Structure', 'Permit Issues', 'Other'],
        datasets: [{
          data: [35, 25, 15, 15, 10],
          backgroundColor: [colors.red, colors.orange, colors.blue, colors.blueLight, colors.textMuted],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' } } }
      }
    });
  }

  // --- Complaints Page Charts ---

  const zoneEl = document.getElementById('zoneChart');
  if (zoneEl) {
    new Chart(zoneEl.getContext('2d'), {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Complaints',
          data: [42, 38, 55, 45, 60, 20, 15],
          borderColor: colors.blue,
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  const fleetEl = document.getElementById('fleetChart');
  if (fleetEl) {
    new Chart(fleetEl.getContext('2d'), {
      type: 'bar',
      data: {
        labels: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'],
        datasets: [{
          label: 'Cases Handled',
          data: [12, 19, 8, 15, 22],
          backgroundColor: colors.green,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e2e8f0' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  // --- Initialize Leaflet Map ---
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

    // Fetch live complaints from Node.js Backend API
    const loadFirebaseMapMarkers = async () => {
      try {
        // Dummy token for now; should come from Firebase Auth
        const token = localStorage.getItem('auth_token') || 'dummy-token';
        const res = await fetch(`${API_BASE}/api/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        
        if (json.success && json.data.length > 0) {
          json.data.forEach((data) => {
            if (data.location && data.location.lat && data.location.lng) {
              const safeId = escapeHtml(data.id.substring(0, 5).toUpperCase());
              const safeDescription = escapeHtml(data.description || "Unsafe conditions reported.");
              L.marker([data.location.lat, data.location.lng], { icon: alertIcon }).addTo(map)
                .bindPopup(`<b>Complaint ID: ${safeId}</b><br>${safeDescription}`);
            }
          });
        } else {
           throw new Error("No reports found from backend");
        }
      } catch (err) {
        console.warn("Firestore collection unavailable, loading mock bounds:", err.message);
        const complaints = [ [40.7228, -74.0060], [40.7100, -74.0150], [40.7300, -73.9900], [40.7050, -74.0100], [40.7150, -73.9950] ];
        complaints.forEach((coord, i) => {
          L.marker(coord, { icon: alertIcon }).addTo(map).bindPopup(`<b>Complaint #${400 + i}</b><br>Unsafe conditions reported.`);
        });
      }
    };
    loadFirebaseMapMarkers();

    const units = [ [40.7180, -74.0020], [40.7250, -73.9950], [40.7080, -74.0120] ];

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

    // Layer Toggle Buttons
    if (document.getElementById('btnStreet')) {
      document.getElementById('btnStreet').addEventListener('click', (e) => {
        fullMap.removeLayer(satelliteLayer);
        fullMap.addLayer(streetLayer);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    }

    if (document.getElementById('btnSatellite')) {
      document.getElementById('btnSatellite').addEventListener('click', (e) => {
        fullMap.removeLayer(streetLayer);
        fullMap.addLayer(satelliteLayer);
        document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
      });
    }

    // Icons
    const createDotIcon = (color) => {
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
        const token = localStorage.getItem('auth_token') || 'dummy-token';
        const res = await fetch(`${API_BASE}/api/reports`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data.length > 0) {
          json.data.forEach((pt) => {
            if (pt.location && pt.location.lat && pt.location.lng) {
              const type = sanitizeClassToken(pt.type || 'investigating', 'investigating');
              const statusClass = sanitizeClassToken(pt.status || 'under-investigation', 'pending');
              const statusText = escapeHtml(String(pt.status || 'under-investigation').replace('-', ' '));
              const safeImage = escapeHtml(getSafeImageUrl(pt.imageUrl || 'assets/violation1.png', 'assets/violation1.png'));
              const safeTitle = escapeHtml(pt.title || 'Unsafe Report');
              const safeId = escapeHtml(pt.id.substring(0, 7).toUpperCase());

              heatLayerData.push([pt.location.lat, pt.location.lng, type === 'high' ? 1 : 0.5]);
              const marker = L.marker([pt.location.lat, pt.location.lng], { icon: icons[type] || icons['pending'] });
              
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
           throw new Error("Empty Backend DB");
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

          heatLayerData.push([...pt.coord, pt.type === 'high' ? 1 : 0.5]);
          const marker = L.marker(pt.coord, { icon: icons[pt.type] });
          const popupHtml = `
            <div class="popup-header">
              <span class="popup-id">${safeId}</span>
              <span class="popup-status ${safeStatusClass}">${safeStatusText}</span>
            </div>
            <img src="${safeImage}" class="popup-image" alt="Evidence" />
            <div class="popup-detail"><i class="ph ph-warning-circle"></i> <span>${safeTitle}</span></div>
            <button class="btn btn-primary w-full popup-btn"><i class="ph ph-user-plus"></i> Assign Inspector</button>
          `;
          marker.bindPopup(popupHtml, { className: 'custom-popup' });
          markers.addLayer(marker);
        });
      }
      fullMap.addLayer(markers);
    };
    loadFullMapMarkers();

    fullMap.addLayer(markers);

    // Heatmap Toggle
    if (typeof L.heatLayer !== 'undefined' && document.getElementById('btnHeatmap')) {
      const heatLayer = L.heatLayer(heatLayerData, { radius: 25, blur: 15, maxZoom: 14, gradient: {0.4: 'blue', 0.6: 'lime', 1: 'red'} });
      let heatMode = false;
      
      document.getElementById('btnHeatmap').addEventListener('click', (e) => {
        heatMode = !heatMode;
        if (heatMode) {
          fullMap.addLayer(heatLayer);
          e.target.classList.add('active');
          fullMap.removeLayer(markers);
        } else {
          fullMap.removeLayer(heatLayer);
          e.target.classList.remove('active');
          fullMap.addLayer(markers);
        }
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
