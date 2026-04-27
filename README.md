# Urban Canopy Web Dashboard

A centralized platform for civic officials and NGO partner organizations to track, manage, and resolve urban safety violations in real time.

## Overview

The Municipal Construction Safety Monitor (Urban Canopy Web Dashboard) is a Single Page Application (SPA) designed to unify construction safety monitoring. It integrates seamlessly with the Urban Canopy mobile applications and backend services to provide a comprehensive view of city-wide safety compliance.

## Features

- **Real-time Dashboard:** View municipal statistics including total complaints, pending reviews, verified violations, and resolved cases.
- **Interactive City Map:** Locational analytics for civic safety reports using Leaflet, featuring street, satellite, and heatmap layers to identify high-risk zones.
- **Central Registry:** Monitor and manage civic reports across city sectors, assign inspectors, and track resolution velocity.
- **Analytics & Reporting:** Visualize complaints by district and violation types using interactive charts.
- **Audit & Notifications:** Chronological activity tracking for system alerts, assigned tasks, and verified violations.
- **Role-Based Access:** Secure login for Government Officials and NGO Partners via Firebase Authentication.

## Tech Stack

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6 Modules)
- **Maps:** Leaflet.js, MarkerCluster, Leaflet.heat
- **Charts:** Chart.js
- **Authentication:** Firebase Auth
- **Icons:** Phosphor Icons
- **Fonts:** Google Fonts (Inter)

## Getting Started

### Prerequisites

- A modern web browser.
- A local web server (e.g., Live Server extension in VS Code, `http-server` via npm, or Python's `http.server`) is recommended to handle ES6 module imports correctly.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd urban-canopy-web
   ```

2. **Configure Firebase:**
   Update the `firebase-config.js` file with your Firebase project credentials. Ensure Firebase Authentication (Email/Password) is enabled in your Firebase console.

3. **Run the application:**
   Serve the directory using a local web server. For example, using Python:
   ```bash
   python -m http.server 8000
   ```
   Then navigate to `http://localhost:8000` in your browser.

## Project Structure

- `index.html`: The login/authentication portal.
- `dashboard.html`: The main SPA containing all views (Dashboard, Registry, Map, Notifications, Profile, Settings).
- `main.js`: Core application logic, routing, chart initialization, and map rendering.
- `style.css`: Application styling.
- `firebase-config.js`: Firebase configuration and initialization.
- `assets/`: Image assets and logos.
- `complaints.html` & `map.html`: Standalone or legacy view components.

## License

This project is licensed under the MIT License.
