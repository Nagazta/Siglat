# Siglat PH — Community Outage & Brownout Tracker

Siglat PH is a community-powered web application and scraper pipeline designed to track and map utility power outages in real-time across the Philippines. It scrapes official power outage advisories, extracts precise location data using OCR, stores reports in a Firestore database, and sends SMS notifications to subscribers near affected coordinates.

---

## 🛠️ Project Architecture
* **Frontend**: React (v19) + Vite, styled with Tailwind CSS, utilizing React Leaflet for interactive mapping.
* **Backend Scrapers**: Playwright (for headless scraping of Facebook and utility sites) + Tesseract.js (for OCR text extraction from advisory images).
* **Database**: Cloud Firestore (Real-time sync).
* **Automation**: GitHub Actions (Scheduled workflow triggers).
* **Hosting**: Firebase Hosting (Static web server).

---

## 🚀 Getting Started (Local Development)

### 1. Prerequisites
Ensure you have **Node.js (v20+)** installed on your system.

### 2. Installation
Clone the repository, navigate to the folder, and install all package dependencies:
```bash
npm install
```

### 3. Environment Variables Setup
Copy the example environment template into a new `.env` file in the root directory:
```bash
cp .env.example .env
```
Open `.env` and fill in your credentials:
```env
# Firebase Web App Config
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Optional Admin Passcode (for dev-mode manual sync trigger)
VITE_ADMIN_PASSCODE=admin123

# httpSMS Gateway configuration (for sending SMS alerts)
HTTPSMS_API_KEY=your_httpsms_api_key
HTTPSMS_SENDER=+63XXXXXXXXXX
VITE_HTTPSMS_API_KEY=your_httpsms_api_key
VITE_HTTPSMS_SENDER=+63XXXXXXXXXX
```

### 4. Running the Frontend
Start the local Vite development server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.
*Note: In development mode, the admin panel's "Manual Sync" triggers will run the scraper scripts locally via a dev-only Vite middleware plugin.*

### 5. Running Scrapers Manually
You can test the scraper scripts directly using Node.js:

* **Facebook Outage Scraper**:
  ```bash
  # Dry-run (runs browser & OCR, prints output, does NOT write to database)
  npm run scrape:facebook:dry
  
  # Live-run (writes results directly to Firestore)
  npm run scrape:facebook
  ```

* **Visayan Electric Scraper**:
  ```bash
  # Dry-run
  npm run scrape:veco:dry
  
  # Live-run
  npm run scrape:veco
  ```

---

## ☁️ Deploying to Firebase Hosting

### 1. Build the Production Bundle
Compile and minify the React + Vite frontend:
```bash
npm run build
```

### 2. Deploy using Firebase Tools
If you don't have the CLI tools installed globally, run the deployment via `npx`:
```bash
# Log in to your Google Account linked to Firebase
npx firebase-tools login

# Deploy the static build (from /dist)
npx firebase-tools deploy --only hosting
```

---

## 🤖 Scraper Automation (GitHub Actions)

The scraper scripts run automatically in the cloud on a schedule using a GitHub Actions runner.

### 1. Setup secrets
To allow the GitHub Actions runner to connect to your database and send SMS alerts, navigate to your GitHub Repository and go to **Settings > Secrets and variables > Actions > Repository secrets**. Add the following secrets:

* `VITE_FIREBASE_API_KEY`
* `VITE_FIREBASE_AUTH_DOMAIN`
* `VITE_FIREBASE_PROJECT_ID`
* `VITE_FIREBASE_STORAGE_BUCKET`
* `VITE_FIREBASE_MESSAGING_SENDER_ID`
* `VITE_FIREBASE_APP_ID`
* `HTTPSMS_API_KEY`
* `HTTPSMS_SENDER`
* `SCRAPER_EMAIL` *(Optional: If you enforce admin auth rules in Firestore)*
* `SCRAPER_PASSWORD` *(Optional: If you enforce admin auth rules in Firestore)*

### 2. Scheduling Details
The workflow defined in `.github/workflows/scrape.yml` is scheduled to run **every 6 hours**.
* **Manual override**: You can trigger the scraper workflow instantly by opening the **Actions** tab on your GitHub repository, selecting the **Scheduled Outage Scrapers** workflow, and clicking **Run workflow**.

---

## 🔒 Database Security Rules (Firestore)

To protect subscriber phone numbers (PII) from mass extraction and secure reports from unauthorized modifications, apply these security rules in your **Firebase Console > Firestore Database > Rules** tab:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // Outage Reports Security
    match /reports/{reportId} {
      allow read: if true;
      allow create: if true;
      
      // Public users can only increment confirmations/votes. Admins/scrapers can edit anything.
      allow update: if (request.auth != null) || 
                   (request.resource.data.diff(resource.data).affectedKeys().hasOnly(['confirmations', 'restoredVotes']));
      allow delete: if request.auth != null;
    }
    
    // Subscribers Security (PII Protection)
    match /subscribers/{subscriberPhone} {
      allow list: if request.auth != null; // Prevents public querying/downloading of the entire list
      allow get: if true;                  // Allows individual lookup for unsubscribe validation
      allow create, delete: if true;
      allow update: if request.auth != null;
    }
  }
}
```
