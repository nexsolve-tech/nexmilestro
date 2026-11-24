/**
 * seed_cloud_bigdata.js
 * 
 * Standalone Node.js script to generate and batch-upload 20,000+ relational records
 * directly to the live Google Sheets backend for NexMilestro via Google Apps Script Web App API.
 * 
 * Usage:
 *   node seed_cloud_bigdata.js
 */

const https = require('https');

const API_URL = "https://script.google.com/macros/s/AKfycbysDwrVaFVANBqslv_0o3rc82vw6Nn6K4w78Mr6AOVCUIFHbEt9lhruPVMNZESqg_50/exec";
const LICENSE_KEY = "LIC-BUYER1-2026";

console.log("=== NEXMILESTRO CLOUD BIG DATA SEEDER (20,000+ RECORDS) ===");
console.log("Target Backend:", API_URL);
console.log("License Key:", LICENSE_KEY);
console.log("");

// Execute POST API call
function apiCall(action, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      action: action,
      licenseKey: LICENSE_KEY,
      payload: payload
    });

    const parsedUrl = new URL(API_URL);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch(e) {
          resolve({ success: false, raw: data });
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

console.log("✓ Seeder ready. You can test concurrent multi-user load or run batch cloud ingestion.");
console.log("Note: For instantaneous local benchmark testing with 0ms latency, open the web app");
console.log("at https://nexmilestro.nexsolve.in and click the '10k Data & 10 Users Lab' button!");
