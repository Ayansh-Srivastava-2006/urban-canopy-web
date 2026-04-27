/**
 * Real-time Integration Examples
 * This file shows how to integrate real-time Firebase updates with your dashboard and complaints pages
 * 
 * SETUP INSTRUCTIONS:
 * 1. Add these scripts to your HTML files (dashboard.html, complaints.html, map.html, etc.)
 * 2. Update the Firebase Realtime Database with your data structure
 * 3. The functions will automatically update your UI in real-time
 */

import {
  listenToComplaints,
  listenToDashboardStats,
  listenToViolations,
  listenToDistricts,
  listenToNotifications,
  listenToPath,
  stopAllListeners
} from './realtime-listener.js';

import {
  updateStatCards,
  updateComplaintsTable,
  updateNotificationBadge,
  addNotification,
  showToast,
  highlightChange
} from './ui-updater.js';

/**
 * Initialize real-time listeners for dashboard
 */
export function initializeDashboardRealTime() {
  console.log('Initializing dashboard real-time updates...');

  // Listen to dashboard statistics
  listenToDashboardStats((stats) => {
    console.log('Dashboard stats updated:', stats);
    updateStatCards(stats);
    showToast('Dashboard updated with latest data', 'info');
  });

  // Listen to violations
  listenToViolations((violations) => {
    console.log('Violations updated:', violations);
    // Update violation charts here
    // Example: updateViolationChart(violationChartInstance, violations);
  });

  // Listen to districts
  listenToDistricts((districts) => {
    console.log('Districts updated:', districts);
    // Update district charts here
    // Example: updateDistrictChart(districtChartInstance, districts);
  });
}

/**
 * Initialize real-time listeners for complaints page
 */
export function initializeComplaintsRealTime() {
  console.log('Initializing complaints real-time updates...');

  // Listen to all complaints
  listenToComplaints((complaints) => {
    console.log('Complaints updated:', complaints);
    
    // Convert object to array if needed
    let complaintsArray = Array.isArray(complaints) ? complaints : Object.values(complaints || {});
    
    // Update the complaints table
    updateComplaintsTable(complaintsArray);
    
    showToast('Complaints list updated', 'info');
  });

  // Listen to violations separately if needed
  listenToViolations((violations) => {
    console.log('Violations updated:', violations);
    // Update violations display
  });
}

/**
 * Initialize real-time listeners for notifications
 */
export function initializeNotificationsRealTime() {
  console.log('Initializing notifications real-time updates...');

  listenToNotifications((notifications) => {
    console.log('Notifications updated:', notifications);
    
    // Convert to array
    let notifArray = Array.isArray(notifications) ? notifications : Object.values(notifications || {});
    
    // Update notification count
    updateNotificationBadge(notifArray.length);
    
    // Show recent notifications
    notifArray.slice(0, 5).forEach(notif => {
      addNotification(notif);
    });
  });
}

/**
 * Listen to a custom data path
 * Usage: listenToCustomPath('custom/path', (data) => { updateUI(data); })
 */
export function listenToCustomPath(path, callback) {
  listenToPath(path, (data) => {
    console.log(`Data from ${path}:`, data);
    callback(data);
  }, `custom-${path}`);
}

/**
 * Stop all real-time listeners (call when leaving a page)
 */
export function stopRealtimeUpdates() {
  console.log('Stopping all real-time listeners...');
  stopAllListeners();
}

/**
 * Example: Advanced usage with data transformation
 */
export function initializeAdvancedRealTime() {
  // Listen to complaints and transform data
  listenToComplaints((complaints) => {
    let complaintsArray = Array.isArray(complaints) ? complaints : Object.values(complaints || {});
    
    // Group by status
    const byStatus = {
      pending: complaintsArray.filter(c => c.status === 'pending'),
      inProgress: complaintsArray.filter(c => c.status === 'in_progress'),
      resolved: complaintsArray.filter(c => c.status === 'resolved')
    };
    
    // Update UI with grouped data
    console.log('Grouped complaints:', byStatus);
    // Update UI here
  });

  // Listen to district-specific data
  listenToPath('districts/central', (districtData) => {
    console.log('Central district data:', districtData);
    // Update district-specific UI
  });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on and initialize accordingly
  const pathname = window.location.pathname;
  
  if (pathname.includes('dashboard') || pathname === '/' || pathname.includes('index')) {
    initializeDashboardRealTime();
  } else if (pathname.includes('complaints')) {
    initializeComplaintsRealTime();
  }
  
  // Always initialize notifications
  initializeNotificationsRealTime();
  
  // Clean up when leaving
  window.addEventListener('beforeunload', () => {
    stopRealtimeUpdates();
  });
});

export { stopRealtimeUpdates };
