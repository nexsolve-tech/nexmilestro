/**
 * Code.gs
 * Main entry point for the Google Apps Script Web App.
 * Manages routing and dynamic file inclusions.
 */

/**
 * Handles HTTP GET requests to serve the web application.
 */
function doGet(e, containerLicenseKey) {
  const securityCheck = handleAppSecurityCheck(e, containerLicenseKey);
  if (securityCheck) {
    return securityCheck;
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('NexMilestro - Project & Operations Management')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, shrink-to-fit=no');
}

/**
 * Automatically runs when the spreadsheet is opened.
 * Adds a custom menu to setup or manage the database.
 */
function onOpen(e) {
  SpreadsheetApp.getUi()
    .createMenu('NexMilestro Manager')
    .addItem('Setup/Reset Database', 'setupSpreadsheet')
    .addToUi();
}

/**
 * Helper function to include HTML sub-files inside templates.
 * Extremely resilient to case mismatch and explicit file extension variations in GAS.
 */
function include(filename) {
  const cleanFilename = filename.replace(/\.html$/i, '');
  const variations = [
    cleanFilename,
    cleanFilename.toLowerCase(),
    cleanFilename.toUpperCase(),
    cleanFilename.charAt(0).toUpperCase() + cleanFilename.slice(1).toLowerCase(),
    cleanFilename + '.html',
    cleanFilename.toLowerCase() + '.html',
    cleanFilename.toUpperCase() + '.html',
    cleanFilename.charAt(0).toUpperCase() + cleanFilename.slice(1).toLowerCase() + '.html'
  ];
  
  for (let i = 0; i < variations.length; i++) {
    try {
      return HtmlService.createHtmlOutputFromFile(variations[i]).getContent();
    } catch (e) {
      // Continue to next variation
    }
  }
  
  // Return a visible, styled diagnostic banner instead of a silent HTML comment
  return '<div style="margin: 1.5rem; padding: 1.25rem; background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; border-radius: 8px; font-family: system-ui, -apple-system, sans-serif; font-size: 0.9rem; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">' +
         '<h4 style="margin: 0 0 0.5rem 0; font-weight: 600; font-size: 1rem; color: #991b1b;">⚠️ File Inclusion Error</h4>' +
         '<p style="margin: 0 0 0.5rem 0; line-height: 1.4;">The file <strong>' + filename + '</strong> could not be found in the Google Apps Script project.</p>' +
         '<p style="margin: 0; font-size: 0.8rem; color: #b91c1c;"><em>Please verify that you have created an HTML file named exactly <strong>' + filename + '</strong> (or case-insensitive variations) in the Apps Script project editor.</em></p>' +
         '</div>';
}

/**
 * Ensures getAssigneeOptions is registered as a top-level function in Code.gs
 */
function getAssigneeOptions(currentUserId) {
  if (typeof getUserAssigneeOptions === 'function') {
    return getUserAssigneeOptions(currentUserId);
  }
  try {
    const users = readTable("Users");
    const isActive = (u) => String(u.Status || "").trim().toLowerCase() === "active";
    const activeUsers = users.filter(isActive);

    if (!currentUserId) {
      return activeUsers.map(u => ({ UserID: u.UserID, FullName: u.FullName, RoleID: u.RoleID }));
    }

    const currentUser = users.find(u => u.UserID === currentUserId);
    if (!currentUser || currentUser.RoleID === "Super Admin" || currentUser.RoleID === "Admin") {
      return activeUsers.map(u => ({ UserID: u.UserID, FullName: u.FullName, RoleID: u.RoleID }));
    }
    
    const assignees = activeUsers.filter(u => u.UserID === currentUserId || u.ReportsTo === currentUserId);
    return assignees.map(u => ({ UserID: u.UserID, FullName: u.FullName, RoleID: u.RoleID }));
  } catch (e) {
    return [];
  }
}

/**
 * Top-level proxy function for retrieving license settings.
 */
function getLicenseSettings(overrideKey) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getLicenseSettings === "function") {
    return StudioSpaceCore.getLicenseSettings(overrideKey);
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getLicenseSettings === "function") {
    return StudioSpace.getLicenseSettings(overrideKey);
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getLicenseSettings === "function") {
    return NexMilestroCore.getLicenseSettings(overrideKey);
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getLicenseSettings === "function") {
    return NexMilestro.getLicenseSettings(overrideKey);
  }
  try {
    const keyToUse = overrideKey || PropertiesService.getScriptProperties().getProperty("LICENSE_KEY") || "";
    const licenseInfo = (typeof validateClientLicense === "function") ? validateClientLicense(keyToUse) : null;
    return {
      licenseKey: (licenseInfo && licenseInfo.licenseKey) ? licenseInfo.licenseKey : keyToUse,
      maxUsers: (licenseInfo && licenseInfo.maxUsers) ? licenseInfo.maxUsers : 10,
      currentUsers: 1,
      expiryDate: (licenseInfo && licenseInfo.expiryDate) ? licenseInfo.expiryDate : "",
      daysRemaining: (licenseInfo && licenseInfo.daysRemaining !== undefined) ? licenseInfo.daysRemaining : 9999
    };
  } catch(e) {
    return { licenseKey: "N/A", maxUsers: 10, currentUsers: 1, expiryDate: "", daysRemaining: 9999 };
  }
}

/**
 * Top-level proxy function for requesting a license upgrade.
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
 * Top-level proxy handler for getFinanceAggregatedData
 */
function getFinanceAggregatedData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getFinanceAggregatedData === "function") {
    return StudioSpaceCore.getFinanceAggregatedData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getFinanceAggregatedData === "function") {
    return StudioSpace.getFinanceAggregatedData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getFinanceAggregatedData === "function") {
    return NexMilestroCore.getFinanceAggregatedData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getFinanceAggregatedData === "function") {
    return NexMilestro.getFinanceAggregatedData();
  }

  try {
    let rawTransactions = [];
    try { rawTransactions = readTable("Transactions"); } catch(e) {}

    let projects = [];
    try { projects = readTable("Projects"); } catch(e) {}

    let vendors = [];
    try { vendors = readTable("Vendors"); } catch(e) {}

    let associates = [];
    try { associates = readTable("Associates"); } catch(e) {}

    let customers = [];
    try { customers = readTable("Customers"); } catch(e) {}

    let dropdowns = {};
    try { dropdowns = getDropdownValues(); } catch(e) {}

    if (!dropdowns["TransactionType"] || dropdowns["TransactionType"].length === 0) {
      dropdowns["TransactionType"] = ["Income", "Expense"];
    }

    return {
      success: true,
      transactions: rawTransactions,
      projects: projects,
      vendors: vendors,
      associates: associates,
      customers: customers,
      siteVisits: siteVisits,
      dropdowns: dropdowns
    };
  } catch(e) {
    return {
      success: false,
      message: e.message,
      transactions: [],
      projects: [],
      vendors: [],
      associates: [],
      siteVisits: [],
      dropdowns: {}
    };
  }
}

/**
 * Top-level proxy handler for getTransactions
 */
function getTransactions() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getTransactions === "function") {
    return StudioSpaceCore.getTransactions();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getTransactions === "function") {
    return StudioSpace.getTransactions();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getTransactions === "function") {
    return NexMilestroCore.getTransactions();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getTransactions === "function") {
    return NexMilestro.getTransactions();
  }

  try {
    return readTable("Transactions");
  } catch(e) {
    return [];
  }
}

/**
 * Top-level proxy handler for getSystemBackupDownloadUrl
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
    const ss = getSpreadsheet();
    const id = ss.getId();
    return {
      success: true,
      url: "https://docs.google.com/spreadsheets/d/" + id + "/export?format=xlsx",
      fileName: "NexMilestro_Full_Backup_" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd") + ".xlsx"
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Top-level proxy handler for eraseAllSystemData
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
    checkUserPermission(userId, "CompanySetup", "edit");
    if (!confirmCode || String(confirmCode).trim() !== "ERASE EVERYTHING") {
      return { success: false, message: "Security Validation Failed: Confirmation text does not match 'ERASE EVERYTHING'." };
    }

    const ss = getSpreadsheet();
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
      } catch(sheetErr) {
        console.error("Error clearing sheet " + sheetName + ":", sheetErr);
      }
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
 * Top-level proxy handler for sendPasswordResetOTP
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
    const sh = getSheet("Users");
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
 * Top-level proxy handler for sendOTP
 */
function sendOTP(identifier) {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.sendOTP === "function") {
    return StudioSpaceCore.sendOTP(identifier);
  }
  return sendPasswordResetOTP(identifier);
}

/**
 * Top-level proxy handler for verifyOTPAndResetPassword
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
    const sh = getSheet("Users");
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
 * Top-level proxy handler for getProjectsAggregatedData
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
    const projects = readTable("Projects");
    const customers = readTable("Customers");
    const milestones = readTable("Milestones");
    const associates = readTable("Associates");
    const vendors = readTable("Vendors");
    const users = readTable("Users");
    const dropdowns = getDropdownValues();

    return {
      success: true,
      projects: projects || [],
      customers: customers || [],
      milestones: milestones || [],
      associates: associates || [],
      vendors: vendors || [],
      users: users || [],
      dropdowns: dropdowns || {}
    };
  } catch(e) {
    return {
      success: false,
      message: e.message,
      projects: [], customers: [], milestones: [], associates: [], vendors: [], users: [], dropdowns: {}
    };
  }
}

/**
 * Master Data Loader — Preloads ALL application data in a single spreadsheet round-trip on login.
 */
function getAllAppData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getAllAppData === "function") {
    return StudioSpaceCore.getAllAppData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getAllAppData === "function") {
    return StudioSpace.getAllAppData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getAllAppData === "function") {
    return NexMilestroCore.getAllAppData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getAllAppData === "function") {
    return NexMilestro.getAllAppData();
  }
  try {
    const users = readTable("Users") || [];
    const customers = readTable("Customers") || [];
    const projects = readTable("Projects") || [];
    const tasks = readTable("Tasks") || [];
    const siteVisits = readTable("SiteVisits") || [];
    const leads = readTable("Leads") || [];
    const proposals = readTable("Proposals") || [];
    const vendors = readTable("Vendors") || [];
    const associates = readTable("Associates") || [];
    const milestones = readTable("Milestones") || [];
    const transactions = readTable("Transactions") || [];
    const dropdowns = getDropdownValues() || {};

    return {
      success: true,
      users: users,
      customers: customers,
      projects: projects,
      tasks: tasks,
      siteVisits: siteVisits,
      leads: leads,
      proposals: proposals,
      vendors: vendors,
      associates: associates,
      milestones: milestones,
      transactions: transactions,
      dropdowns: dropdowns
    };
  } catch(e) {
    return {
      success: false,
      message: e.message,
      users: [], customers: [], projects: [], tasks: [], siteVisits: [], leads: [], proposals: [], vendors: [], associates: [], milestones: [], transactions: [], dropdowns: {}
    };
  }
}

/**
 * ============================================================
 * BATCH DATA APIs — Performance Optimization
 * Each function opens the spreadsheet ONCE and reads all tables
 * needed by a specific view, returning them in a single response.
 * This replaces 5-7 individual google.script.run calls with 1.
 * ============================================================
 */

/**
 * Batch data for Dashboard view.
 * Replaces: getCustomers, getProjects, getTasks, getSiteVisits, getMilestones, getLeads, getTransactions (7 calls → 1)
 */
function getDashboardData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getDashboardData === "function") {
    return StudioSpaceCore.getDashboardData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getDashboardData === "function") {
    return StudioSpace.getDashboardData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getDashboardData === "function") {
    return NexMilestroCore.getDashboardData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getDashboardData === "function") {
    return NexMilestro.getDashboardData();
  }
  try {
    return {
      success: true,
      customers: readTable("Customers") || [],
      projects: readTable("Projects") || [],
      tasks: readTable("Tasks") || [],
      siteVisits: readTable("SiteVisits") || [],
      milestones: readTable("Milestones") || [],
      leads: readTable("Leads") || [],
      transactions: readTable("Transactions") || []
    };
  } catch(e) {
    return { success: false, message: e.message, customers: [], projects: [], tasks: [], siteVisits: [], milestones: [], leads: [], transactions: [] };
  }
}

/**
 * Batch data for Projects view.
 * Replaces: getUsers, getCustomers, getProjects, getDropdownValues, getMilestones, getAssociates, getVendors (7 calls → 1)
 */
function getProjectsViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getProjectsViewData === "function") {
    return StudioSpaceCore.getProjectsViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getProjectsViewData === "function") {
    return StudioSpace.getProjectsViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getProjectsViewData === "function") {
    return NexMilestroCore.getProjectsViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getProjectsViewData === "function") {
    return NexMilestro.getProjectsViewData();
  }
  try {
    return {
      success: true,
      users: readTable("Users") || [],
      customers: readTable("Customers") || [],
      projects: readTable("Projects") || [],
      dropdowns: getDropdownValues() || {},
      milestones: readTable("Milestones") || [],
      associates: readTable("Associates") || [],
      vendors: readTable("Vendors") || []
    };
  } catch(e) {
    return { success: false, message: e.message, users: [], customers: [], projects: [], dropdowns: {}, milestones: [], associates: [], vendors: [] };
  }
}

/**
 * Batch data for Tasks view.
 * Replaces: getProjects, getUsers, getTasks, getDropdownValues, getVendors, getAssociates (6 calls → 1)
 */
function getTasksViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getTasksViewData === "function") {
    return StudioSpaceCore.getTasksViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getTasksViewData === "function") {
    return StudioSpace.getTasksViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getTasksViewData === "function") {
    return NexMilestroCore.getTasksViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getTasksViewData === "function") {
    return NexMilestro.getTasksViewData();
  }
  try {
    return {
      success: true,
      projects: readTable("Projects") || [],
      users: readTable("Users") || [],
      tasks: readTable("Tasks") || [],
      dropdowns: getDropdownValues() || {},
      vendors: readTable("Vendors") || [],
      associates: readTable("Associates") || []
    };
  } catch(e) {
    return { success: false, message: e.message, projects: [], users: [], tasks: [], dropdowns: {}, vendors: [], associates: [] };
  }
}

/**
 * Batch data for Site Visits view.
 * Replaces: getCustomers, getProjects, getLeads, getSiteVisits, getUsers, getVendors, getAssociates (7 calls → 1)
 */
function getSiteVisitsViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getSiteVisitsViewData === "function") {
    return StudioSpaceCore.getSiteVisitsViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getSiteVisitsViewData === "function") {
    return StudioSpace.getSiteVisitsViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getSiteVisitsViewData === "function") {
    return NexMilestroCore.getSiteVisitsViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getSiteVisitsViewData === "function") {
    return NexMilestro.getSiteVisitsViewData();
  }
  try {
    return {
      success: true,
      customers: readTable("Customers") || [],
      projects: readTable("Projects") || [],
      leads: readTable("Leads") || [],
      siteVisits: readTable("SiteVisits") || [],
      users: readTable("Users") || [],
      vendors: readTable("Vendors") || [],
      associates: readTable("Associates") || []
    };
  } catch(e) {
    return { success: false, message: e.message, customers: [], projects: [], leads: [], siteVisits: [], users: [], vendors: [], associates: [] };
  }
}

/**
 * Batch data for Leads view.
 * Replaces: getUsers, getLeads, getDropdownValues (3 calls → 1)
 */
function getLeadsViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getLeadsViewData === "function") {
    return StudioSpaceCore.getLeadsViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getLeadsViewData === "function") {
    return StudioSpace.getLeadsViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getLeadsViewData === "function") {
    return NexMilestroCore.getLeadsViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getLeadsViewData === "function") {
    return NexMilestro.getLeadsViewData();
  }
  try {
    return {
      success: true,
      users: readTable("Users") || [],
      leads: readTable("Leads") || [],
      dropdowns: getDropdownValues() || {}
    };
  } catch(e) {
    return { success: false, message: e.message, users: [], leads: [], dropdowns: {} };
  }
}

/**
 * Batch data for Proposals view.
 * Replaces: getCustomers, getLeads, getProposals, getDropdownValues (4 calls → 1)
 */
function getProposalsViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getProposalsViewData === "function") {
    return StudioSpaceCore.getProposalsViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getProposalsViewData === "function") {
    return StudioSpace.getProposalsViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getProposalsViewData === "function") {
    return NexMilestroCore.getProposalsViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getProposalsViewData === "function") {
    return NexMilestro.getProposalsViewData();
  }
  try {
    return {
      success: true,
      customers: readTable("Customers") || [],
      leads: readTable("Leads") || [],
      proposals: readTable("Proposals") || [],
      dropdowns: getDropdownValues() || {}
    };
  } catch(e) {
    return { success: false, message: e.message, customers: [], leads: [], proposals: [], dropdowns: {} };
  }
}

/**
 * Batch data for Customers view.
 * Replaces: getCustomers, getUsers, getDropdownValues (3 calls → 1)
 */
function getCustomersViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getCustomersViewData === "function") {
    return StudioSpaceCore.getCustomersViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getCustomersViewData === "function") {
    return StudioSpace.getCustomersViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getCustomersViewData === "function") {
    return NexMilestroCore.getCustomersViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getCustomersViewData === "function") {
    return NexMilestro.getCustomersViewData();
  }
  try {
    return {
      success: true,
      customers: readTable("Customers") || [],
      users: readTable("Users") || [],
      dropdowns: getDropdownValues() || {}
    };
  } catch(e) {
    return { success: false, message: e.message, customers: [], users: [], dropdowns: {} };
  }
}

/**
 * Batch data for Vendors view.
 * Replaces: getVendors, getDropdownValues (2 calls → 1)
 */
function getVendorsViewData() {
  if (typeof StudioSpaceCore !== "undefined" && typeof StudioSpaceCore.getVendorsViewData === "function") {
    return StudioSpaceCore.getVendorsViewData();
  }
  if (typeof StudioSpace !== "undefined" && typeof StudioSpace.getVendorsViewData === "function") {
    return StudioSpace.getVendorsViewData();
  }
  if (typeof NexMilestroCore !== "undefined" && typeof NexMilestroCore.getVendorsViewData === "function") {
    return NexMilestroCore.getVendorsViewData();
  }
  if (typeof NexMilestro !== "undefined" && typeof NexMilestro.getVendorsViewData === "function") {
    return NexMilestro.getVendorsViewData();
  }
  try {
    return {
      success: true,
      vendors: readTable("Vendors") || [],
      dropdowns: getDropdownValues() || {}
    };
  } catch(e) {
    return { success: false, message: e.message, vendors: [], dropdowns: {} };
  }
}
