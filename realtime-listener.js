import { realtimeDb } from './firebase-config.js';
import { ref, onValue, off } from 'https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js';

/**
 * Real-time data listeners for dynamic updates
 */

// Store active listeners to clean them up later
const activeListeners = {};

/**
 * Listen for real-time changes in complaints data
 * @param {Function} callback - Function to call when data changes
 */
export function listenToComplaints(callback) {
  const complaintsRef = ref(realtimeDb, 'complaints');
  
  onValue(complaintsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || []);
  }, (error) => {
    console.error('Error listening to complaints:', error);
  });

  activeListeners.complaints = complaintsRef;
}

/**
 * Listen for real-time changes in dashboard stats
 * @param {Function} callback - Function to call when stats change
 */
export function listenToDashboardStats(callback) {
  const statsRef = ref(realtimeDb, 'dashboard/stats');
  
  onValue(statsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || {});
  }, (error) => {
    console.error('Error listening to dashboard stats:', error);
  });

  activeListeners.dashboardStats = statsRef;
}

/**
 * Listen for real-time changes in violations
 * @param {Function} callback - Function to call when violations change
 */
export function listenToViolations(callback) {
  const violationsRef = ref(realtimeDb, 'violations');
  
  onValue(violationsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || []);
  }, (error) => {
    console.error('Error listening to violations:', error);
  });

  activeListeners.violations = violationsRef;
}

/**
 * Listen for real-time changes in district data
 * @param {Function} callback - Function to call when district data changes
 */
export function listenToDistricts(callback) {
  const districtsRef = ref(realtimeDb, 'districts');
  
  onValue(districtsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || []);
  }, (error) => {
    console.error('Error listening to districts:', error);
  });

  activeListeners.districts = districtsRef;
}

/**
 * Listen for real-time changes in notifications
 * @param {Function} callback - Function to call when notifications change
 */
export function listenToNotifications(callback) {
  const notificationsRef = ref(realtimeDb, 'notifications');
  
  onValue(notificationsRef, (snapshot) => {
    const data = snapshot.val();
    callback(data || []);
  }, (error) => {
    console.error('Error listening to notifications:', error);
  });

  activeListeners.notifications = notificationsRef;
}

/**
 * Listen for real-time changes in a specific path
 * @param {string} path - The database path to listen to
 * @param {Function} callback - Function to call when data changes
 * @param {string} listenerId - Unique identifier for this listener
 */
export function listenToPath(path, callback, listenerId) {
  const pathRef = ref(realtimeDb, path);
  
  onValue(pathRef, (snapshot) => {
    const data = snapshot.val();
    callback(data);
  }, (error) => {
    console.error(`Error listening to path "${path}":`, error);
  });

  activeListeners[listenerId] = pathRef;
}

/**
 * Stop listening to complaints
 */
export function stopListeningToComplaints() {
  if (activeListeners.complaints) {
    off(activeListeners.complaints);
    delete activeListeners.complaints;
  }
}

/**
 * Stop listening to dashboard stats
 */
export function stopListeningToDashboardStats() {
  if (activeListeners.dashboardStats) {
    off(activeListeners.dashboardStats);
    delete activeListeners.dashboardStats;
  }
}

/**
 * Stop listening to violations
 */
export function stopListeningToViolations() {
  if (activeListeners.violations) {
    off(activeListeners.violations);
    delete activeListeners.violations;
  }
}

/**
 * Stop listening to districts
 */
export function stopListeningToDistricts() {
  if (activeListeners.districts) {
    off(activeListeners.districts);
    delete activeListeners.districts;
  }
}

/**
 * Stop listening to notifications
 */
export function stopListeningToNotifications() {
  if (activeListeners.notifications) {
    off(activeListeners.notifications);
    delete activeListeners.notifications;
  }
}

/**
 * Stop listening to a specific path
 * @param {string} listenerId - The listener ID to stop
 */
export function stopListeningToPath(listenerId) {
  if (activeListeners[listenerId]) {
    off(activeListeners[listenerId]);
    delete activeListeners[listenerId];
  }
}

/**
 * Stop all active listeners
 */
export function stopAllListeners() {
  Object.keys(activeListeners).forEach(key => {
    if (activeListeners[key]) {
      off(activeListeners[key]);
    }
  });
  Object.keys(activeListeners).forEach(key => delete activeListeners[key]);
}
