/**
 * =========================================================================
 * NEXMILESTRO - UNIVERSAL API ROUTER & LICENSE SECURITY ENGINE (API_Router.gs)
 * =========================================================================
 * Powers the GitHub Pages web application (nexmilestro.nexsolve.in)
 * by securely executing backend functions and verifying client licenses
 * against the Central Master License Spreadsheet.
 */

// ── CENTRAL MASTER LICENSE SPREADSHEET ID ──────────────────────────────
var MASTER_LICENSE_SHEET_ID = "1U5Frv47SDdASeKqVR_ZCiXJrCnBGvRAILYqC0yljcnc";

// ── ACTIVE TENANT CONTEXT (Resolved dynamically per request) ───────────
var ACTIVE_TENANT_SPREADSHEET_ID = null;

/**
 * Main HTTP POST handler (receives API calls from GitHub Pages)
 */
function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        data = e.parameter || {};
      }
    } else if (e && e.parameter) {
      data = e.parameter;
    }
    return handleUniversalApiRequest(data);
  } catch (err) {
    return respondJSON({ success: false, error: "Server exception: " + err.message, stack: err.stack });
  }
}

/**
 * Main HTTP GET handler (supports GET API queries and web app viewing)
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.action || e.parameter.functionName)) {
    return handleUniversalApiRequest(e.parameter);
  }
  
  // Safe fallback to native HTML output if opened directly inside Google Apps Script
  try {
    return HtmlService.createTemplateFromFile('Index')
      .evaluate()
      .setTitle('NexMilestro - Project & Operations Management')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no');
  } catch (err) {
    return respondJSON({ success: true, status: "NexMilestro API Operational" });
  }
}

/**
 * Core Request Dispatcher
 */
function handleUniversalApiRequest(params) {
  var action = String(params.action || "").trim();
  
  // 1. License Validation Request
  if (action === "validate_license" || action === "verifyLicense") {
    var licenseKey = params.licenseKey || params.orgCode || params.key || "";
    var res = validateLicenseAgainstMasterSheet(licenseKey);
    return respondJSON(res);
  }
  
  // Dynamically resolve and bind the active tenant's spreadsheet for this execution
  if (params.spreadsheetId && String(params.spreadsheetId).trim()) {
    ACTIVE_TENANT_SPREADSHEET_ID = String(params.spreadsheetId).trim();
  } else if (params.licenseKey && String(params.licenseKey).trim()) {
    var lic = validateLicenseAgainstMasterSheet(params.licenseKey);
    if (lic && lic.valid && lic.spreadsheetId) {
      ACTIVE_TENANT_SPREADSHEET_ID = lic.spreadsheetId;
    }
  }
  
  // 2. Function Execution Request (from Universal google.script.run Bridge)
  var fnName = params.functionName || action;
  if (!fnName) {
    return respondJSON({ success: false, error: "No action or functionName specified." });
  }
  
  var args = params.args || [];
  if (typeof args === "string") {
    try { args = JSON.parse(args); } catch(e) { args = [args]; }
  }
  if (!Array.isArray(args)) {
    args = [args];
  }
  
  return respondJSON(executeBackendFunction(fnName, args));
}

/**
 * Dynamically executes any Apps Script backend function
 */
function executeBackendFunction(fnName, args) {
  // Check if function exists in global scope
  var targetFn = null;
  if (typeof this[fnName] === "function") {
    targetFn = this[fnName];
  } else if (typeof globalThis !== "undefined" && typeof globalThis[fnName] === "function") {
    targetFn = globalThis[fnName];
  }
  
  if (!targetFn) {
    return { success: false, error: "Function '" + fnName + "' does not exist on server." };
  }
  
  try {
    var result = targetFn.apply(null, args);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message, stack: err.stack };
  }
}

/**
 * Validates a client license against Master License Sheet:
 * 1U5Frv47SDdASeKqVR_ZCiXJrCnBGvRAILYqC0yljcnc (Sheet: Licenses)
 *
 * Headers:
 * LicenseKey | ClientName | ClientEmail | SpreadsheetID | Plan | IssueDate | ExpiryDate | Status | MaxUsers | LastVerified
 */
function validateLicenseAgainstMasterSheet(queryKey) {
  if (!queryKey || !String(queryKey).trim()) {
    return {
      valid: false,
      reason: "License Key or Client identifier is missing. Access Denied."
    };
  }
  
  var cleanQuery = String(queryKey).trim().toLowerCase();
  
  try {
    var ss = SpreadsheetApp.openById(MASTER_LICENSE_SHEET_ID);
    var sheet = ss.getSheetByName("Licenses") || ss.getSheets()[0];
    if (!sheet) {
      return { valid: false, reason: "Licenses tab not found in Master License Sheet." };
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { valid: false, reason: "No client records registered in Master License Sheet." };
    }
    
    // Header row indexing
    var headers = data[0].map(function(h) {
      return String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
    });
    
    var kIdx = headers.indexOf("licensekey");
    var nameIdx = headers.indexOf("clientname");
    var emailIdx = headers.indexOf("clientemail");
    var sheetIdx = headers.indexOf("spreadsheetid");
    var planIdx = headers.indexOf("plan");
    var expIdx = headers.indexOf("expirydate");
    var statusIdx = headers.indexOf("status");
    var usersIdx = headers.indexOf("maxusers");
    var lastVerIdx = headers.indexOf("lastverified");
    
    if (kIdx === -1) kIdx = 0;
    if (nameIdx === -1) nameIdx = 1;
    if (emailIdx === -1) emailIdx = 2;
    if (sheetIdx === -1) sheetIdx = 3;
    if (planIdx === -1) planIdx = 4;
    if (expIdx === -1) expIdx = 6;
    if (statusIdx === -1) statusIdx = 7;
    if (usersIdx === -1) usersIdx = 8;
    if (lastVerIdx === -1) lastVerIdx = 9;
    
    var matchedRow = null;
    var matchedRowIdx = -1;
    
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var rowKey = String(row[kIdx] || "").trim().toLowerCase();
      var rowEmail = String(row[emailIdx] || "").trim().toLowerCase();
      var rowName = String(row[nameIdx] || "").trim().toLowerCase();
      
      if (rowKey === cleanQuery || rowEmail === cleanQuery || (cleanQuery.length > 3 && rowName === cleanQuery)) {
        matchedRow = row;
        matchedRowIdx = i + 1;
        break;
      }
    }
    
    // Strict enforcement: Unregistered key is blocked immediately
    if (!matchedRow) {
      return {
        valid: false,
        reason: "The organization or license '" + queryKey + "' is not registered in the Master License database. Access Denied."
      };
    }
    
    // 1. Check Status
    var status = String(matchedRow[statusIdx] || "Active").trim();
    if (status.toLowerCase() !== "active") {
      return {
        valid: false,
        reason: "License for '" + matchedRow[nameIdx] + "' is " + status + ". Please contact mehul.gandhi@nexsolve.in."
      };
    }
    
    // 2. Check Expiry
    var expiryVal = matchedRow[expIdx];
    var expStr = "Unlimited";
    if (expiryVal && String(expiryVal).trim().toLowerCase() !== "unlimited" && String(expiryVal).trim().toLowerCase() !== "lifetime") {
      var expDate = new Date(expiryVal);
      if (!isNaN(expDate.getTime())) {
        expStr = Utilities.formatDate(expDate, Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          return {
            valid: false,
            reason: "License expired on " + expStr + ". Please contact mehul.gandhi@nexsolve.in to renew your subscription."
          };
        }
      }
    }
    
    // 3. Update LastVerified timestamp in sheet
    try {
      if (lastVerIdx >= 0) {
        sheet.getRange(matchedRowIdx, lastVerIdx + 1).setValue(new Date());
      }
    } catch(e) {}
    
    return {
      valid: true,
      licenseKey: String(matchedRow[kIdx] || ""),
      clientName: String(matchedRow[nameIdx] || ""),
      clientEmail: String(matchedRow[emailIdx] || ""),
      spreadsheetId: String(matchedRow[sheetIdx] || ""),
      plan: String(matchedRow[planIdx] || "Pro"),
      expiryDate: expStr,
      maxUsers: parseInt(matchedRow[usersIdx], 10) || 10,
      status: "Active"
    };
    
  } catch(err) {
    return {
      valid: false,
      reason: "Master license database connection error: " + err.message
    };
  }
}

/**
 * Standard JSON Response with CORS Header Support
 */
function respondJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Universal Multi-Tenant Spreadsheet Resolver
 * Automatically routes all Database queries to the active client's spreadsheet
 */
function getSpreadsheet() {
  if (typeof ACTIVE_TENANT_SPREADSHEET_ID !== "undefined" && ACTIVE_TENANT_SPREADSHEET_ID) {
    try {
      return SpreadsheetApp.openById(ACTIVE_TENANT_SPREADSHEET_ID);
    } catch (e) {
      Logger.log("Failed to open tenant spreadsheet: " + e.message);
    }
  }
  var propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (propId && String(propId).trim() !== "") {
    try {
      return SpreadsheetApp.openById(String(propId).trim());
    } catch(e) {}
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {}
  throw new Error("Spreadsheet Connection Error: No active spreadsheet found for tenant.");
}

/**
 * Diagnostic function to test Master License Sheet connection in Apps Script Editor
 */
function testMasterLicenseConnection() {
  var res = validateLicenseAgainstMasterSheet("LIC-BUYER3-2026");
  Logger.log("Diagnostic Test Result: " + JSON.stringify(res, null, 2));
  return res;
}

