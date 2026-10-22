/**
 * LicenseClient.gs
 * Client-Side Licensing Guard & Security Enforcement Module.
 * Connects securely to the Super Admin's Central Licensing Server.
 */

// ==========================================
// CONFIGURATION (SUPER ADMIN CONFIG)
// ==========================================
// Paste your Master License Google Sheet ID here (or leave empty to route via Central Licensing Web App API):
var CENTRAL_MASTER_LICENSE_SPREADSHEET_ID = ""; 

// Replace this URL with your deployed Central Licensing Web App URL:
var CENTRAL_LICENSE_SERVER_URL = "https://script.google.com/macros/s/AKfycbxYz9kxKK58bKGPQmwXjJrRf01wIkyKzM6HsOglXsto14GRRAGmMeABsWgli5ISHcayFQ/exec";

/**
 * Validates active license with the Central Licensing Server.
 * Implements local caching to ensure high performance while retaining remote kill-switch capability.
 */
function calculateDaysRemaining(dateVal) {
  if (!dateVal || String(dateVal).toLowerCase() === "unlimited" || String(dateVal).toLowerCase() === "lifetime") {
    return 9999;
  }
  try {
    if (dateVal instanceof Date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expClean = new Date(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate());
      return Math.ceil((expClean.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    }
    let str = String(dateVal).trim();
    let expDate = null;
    let parts = str.split(/[\/\-]/);
    if (parts.length === 3) {
      let p1 = parseInt(parts[0], 10);
      let p2 = parseInt(parts[1], 10);
      let p3 = parseInt(parts[2], 10);
      if (p3 > 1000) {
        if (p1 > 12) {
          // DD/MM/YYYY or DD-MM-YYYY (e.g. 26-07-2027)
          expDate = new Date(p3, p2 - 1, p1);
        } else {
          // MM/DD/YYYY or MM-DD-YYYY (e.g. 07-26-2027)
          expDate = new Date(p3, p1 - 1, p2);
        }
      } else if (p1 > 1000) {
        // YYYY-MM-DD format
        expDate = new Date(p1, p2 - 1, p3);
      }
    }
    if (!expDate || isNaN(expDate.getTime())) {
      expDate = new Date(str);
    }
    if (!expDate || isNaN(expDate.getTime())) return 9999;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expClean = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
    const diffTime = expClean.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch(e) {
    return 9999;
  }
}

function validateClientLicense(overrideKey, overrideSheetId) {
  try {
    const props = PropertiesService.getScriptProperties();
    const allProps = props.getProperties() || {};
    let licenseKey = (overrideKey || "").trim();
    if (!licenseKey) {
      for (let p in allProps) {
        if (p.trim().toUpperCase() === "LICENSE_KEY") {
          licenseKey = String(allProps[p] || "").trim();
          break;
        }
      }
    }
    if (!licenseKey) {
      for (let p in allProps) {
        if (String(allProps[p] || "").trim().toUpperCase().indexOf("LIC-") === 0) {
          licenseKey = String(allProps[p] || "").trim();
          break;
        }
      }
    }

    let spreadsheetId = (overrideSheetId || "").trim();
    if (!spreadsheetId) {
      try {
        if (typeof SpreadsheetApp !== "undefined" && SpreadsheetApp.getActiveSpreadsheet()) {
          spreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
        }
      } catch(e){}
    }
    if (!spreadsheetId) {
      for (let p in allProps) {
        if (p.trim().toUpperCase() === "SPREADSHEET_ID" || p.trim().toUpperCase() === "SHEET_ID") {
          spreadsheetId = String(allProps[p] || "").trim();
          break;
        }
      }
    }

    const userEmail = Session.getEffectiveUser() ? Session.getEffectiveUser().getEmail() : "";

    let masterSs = null;
    const licenseServerSheetId = props.getProperty("LICENSE_SERVER_SPREADSHEET_ID") || props.getProperty("MASTER_LICENSE_SPREADSHEET_ID") || CENTRAL_MASTER_LICENSE_SPREADSHEET_ID;
    if (licenseServerSheetId) {
      try {
        masterSs = SpreadsheetApp.openById(licenseServerSheetId);
      } catch(e) {
        masterSs = null;
      }
    }
    if (masterSs) {
      try {
        const masterSheet = masterSs.getSheetByName("Licenses") || masterSs.getSheets()[0];
        if (masterSheet && masterSheet.getLastRow() > 1) {
          const rows = masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, 11).getValues();
          
          const cleanSheetId = (spreadsheetId || "").trim().toLowerCase();
          const cleanLicenseKey = (licenseKey || "").trim().toLowerCase();

          let matchIndex = -1;
          if (cleanLicenseKey) {
            matchIndex = rows.findIndex(r => String(r[0] || "").trim().toLowerCase() === cleanLicenseKey);
          }
          if (matchIndex === -1 && cleanSheetId) {
            matchIndex = rows.findIndex(r => String(r[3] || "").trim().toLowerCase() === cleanSheetId);
          }
          if (matchIndex === -1 && !cleanLicenseKey && !cleanSheetId) {
            matchIndex = 0;
          }

          if (matchIndex !== -1) {
            let match = rows[matchIndex];
            let foundKey = String(match[0] || licenseKey).trim();
            let boundSheetId = String(match[3] || "").trim();
            let boundSheetIdClean = boundSheetId.toLowerCase();

            if (boundSheetIdClean && cleanSheetId && boundSheetIdClean !== cleanSheetId) {
              const actualIndex = rows.findIndex(r => String(r[3] || "").trim().toLowerCase() === cleanSheetId);
              if (actualIndex !== -1) {
                matchIndex = actualIndex;
                match = rows[matchIndex];
                foundKey = String(match[0] || "").trim();
                boundSheetId = String(match[3] || "").trim();
              } else if (cleanLicenseKey && String(match[0] || "").trim().toLowerCase() === cleanLicenseKey) {
                // Key matches! Auto-update/bind the spreadsheetId in the master sheet for this buyer instance
                try {
                  masterSheet.getRange(matchIndex + 2, 4).setValue(spreadsheetId);
                  boundSheetId = spreadsheetId;
                } catch(e){}
              } else {
                return {
                  valid: false,
                  reason: "Security Alert: License Key '" + foundKey + "' is registered to another Google Sheet instance. Contact administrator mehul.gandhi@nexsolve.in.",
                  licenseKey: foundKey,
                  daysRemaining: 0
                };
              }
            }

            if (!boundSheetId && spreadsheetId) {
              try {
                masterSheet.getRange(matchIndex + 2, 4).setValue(spreadsheetId);
              } catch(e){}
            }

            let expVal = match[6];
            let expStr = (expVal instanceof Date) ? Utilities.formatDate(expVal, Session.getScriptTimeZone() || "GMT", "MM/dd/yyyy") : String(expVal || "");
            let status = String(match[7] || "Active").trim();
            let maxUsers = parseInt(match[8], 10) || 10;
            let plan = match[4] || "Pro";
            let daysLeft = calculateDaysRemaining(expStr);
            let expiryTag = match[10] ? String(match[10]).trim() : "";

            try {
              masterSheet.getRange(matchIndex + 2, 10).setValue(new Date());
            } catch(e){}

            if (foundKey && (!props.getProperty("LICENSE_KEY") || props.getProperty("LICENSE_KEY") !== foundKey)) {
              try { props.setProperty("LICENSE_KEY", foundKey); } catch(e){}
            }

            if (status.toLowerCase() !== "active") {
              return {
                valid: false,
                reason: "License Key status is '" + status + "'. Please contact support at mehul.gandhi@nexsolve.in.",
                licenseKey: foundKey,
                plan: plan,
                expiryDate: expStr,
                maxUsers: maxUsers,
                daysRemaining: daysLeft
              };
            }

            if (daysLeft <= 0) {
              return {
                valid: false,
                reason: "License Expired on " + expStr + ". Please contact support at mehul.gandhi@nexsolve.in to renew your subscription.",
                licenseKey: foundKey,
                plan: plan,
                expiryDate: expStr,
                maxUsers: maxUsers,
                daysRemaining: daysLeft
              };
            }

            return {
              valid: true,
              licenseKey: foundKey,
              plan: plan,
              expiryDate: expStr,
              maxUsers: maxUsers,
              daysRemaining: daysLeft
            };
          } else {
            return {
              valid: false,
              reason: "🔐 License Key missing or unregistered: No active license found for this Google Sheet instance. Please register a new License Key (e.g. LIC-BUYER3-2026) in your Master Sheet or contact support at mehul.gandhi@nexsolve.in.",
              licenseKey: licenseKey || "N/A",
              daysRemaining: 0
            };
          }
        }
      } catch(e) {
        console.error("Direct license master fetch error:", e);
      }
      if (CENTRAL_LICENSE_SERVER_URL && CENTRAL_LICENSE_SERVER_URL.indexOf("YOUR_CENTRAL_LICENSE_SERVER") === -1) {
        try {
          const payload = {
            action: "verifyLicense",
            licenseKey: licenseKey,
            spreadsheetId: spreadsheetId,
            userEmail: userEmail,
            timestamp: new Date().getTime()
          };
          const options = {
            method: "post",
            contentType: "application/json",
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          };
          const response = UrlFetchApp.fetch(CENTRAL_LICENSE_SERVER_URL, options);
          let result = null;
          try {
            result = JSON.parse(response.getContentText());
          } catch(e) {
            console.error("Central license server response is not valid JSON:", e);
          }
          if (result) {
            const rawExp = result.expiryDate || result.ExpiryDate || "";
            let daysLeft = calculateDaysRemaining(rawExp);

            if (rawExp) {
              try { props.setProperty("LICENSE_EXPIRY_DATE", String(rawExp)); } catch(e){}
            }
            if (result.maxUsers) {
              try { props.setProperty("LICENSE_LIMIT", String(result.maxUsers)); } catch(e){}
            }

            if (result.valid === false || String(result.status || result.Status).toLowerCase() === "suspended" || String(result.status || result.Status).toLowerCase() === "expired") {
              if (result.reason && result.reason.indexOf("registered to another Google Sheet instance") !== -1 && licenseKey) {
                try {
                  const repairPayload = {
                    action: "verifyLicense",
                    licenseKey: licenseKey,
                    spreadsheetId: spreadsheetId,
                    userEmail: userEmail,
                    forceBind: true,
                    timestamp: new Date().getTime()
                  };
                  const repairRes = UrlFetchApp.fetch(CENTRAL_LICENSE_SERVER_URL, {
                    method: "post",
                    contentType: "application/json",
                    payload: JSON.stringify(repairPayload),
                    muteHttpExceptions: true
                  });
                  const repairResult = JSON.parse(repairRes.getContentText());
                  if (repairResult && repairResult.valid !== false) {
                    result = repairResult;
                    const newRawExp = result.expiryDate || result.ExpiryDate || rawExp;
                    result.daysRemaining = calculateDaysRemaining(newRawExp);
                    if (newRawExp) {
                      try { props.setProperty("LICENSE_EXPIRY_DATE", String(newRawExp)); } catch(e){}
                    }
                    return result;
                  }
                } catch(e){}
              }

              result.valid = false;
              result.reason = result.reason || ("License Status: " + (result.status || "Inactive") + ". Contact administrator.");
              result.daysRemaining = daysLeft;
              return result;
            }

            result.valid = true;
            result.daysRemaining = daysLeft;
            result.expiryDate = rawExp;
            return result;
          }
        } catch(e) {
          console.error("Central license server fetch error:", e);
        }
      }
    }

    const propExpiry = props.getProperty("LICENSE_EXPIRY_DATE");
    if (propExpiry) {
      let daysLeft = calculateDaysRemaining(propExpiry);
      return {
        valid: daysLeft > 0,
        reason: daysLeft <= 0 ? ("License Expired on " + propExpiry + ". Please contact support at mehul.gandhi@nexsolve.in to renew.") : "",
        licenseKey: licenseKey,
        plan: "Pro",
        expiryDate: propExpiry,
        maxUsers: parseInt(props.getProperty("LICENSE_LIMIT") || "10", 10),
        daysRemaining: daysLeft
      };
    }

    let fallbackExp = "";
    return {
      valid: true,
      reason: "",
      licenseKey: licenseKey,
      plan: "Pro",
      expiryDate: fallbackExp,
      maxUsers: parseInt(props.getProperty("LICENSE_LIMIT") || "10", 10),
      daysRemaining: 9999
    };

  } catch (err) {
    return {
      valid: true,
      licenseKey: licenseKey || overrideKey || "N/A",
      plan: "Pro",
      expiryDate: "",
      maxUsers: 10,
      daysRemaining: 9999
    };
  }
}

function escapeHtmlStr(str) {
  if (!str) return "";
  return String(str).replace(/[&<>"']/g, function(m) {
    return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
  });
}

/**
 * Security Guard Wrapper for Web App Entry Point (doGet)
 */
function handleAppSecurityCheck(e, overrideKey) {
  const license = validateClientLicense(overrideKey);
  if (!license.valid) {
    const reasonMsg = escapeHtmlStr(license.reason || "Your application license is invalid, expired, or suspended.");
    return HtmlService.createHtmlOutput(
      '<div style="font-family: system-ui, sans-serif; display:flex; height:100vh; align-items:center; justify-content:center; background:#0f172a; color:#f8fafc;">' +
        '<div style="max-width:520px; width:90%; padding:2.5rem; background:#1e293b; border-radius:16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 2px solid #ef4444; text-align:center;">' +
          '<div style="width:70px; height:70px; background:rgba(239, 68, 68, 0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 1.5rem; color:#ef4444;">' +
            '<svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>' +
          '</div>' +
          '<h2 style="font-size:1.6rem; font-weight:800; margin-bottom:0.5rem; color:#ffffff;">Access Suspended / Expired</h2>' +
          '<p style="color:#94a3b8; font-size:0.95rem; line-height:1.6; margin-bottom:1.5rem;">' + reasonMsg + '</p>' +
          '<div style="font-size:0.85rem; color:#cbd5e1; border-top:1px solid #334155; padding-top:1.25rem;">Please contact software administrator <strong>mehul.gandhi@nexsolve.in</strong> to renew your license key.</div>' +
        '</div>' +
      '</div>'
    ).setTitle("License Verification Failed").setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return null;
}

/**
 * Validates and gets License metadata for the UI settings tab.
 * Enforces Max Users limit per buyer license.
 */
function getLicenseSettings(overrideKey) {
  const props = PropertiesService.getScriptProperties();
  const allProps = props.getProperties() || {};
  let key = (overrideKey || "").trim();
  if (!key) {
    for (let p in allProps) {
      if (p.trim().toUpperCase() === "LICENSE_KEY") {
        key = String(allProps[p] || "").trim();
        break;
      }
    }
  }
  if (!key) {
    for (let p in allProps) {
      if (String(allProps[p] || "").trim().toUpperCase().indexOf("LIC-") === 0) {
        key = String(allProps[p] || "").trim();
        break;
      }
    }
  }
  const licenseInfo = validateClientLicense(key);
  const activeKey = (licenseInfo && licenseInfo.licenseKey) ? licenseInfo.licenseKey : key;
  const maxUsers = (licenseInfo && licenseInfo.maxUsers) ? parseInt(licenseInfo.maxUsers, 10) : 10;
  
  let currentUsers = 0;
  try {
    const users = readTable("Users");
    currentUsers = users.filter(u => String(u.Status || "").trim().toLowerCase() === "active").length;
  } catch (e) {
    currentUsers = 0;
  }

  let rawExpiry = (licenseInfo && (licenseInfo.expiryDate || licenseInfo.ExpiryDate)) ? String(licenseInfo.expiryDate || licenseInfo.ExpiryDate) : (props.getProperty("LICENSE_EXPIRY_DATE") || "");
  let daysRemaining = (licenseInfo && licenseInfo.daysRemaining !== undefined) ? licenseInfo.daysRemaining : calculateDaysRemaining(rawExpiry);
  let formattedExpiry = rawExpiry;

  try {
    if (rawExpiry) {
      let str = String(rawExpiry).trim();
      let parts = str.split(/[\/\-]/);
      let expDate = null;
      if (parts.length === 3) {
        let p1 = parseInt(parts[0], 10);
        let p2 = parseInt(parts[1], 10);
        let p3 = parseInt(parts[2], 10);
        if (p3 > 1000) {
          if (p1 > 12) {
            expDate = new Date(p3, p2 - 1, p1);
          } else {
            expDate = new Date(p3, p1 - 1, p2);
          }
        } else if (p1 > 1000) {
          expDate = new Date(p1, p2 - 1, p3);
        }
      }
      if (!expDate || isNaN(expDate.getTime())) expDate = new Date(rawExpiry);
      if (expDate && !isNaN(expDate.getTime())) {
        const yyyy = expDate.getFullYear();
        const mm = String(expDate.getMonth() + 1).padStart(2, '0');
        const dd = String(expDate.getDate()).padStart(2, '0');
        formattedExpiry = `${dd}/${mm}/${yyyy}`;
      }
    }
  } catch(e){}

  return {
    valid: licenseInfo ? licenseInfo.valid : true,
    reason: licenseInfo ? licenseInfo.reason : "",
    licenseKey: activeKey,
    maxUsers: maxUsers,
    currentUsers: currentUsers,
    plan: (licenseInfo && licenseInfo.plan) || "Pro",
    expiryDate: formattedExpiry,
    daysRemaining: daysRemaining
  };
}

/**
 * Sends an email notification to Super Admin (mehul.gandhi@nexsolve.in) when a client requests a license upgrade.
 */
function requestLicenseUpgrade(requestedTier, notes, userId, currentLicenseKey) {
  try {
    const adminEmail = "mehul.gandhi@nexsolve.in";
    let keyToUse = (currentLicenseKey || "").trim();
    if (!keyToUse) {
      const props = PropertiesService.getScriptProperties();
      keyToUse = props.getProperty("LICENSE_KEY") || "";
    }
    
    const licenseInfo = (typeof validateClientLicense === "function") 
      ? validateClientLicense(keyToUse) 
      : { licenseKey: keyToUse || "N/A", currentUsers: 1, maxUsers: 10 };
      
    const resolvedLicenseKey = (licenseInfo && licenseInfo.licenseKey) ? licenseInfo.licenseKey : (keyToUse || "N/A");
    const maxUsers = (licenseInfo && licenseInfo.maxUsers) ? licenseInfo.maxUsers : 10;
    
    let activeUserCount = 0;
    let companyName = "NexMilestro Studio";
    try {
      if (typeof readTable === "function") {
        const users = readTable("Users") || [];
        activeUserCount = users.filter(u => String(u.Status || "").toLowerCase() === "active").length;
        
        const companyData = readTable("CompanySetup");
        if (companyData && companyData.length > 0 && companyData[0].CompanyName) {
          companyName = companyData[0].CompanyName;
        }
      }
    } catch(e) {}

    let requesterEmail = Session.getEffectiveUser() ? Session.getEffectiveUser().getEmail() : "";
    let requesterName = "Admin User";

    try {
      if (typeof readTable === "function") {
        const users = readTable("Users") || [];
        const user = users.find(u => u.UserID === userId || u.Email === userId || (requesterEmail && u.Email === requesterEmail));
        if (user) {
          requesterName = user.FullName || requesterName;
          requesterEmail = user.Email || requesterEmail;
        }
      }
    } catch(e) {}

    if (!requesterEmail && userId && String(userId).indexOf("@") !== -1) {
      requesterEmail = userId;
    }

    const subject = `[NexMilestro License Upgrade Request] ${companyName} (${requestedTier})`;
    const body = `Hi Mehul,\n\n` +
      `A new license seat upgrade request has been submitted from NexMilestro:\n\n` +
      `• Organization / Studio: ${companyName}\n` +
      `• Requested User Tier: ${requestedTier}\n` +
      `• Requesting User: ${requesterName} (${requesterEmail || "System Admin"})\n` +
      `• Current License Key: ${resolvedLicenseKey}\n` +
      `• Current Usage: ${activeUserCount || 1} Active Users (Current Cap: ${maxUsers})\n` +
      `• Custom Notes / Requirements:\n  ${notes || "None provided"}\n\n` +
      `Timestamp: ${new Date().toString()}\n\n` +
      `Regards,\nNexMilestro Automated Licensing System`;

    try {
      GmailApp.sendEmail(adminEmail, subject, body, {
        name: "NexMilestro Licensing System",
        replyTo: requesterEmail || adminEmail
      });
    } catch(err) {
      MailApp.sendEmail({
        to: adminEmail,
        replyTo: requesterEmail || adminEmail,
        name: "NexMilestro Licensing System",
        subject: subject,
        body: body
      });
    }

    return {
      success: true,
      message: "Upgrade request submitted successfully for key " + resolvedLicenseKey + "! Notification email sent to mehul.gandhi@nexsolve.in."
    };
  } catch(e) {
    return {
      success: false,
      message: "Failed to send upgrade email: " + e.message
    };
  }
}

/**
 * Client-Side Proxy for getSystemBackupDownloadUrl
 */
function getSystemBackupDownloadUrl() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getSystemBackupDownloadUrl === "function") {
    return StudioSpaceCore.getSystemBackupDownloadUrl();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getSystemBackupDownloadUrl === "function") {
    return StudioSpace.getSystemBackupDownloadUrl();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getSystemBackupDownloadUrl === "function") {
    return NexMilestroCore.getSystemBackupDownloadUrl();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getSystemBackupDownloadUrl === "function") {
    return NexMilestro.getSystemBackupDownloadUrl();
  }
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const id = ss ? ss.getId() : "";
    return {
      success: true,
      url: id ? ("https://docs.google.com/spreadsheets/d/" + id + "/export?format=xlsx") : "",
      fileName: "NexMilestro_Full_Backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") + ".xlsx"
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Client-Side Proxy for eraseAllSystemData
 */
function eraseAllSystemData(confirmCode, userId) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.eraseAllSystemData === "function") {
    return StudioSpaceCore.eraseAllSystemData(confirmCode, userId);
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.eraseAllSystemData === "function") {
    return StudioSpace.eraseAllSystemData(confirmCode, userId);
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.eraseAllSystemData === "function") {
    return NexMilestroCore.eraseAllSystemData(confirmCode, userId);
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.eraseAllSystemData === "function") {
    return NexMilestro.eraseAllSystemData(confirmCode, userId);
  }
  try {
    if (!confirmCode || String(confirmCode).trim() !== "ERASE EVERYTHING") {
      return { success: false, message: "Security Validation Failed: Confirmation text does not match 'ERASE EVERYTHING'." };
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const targetSheets = [
      "Customers", "Projects", "SiteVisits", "Tasks", "Leads",
      "LeadFollowups", "Proposals", "Vendors", "Associates", "Transactions", "Milestones"
    ];

    let clearedCount = 0;
    targetSheets.forEach(sheetName => {
      try {
        const sh = ss.getSheetByName(sheetName);
        if (sh) {
          const lastRow = sh.getLastRow();
          if (lastRow > 1) {
            sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).clearContent();
            clearedCount++;
          }
        }
      } catch(sheetErr) {}
    });

    return {
      success: true,
      message: "System data erased successfully. " + clearedCount + " operational data sheets cleared."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Client-Side Proxy for sendPasswordResetOTP
 */
function sendPasswordResetOTP(identifier) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.sendPasswordResetOTP === "function") {
    return StudioSpaceCore.sendPasswordResetOTP(identifier);
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.sendPasswordResetOTP === "function") {
    return StudioSpace.sendPasswordResetOTP(identifier);
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.sendPasswordResetOTP === "function") {
    return NexMilestroCore.sendPasswordResetOTP(identifier);
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.sendPasswordResetOTP === "function") {
    return NexMilestro.sendPasswordResetOTP(identifier);
  }
  try {
    const searchVal = String(identifier || "").trim().toLowerCase();
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sh) return { success: false, message: "Users sheet missing." };
    const data = sh.getDataRange().getValues();
    
    let userEmail = "";
    let userName = "";
    
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][2] || "").trim().toLowerCase();
      const mobile = String(data[i][3] || "").trim();
      const status = String(data[i][7] || "").trim().toLowerCase();
      
      if ((email === searchVal || mobile === searchVal) && status === "active") {
        userEmail = String(data[i][2] || "").trim();
        userName = String(data[i][1] || "User").trim();
        break;
      }
    }
    
    if (!userEmail) {
      return { success: false, message: "No active account found with this registered email address." };
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = userEmail.toLowerCase();
    
    PropertiesService.getScriptProperties().setProperty("RESET_OTP_" + key, otp);
    PropertiesService.getScriptProperties().setProperty("RESET_OTP_TIME_" + key, new Date().getTime().toString());
    
    let emailSent = false;
    try {
      MailApp.sendEmail({
        to: userEmail,
        subject: "[StudioSpace] Password Reset Verification Code",
        body: `Hi ${userName},\n\nYour 6-digit password reset OTP is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nStudioSpace Project Management Suite`
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("MailApp Error:", mailErr);
    }
    
    return {
      success: true,
      message: emailSent 
        ? "OTP sent successfully to " + userEmail + ". Please check your inbox (and spam folder)." 
        : "OTP generated: " + otp + ". (Target Email: " + userEmail + ")"
    };
  } catch (e) {
    return { success: false, message: "Error sending OTP: " + e.message };
  }
}

/**
 * Client-Side Proxy for sendOTP
 */
function sendOTP(identifier) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.sendOTP === "function") {
    return StudioSpaceCore.sendOTP(identifier);
  }
  return sendPasswordResetOTP(identifier);
}

/**
 * Client-Side Proxy for verifyOTPAndResetPassword
 */
function verifyOTPAndResetPassword(identifier, otp, newPassword) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.verifyOTPAndResetPassword === "function") {
    return StudioSpaceCore.verifyOTPAndResetPassword(identifier, otp, newPassword);
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.verifyOTPAndResetPassword === "function") {
    return StudioSpace.verifyOTPAndResetPassword(identifier, otp, newPassword);
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.verifyOTPAndResetPassword === "function") {
    return NexMilestroCore.verifyOTPAndResetPassword(identifier, otp, newPassword);
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.verifyOTPAndResetPassword === "function") {
    return NexMilestro.verifyOTPAndResetPassword(identifier, otp, newPassword);
  }
  try {
    if (!identifier || !String(identifier).trim()) {
      return { success: false, message: "Email identifier is required." };
    }
    
    const searchVal = String(identifier).trim().toLowerCase();
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");
    if (!sh) return { success: false, message: "Users sheet missing." };
    const data = sh.getDataRange().getValues();
    
    let userRowIndex = -1;
    let userEmail = "";
    
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][2] || "").trim().toLowerCase();
      const mobile = String(data[i][3] || "").trim();
      const status = String(data[i][7] || "").trim().toLowerCase();
      
      if ((email === searchVal || mobile === searchVal) && status === "active") {
        userRowIndex = i + 1;
        userEmail = String(data[i][2] || "").trim().toLowerCase();
        break;
      }
    }
    
    if (userRowIndex === -1 || !userEmail) {
      return { success: false, message: "User account not found or inactive." };
    }
    
    const savedOtp = PropertiesService.getScriptProperties().getProperty("RESET_OTP_" + userEmail);
    const savedTimeStr = PropertiesService.getScriptProperties().getProperty("RESET_OTP_TIME_" + userEmail);
    
    if (!savedOtp || savedOtp !== String(otp).trim()) {
      return { success: false, message: "Invalid OTP. Please check your email and try again." };
    }
    
    const timeElapsed = new Date().getTime() - Number(savedTimeStr || 0);
    if (timeElapsed > 5 * 60 * 1000) {
      return { success: false, message: "OTP has expired. Please request a new code." };
    }
    
    const newHash = hashPassword(newPassword);
    sh.getRange(userRowIndex, 5).setValue(newHash);
    sh.getRange(userRowIndex, 6).setValue("No");
    
    PropertiesService.getScriptProperties().deleteProperty("RESET_OTP_" + userEmail);
    PropertiesService.getScriptProperties().deleteProperty("RESET_OTP_TIME_" + userEmail);
    
    return {
      success: true,
      message: "Password reset successfully! You can now log in with your new password."
    };
  } catch (e) {
    return { success: false, message: "Error resetting password: " + e.message };
  }
}

/**
 * Client-Side Proxy for getProjectsAggregatedData
 */
function getProjectsAggregatedData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getProjectsAggregatedData === "function") {
    return StudioSpaceCore.getProjectsAggregatedData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getProjectsAggregatedData === "function") {
    return StudioSpace.getProjectsAggregatedData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getProjectsAggregatedData === "function") {
    return NexMilestroCore.getProjectsAggregatedData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getProjectsAggregatedData === "function") {
    return NexMilestro.getProjectsAggregatedData();
  }
  try {
    const shProjects = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Projects");
    const shCust = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Customers");
    const shMs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Milestones");
    const shAssoc = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Associates");
    const shVendors = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Vendors");
    const shUsers = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Users");

    const readSheetRows = (sh) => {
      if (!sh) return [];
      const lr = sh.getLastRow();
      const lc = sh.getLastColumn();
      if (lr <= 1 || lc === 0) return [];
      const headers = sh.getRange(1, 1, 1, lc).getValues()[0];
      const data = sh.getRange(2, 1, lr - 1, lc).getValues();
      return data.map(row => {
        const obj = {};
        headers.forEach((h, idx) => {
          if (h) obj[h] = row[idx];
        });
        return obj;
      });
    };

    return {
      success: true,
      projects: readSheetRows(shProjects),
      customers: readSheetRows(shCust),
      milestones: readSheetRows(shMs),
      associates: readSheetRows(shAssoc),
      vendors: readSheetRows(shVendors),
      users: readSheetRows(shUsers),
      dropdowns: (typeof getDropdownValues === "function") ? getDropdownValues() : {}
    };
  } catch (e) {
    return {
      success: false,
      message: e.message,
      projects: [], customers: [], milestones: [], associates: [], vendors: [], users: [], dropdowns: {}
    };
  }
}
