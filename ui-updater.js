/**
 * Utility functions to update UI with real-time data
 */

/**
 * Update stat cards with real-time data
 * @param {Object} stats - Statistics object from Firebase
 */
export function updateStatCards(stats) {
  if (!stats) return;

  // Update Total Complaints
  if (stats.totalComplaints !== undefined) {
    const totalElement = document.querySelector('[data-stat="total-complaints"] .stat-value');
    if (totalElement) {
      totalElement.textContent = stats.totalComplaints.toLocaleString();
    }
  }

  // Update Pending Review
  if (stats.pendingReview !== undefined) {
    const pendingElement = document.querySelector('[data-stat="pending-review"] .stat-value');
    if (pendingElement) {
      pendingElement.textContent = stats.pendingReview.toLocaleString();
    }
  }

  // Update Verified Violations
  if (stats.verifiedViolations !== undefined) {
    const violationsElement = document.querySelector('[data-stat="verified-violations"] .stat-value');
    if (violationsElement) {
      violationsElement.textContent = stats.verifiedViolations.toLocaleString();
    }
  }

  // Update Resolved Cases
  if (stats.resolvedCases !== undefined) {
    const resolvedElement = document.querySelector('[data-stat="resolved-cases"] .stat-value');
    if (resolvedElement) {
      resolvedElement.textContent = stats.resolvedCases.toLocaleString();
    }
  }
}

/**
 * Update complaints table with real-time data
 * @param {Array} complaints - Array of complaint objects
 */
export function updateComplaintsTable(complaints) {
  if (!complaints || !Array.isArray(complaints)) return;

  const tableBody = document.querySelector('.complaints-table tbody');
  if (!tableBody) return;

  // Clear existing rows
  tableBody.innerHTML = '';

  // Add new rows
  complaints.forEach(complaint => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${complaint.id || 'N/A'}</td>
      <td>${complaint.location || 'N/A'}</td>
      <td>${complaint.type || 'N/A'}</td>
      <td><span class="status-badge status-${complaint.status?.toLowerCase() || 'pending'}">${complaint.status || 'Pending'}</span></td>
      <td>${complaint.date || 'N/A'}</td>
      <td>${complaint.priority || 'Normal'}</td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Update dashboard notification count
 * @param {number} count - Number of new notifications
 */
export function updateNotificationBadge(count) {
  const badge = document.querySelector('.badge');
  if (badge) {
    badge.textContent = count;
    badge.style.display = count > 0 ? 'block' : 'none';
  }
}

/**
 * Add notification to list
 * @param {Object} notification - Notification object
 */
export function addNotification(notification) {
  const notifList = document.querySelector('.notif-list');
  if (!notifList) return;

  const notifCard = document.createElement('div');
  notifCard.className = 'img-notif-card';
  notifCard.innerHTML = `
    <div class="notif-content">
      <span class="notif-title">${notification.title || 'New Notification'}</span>
      <span class="notif-desc">${notification.description || ''}</span>
      <span class="notif-time">${notification.timestamp || new Date().toLocaleString()}</span>
    </div>
  `;
  notifList.insertBefore(notifCard, notifList.firstChild);

  // Keep only last 10 notifications in view
  const cards = notifList.querySelectorAll('.img-notif-card');
  if (cards.length > 10) {
    cards[cards.length - 1].remove();
  }
}

/**
 * Update chart data for district complaints
 * @param {Object} chartInstance - Chart.js chart instance
 * @param {Array} districtData - Array with district labels and data
 */
export function updateDistrictChart(chartInstance, districtData) {
  if (!chartInstance || !districtData) return;

  chartInstance.data.labels = districtData.labels || [];
  chartInstance.data.datasets[0].data = districtData.data || [];
  chartInstance.update();
}

/**
 * Update chart data for violation types
 * @param {Object} chartInstance - Chart.js chart instance
 * @param {Array} violationData - Array with violation types and counts
 */
export function updateViolationChart(chartInstance, violationData) {
  if (!chartInstance || !violationData) return;

  chartInstance.data.labels = violationData.labels || [];
  chartInstance.data.datasets[0].data = violationData.data || [];
  chartInstance.update();
}

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of notification (success, error, info, warning)
 */
export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    font-size: 14px;
    animation: slideIn 0.3s ease-out;
  `;
  
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Highlight changed elements
 * @param {HTMLElement} element - Element to highlight
 */
export function highlightChange(element) {
  if (!element) return;
  element.style.backgroundColor = '#fef3c7';
  setTimeout(() => {
    element.style.backgroundColor = '';
  }, 1000);
}
