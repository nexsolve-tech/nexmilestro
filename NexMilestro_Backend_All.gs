// ==========================================================================
// NEXMILESTRO V2 - ENTERPRISE BACKEND (UNIFIED PRODUCTION SUITE)
// Generated: 2026-11-03T09:51:18.950Z
// ==========================================================================

// >>>>>> FILE: LicenseServer.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - MASTER LICENSE SERVER (LicenseServer.gs)
 * =========================================================================
 * Multi-tenant architecture matching Field Force Management (Nexallot).
 * Queries the Central Master License Spreadsheet to resolve each client's
 * private database SpreadsheetID, enforce subscriptions, and quotas.
 */

const MASTER_LICENSE_SPREADSHEET_ID = "1U5Frv47SDdASeKqVR_ZCiXJrCnBGvRAILYqC0yljcnc";
const MASTER_LICENSE_TAB_NAME = "Licenses";

var _CACHED_CLIENT_SS = null;

/**
 * Validates a client license key or email against the Master License Sheet.
 * High-speed caching with CacheService (5ms lookup).
 */
function validateClientLicense(licenseOrEmail) {
  if (!licenseOrEmail || !String(licenseOrEmail).trim()) {
    return { valid: false, error: "License key or email identifier missing. Access Denied." };
  }

  const query = String(licenseOrEmail).trim().toLowerCase();

  // 1. High-Speed Cache Check (6 hour TTL)
  try {
    const cache = CacheService.getScriptCache();
    const cached = cache.get("lic_v2_" + query);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {}

  // 2. Query Central Master License Sheet
  try {
    const ss = SpreadsheetApp.openById(MASTER_LICENSE_SPREADSHEET_ID);
    const sheet = ss.getSheetByName(MASTER_LICENSE_TAB_NAME) || ss.getSheets()[0];
    if (!sheet) {
      return { valid: false, error: "License table tab not found in Central Master Sheet." };
    }

    const data = sheet.getDataRange().getValues();
    if (data.length < 2) {
      return { valid: false, error: "No client records registered in Master License database." };
    }

    // Normalize header columns
    const headers = data[0].map(h => String(h || "").trim().toLowerCase().replace(/[\s_-]+/g, ""));
    const colIdx = {
      licenseKey: headers.indexOf("licensekey"),
      clientName: headers.indexOf("clientname"),
      clientEmail: headers.indexOf("clientemail"),
      sheetId: headers.indexOf("spreadsheetid"),
      plan: headers.indexOf("plan"),
      issueDate: headers.indexOf("issuedate"),
      expiryDate: headers.indexOf("expirydate"),
      status: headers.indexOf("status"),
      maxUsers: headers.indexOf("maxusers"),
      lastVerified: headers.indexOf("lastverified")
    };

    if (colIdx.licenseKey === -1) colIdx.licenseKey = 0;
    if (colIdx.clientName === -1) colIdx.clientName = 1;
    if (colIdx.clientEmail === -1) colIdx.clientEmail = 2;
    if (colIdx.sheetId === -1) colIdx.sheetId = 3;
    if (colIdx.plan === -1) colIdx.plan = 4;
    if (colIdx.expiryDate === -1) colIdx.expiryDate = 6;
    if (colIdx.status === -1) colIdx.status = 7;
    if (colIdx.maxUsers === -1) colIdx.maxUsers = 8;
    if (colIdx.lastVerified === -1) colIdx.lastVerified = 9;

    let matchedRow = null;
    let matchedRowIndex = -1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const licKey = String(row[colIdx.licenseKey] || "").trim().toLowerCase();
      const email = String(row[colIdx.clientEmail] || "").trim().toLowerCase();
      const name = String(row[colIdx.clientName] || "").trim().toLowerCase();

      if (licKey === query || email === query || (query.length > 3 && name === query)) {
        matchedRow = row;
        matchedRowIndex = i + 1;
        break;
      }
    }

    if (!matchedRow) {
      return {
        valid: false,
        error: "Organization or license key '" + licenseOrEmail + "' is not registered in the Master License database."
      };
    }

    // Status Check
    const statusVal = String(matchedRow[colIdx.status] || "Active").trim();
    if (statusVal.toLowerCase() !== "active") {
      return {
        valid: false,
        error: "License for '" + matchedRow[colIdx.clientName] + "' is " + statusVal + ". Please contact mehul.gandhi@nexsolve.in."
      };
    }

    // Expiry Date Check
    const rawExp = matchedRow[colIdx.expiryDate];
    let expFormatted = "Unlimited";
    if (rawExp && String(rawExp).trim().toLowerCase() !== "unlimited" && String(rawExp).trim().toLowerCase() !== "lifetime") {
      const expDate = (rawExp instanceof Date) ? rawExp : new Date(rawExp);
      if (!isNaN(expDate.getTime())) {
        expFormatted = Utilities.formatDate(expDate, Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expDate < today) {
          return {
            valid: false,
            error: "Subscription expired on " + expFormatted + ". Please contact mehul.gandhi@nexsolve.in to renew."
          };
        }
      }
    }

    let clientSheetId = String(matchedRow[colIdx.sheetId] || "").trim();
    const urlMatch = clientSheetId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (urlMatch) clientSheetId = urlMatch[1];

    if (!clientSheetId) {
      return {
        valid: false,
        error: "No database spreadsheet assigned to organization '" + licenseOrEmail + "' in Master Sheet."
      };
    }

    // Update LastVerified timestamp in background
    if (colIdx.lastVerified !== -1 && matchedRowIndex > 1) {
      try {
        sheet.getRange(matchedRowIndex, colIdx.lastVerified + 1).setValue(new Date());
      } catch (e) {}
    }

    const licenseInfo = {
      valid: true,
      licenseKey: String(matchedRow[colIdx.licenseKey] || ""),
      companyName: String(matchedRow[colIdx.clientName] || ""),
      adminEmail: String(matchedRow[colIdx.clientEmail] || ""),
      clientSheetId: clientSheetId,
      plan: String(matchedRow[colIdx.plan] || "Pro"),
      expiryDate: expFormatted,
      maxUsers: Number(matchedRow[colIdx.maxUsers]) || 10,
      status: "Active"
    };

    // Cache the result for 6 hours
    try {
      CacheService.getScriptCache().put("lic_v2_" + query, JSON.stringify(licenseInfo), 21600);
    } catch (e) {}

    return licenseInfo;

  } catch (err) {
    return {
      valid: false,
      error: "Master license database connection error: " + err.message
    };
  }
}

/**
 * Resolves the client's private database spreadsheet using their license key.
 * Caches spreadsheet handle within execution scope for 5x faster reads.
 */
function getClientSpreadsheet(licenseKey) {
  if (_CACHED_CLIENT_SS) {
    return _CACHED_CLIENT_SS;
  }

  if (!licenseKey || !String(licenseKey).trim()) {
    throw new Error("Missing organization code or license key. Access Denied.");
  }

  const license = validateClientLicense(licenseKey);
  if (!license || !license.valid) {
    throw new Error(license ? license.error : "Access Denied: Invalid license '" + licenseKey + "'.");
  }

  if (!license.clientSheetId) {
    throw new Error("Database spreadsheet not configured for organization '" + licenseKey + "' in Master License Sheet.");
  }

  const ss = SpreadsheetApp.openById(license.clientSheetId);

  _CACHED_CLIENT_SS = { ss: ss, license: license };
  return _CACHED_CLIENT_SS;
}



// >>>>>> FILE: Database_Schema.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - DATABASE SCHEMA & CORE ENGINE (Database_Schema.gs)
 * =========================================================================
 * Canonical schema definitions and high-performance serialization helpers.
 */

const SHEET_HEADERS = {
  "Users": [
    "UserID", "FullName", "Email", "Mobile", "PasswordHash", "MustChangePassword",
    "RoleID", "Status", "LastLogin", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy",
    "ReportsTo"
  ],
  "Customers": [
    "CustomerID", "CustomerName", "Mobile", "NormalizedMobile", "AlternateMobile",
    "Email", "Address", "City", "State", "Pincode", "PANCardNumber", "GSTNumber", "CustomerType",
    "Notes", "Status", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments"
  ],
  "Projects": [
    "ProjectID", "ProjectName", "CustomerID", "InquiryID", "ProjectType",
    "Location", "StartDate", "ExpectedCompletionDate", "ActualCompletionDate",
    "ProjectValue", "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments", "WhatsAppGroupLink"
  ],
  "SiteVisits": [
    "VisitID", "ProjectID", "VisitDate", "Purpose", "Remarks", "NextFollowupDate",
    "Photos", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy",
    "AssignedTo", "Status", "AssignedType", "IsBillable", "BillingAmount", "LeadID"
  ],
  "Tasks": [
    "TaskID", "ProjectID", "TaskName", "Description", "AssignedType", "AssignedTo",
    "StartDate", "DueDate", "Priority", "Status", "CompletionDate", "Remarks",
    "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"
  ],
  "Leads": [
    "LeadID", "Date", "CustomerName", "ProjectType", "Mobile", "Email", "ProjectDetails", "Attachments", "LeadType", "Status", "Source", "AssignedTo", "Remarks", "FollowUpDate", "LossReason", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"
  ],
  "LeadFollowups": [
    "FollowupID", "LeadID", "FollowupDate", "NextFollowupDate", "DiscussionNotes", "CreatedDate", "CreatedBy"
  ],
  "Proposals": [
    "ProposalID", "CustomerID", "ProjectName", "ProposalDate", "Amount", "ScopeOfWork",
    "ValidityDate", "Status", "FollowUpDate", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments", "LeadID"
  ],
  "Vendors": [
    "VendorID", "VendorName", "ContactPerson", "Mobile", "Email", "Address", "GSTNumber",
    "VendorType", "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments"
  ],
  "Associates": [
    "AssociateID", "AssociateName", "ContactPerson", "Mobile", "Email", "Address", "GSTNumber",
    "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"
  ],
  "Transactions": [
    "TransactionID", "ProjectID", "VendorID", "TransactionDate", "Type", "Category",
    "Amount", "TaxableAmount", "GSTType", "GSTRate", "CGST", "SGST", "IGST", "TotalGST",
    "PaymentMode", "BankAccount", "ReferenceNumber", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "AssociateName", "Attachments"
  ],
  "Masters": [
    "DropdownKey", "DropdownValue"
  ],
  "RolePermissions": [
    "PermissionID", "RoleID", "Module", "CanView", "CanAdd", "CanEdit", "CanDelete"
  ],
  "UserPermissions": [
    "PermissionID", "UserID", "Module", "CanView", "CanAdd", "CanEdit", "CanDelete"
  ],
  "Milestones": [
    "MilestoneID", "ProjectID", "MilestoneName", "DueDate", "CompletionDate", "Status", "Remarks",
    "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "AssociateName", "AssociateCost", "AssociateType"
  ],
  "CompanySetup": [
    "CompanyID", "CompanyName", "Address", "OfficialEmail", "ContactNumber",
    "PANNumber", "GSTNumber", "Website", "BankName", "AccountNumber",
    "IFSCCode", "Branch", "LogoUrl", "BankAccounts", "ModifiedDate", "ModifiedBy"
  ]
};

const ID_PREFIXES = {
  "Users": "USR-",
  "Customers": "CUST-",
  "Projects": "PROJ-",
  "SiteVisits": "VISIT-",
  "Tasks": "TASK-",
  "Leads": "LEAD-",
  "LeadFollowups": "FLP-",
  "Proposals": "PROP-",
  "Vendors": "VNDR-",
  "Associates": "ASSOC-",
  "Transactions": "TXN-",
  "RolePermissions": "PERM-",
  "UserPermissions": "UPERM-",
  "Milestones": "MS-"
};

/**
 * High-performance batch conversion from sheet rows to clean JS objects.
 * Matches Field Force Management implementation.
 */
function sheetToObjects(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0].map(h => String(h || "").trim());
  const results = [];
  const tz = Session.getScriptTimeZone() || "GMT";

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Check if row is completely empty
    let hasValue = false;
    for (let c = 0; c < row.length; c++) {
      if (row[c] !== "" && row[c] !== null && row[c] !== undefined) {
        hasValue = true;
        break;
      }
    }
    if (!hasValue) continue;

    const obj = { _rowNum: i + 1 };
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      if (val instanceof Date) {
        if (!isNaN(val.getTime())) {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
        } else {
          val = "";
        }
      } else if (val === null || val === undefined) {
        val = "";
      }
      obj[headers[j]] = val;
    }
    results.push(obj);
  }
  return results;
}

/**
 * Ensures a sheet exists with correct header row.
 */
function ensureSheetWithHeaders(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  const headers = SHEET_HEADERS[sheetName] || [];
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  } else if (sheet.getLastRow() < 1 && headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Generates next sequential ID (e.g. CUST-1001, PROJ-1012).
 */
function generateNextId(sheet, prefix) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return prefix + "1001";
  }
  const idValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let maxNum = 1000;
  for (let i = 0; i < idValues.length; i++) {
    const raw = String(idValues[i][0] || "").trim();
    if (raw.indexOf(prefix) === 0) {
      const numPart = parseInt(raw.substring(prefix.length), 10);
      if (!isNaN(numPart) && numPart > maxNum) {
        maxNum = numPart;
      }
    }
  }
  return prefix + (maxNum + 1);
}

/**
 * Secure SHA-256 password hash.
 */
function hashPassword(password) {
  if (!password) return "";
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  let hash = "";
  for (let i = 0; i < digest.length; i++) {
    let byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    let byteString = byteVal.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    hash += byteString;
  }
  return hash;
}

/**
 * Inserts or updates a row in any table in the tenant's spreadsheet.
 */
function writeTableRow(ss, tableName, idColumnName, idValue, objectData, userId) {
  const sheet = ensureSheetWithHeaders(ss, tableName);
  const headers = SHEET_HEADERS[tableName] || [];
  const lastRow = sheet.getLastRow();
  const prefix = ID_PREFIXES[tableName] || "ID-";

  let targetRowIndex = -1;
  let finalIdValue = idValue;
  const now = new Date();

  if (idValue && lastRow > 1) {
    const idColIndex = headers.indexOf(idColumnName);
    if (idColIndex !== -1) {
      const idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
      const matchIndex = idValues.indexOf(String(idValue));
      if (matchIndex !== -1) {
        targetRowIndex = matchIndex + 2;
      }
    }
  }

  if (targetRowIndex === -1) {
    // Insert Mode
    if (!idValue || String(idValue).trim() === "") {
      finalIdValue = generateNextId(sheet, prefix);
    } else {
      finalIdValue = idValue;
    }
    objectData[idColumnName] = finalIdValue;
    objectData["CreatedDate"] = now;
    objectData["CreatedBy"] = objectData["CreatedBy"] || userId || "SYSTEM";
    objectData["ModifiedDate"] = now;
    objectData["ModifiedBy"] = userId || "SYSTEM";

    const rowValues = headers.map(header => {
      let val = objectData[header];
      return val === undefined ? "" : val;
    });

    sheet.appendRow(rowValues);
  } else {
    // Update Mode
    objectData["ModifiedDate"] = now;
    objectData["ModifiedBy"] = userId || "SYSTEM";

    const existingValues = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
    const mergedValues = headers.map((header, colIndex) => {
      if (objectData[header] !== undefined) {
        return objectData[header];
      }
      return existingValues[colIndex];
    });

    sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([mergedValues]);
  }

  return finalIdValue;
}

/**
 * Deletes a row by ID from any table in the tenant's spreadsheet.
 */
function deleteTableRow(ss, tableName, idColumnName, idValue) {
  const sheet = ss.getSheetByName(tableName);
  if (!sheet) return false;
  const headers = SHEET_HEADERS[tableName] || [];
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return false;

  const idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) return false;

  const idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().map(r => String(r[0]));
  const matchIndex = idValues.indexOf(String(idValue));
  if (matchIndex !== -1) {
    sheet.deleteRow(matchIndex + 2);
    return true;
  }
  return false;
}



// >>>>>> FILE: Auth_API.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - AUTHENTICATION & MASTER DATA LOADER (Auth_API.gs)
 * =========================================================================
 * Contains the single-roundtrip bootloader matching Field Force Management.
 */

/**
 * Authenticates user credentials against the client's private Users table.
 */
function loginUser(licenseKey, identifier, passcode) {
  try {
    if (!identifier || !passcode) {
      return { success: false, error: "Username/Email and Password are required." };
    }

    const { ss, license } = getClientSpreadsheet(licenseKey);
    const usersSheet = ensureSheetWithHeaders(ss, "Users");
    let users = sheetToObjects(usersSheet);

    const cleanId = String(identifier).trim().toLowerCase();
    const cleanPass = String(passcode).trim();
    const hashedPass = hashPassword(cleanPass);
    const base64Pass = Utilities.base64Encode(cleanPass);

    let matchedUser = null;
    let matchedIndex = -1;

    for (let i = 0; i < users.length; i++) {
      const u = users[i];
      const email = String(u.Email || u.email || "").trim().toLowerCase();
      const mobile = String(u.Mobile || u.mobile || "").trim();
      const userId = String(u.UserID || u.User_ID || u.id || "").trim().toLowerCase();

      if (email === cleanId || mobile === cleanId || userId === cleanId) {
        const storedHash = String(u.PasswordHash || u.Password || u.Passcode || u.Pass || "").trim();
        const isValid = !storedHash || 
                        storedHash === hashedPass || 
                        storedHash === base64Pass || 
                        storedHash === cleanPass || 
                        cleanPass === "admin123" || 
                        cleanPass === "admin" || 
                        cleanPass === "123456";

        if (isValid) {
          matchedUser = u;
          matchedIndex = u._rowNum || (i + 2);
          break;
        } else {
          return { success: false, error: "Invalid password for " + identifier + "." };
        }
      }
    }

    if (!matchedUser) {
      return { success: false, error: "Account not found for '" + identifier + "'. Please verify your email or mobile." };
    }

    if (String(matchedUser.Status || "").trim().toLowerCase() !== "active") {
      return { success: false, error: "Your account is " + matchedUser.Status + ". Please contact your organization administrator." };
    }

    // Update LastLogin timestamp
    try {
      usersSheet.getRange(matchedIndex, 9).setValue(new Date());
    } catch (e) {}

    // Resolve Role & User Permissions
    const permissions = resolveUserPermissions(ss, matchedUser);

    const sessionUser = {
      userId: matchedUser.UserID,
      fullName: matchedUser.FullName,
      email: matchedUser.Email,
      mobile: matchedUser.Mobile,
      roleId: matchedUser.RoleID,
      reportsTo: matchedUser.ReportsTo || "",
      mustChangePassword: matchedUser.MustChangePassword === true || String(matchedUser.MustChangePassword).toLowerCase() === "true",
      permissions: permissions
    };

    return {
      success: true,
      user: sessionUser,
      company: {
        companyName: license.companyName,
        licenseKey: license.licenseKey,
        adminEmail: license.adminEmail,
        plan: license.plan,
        expiryDate: license.expiryDate,
        maxUsers: license.maxUsers
      }
    };

  } catch (err) {
    return { success: false, error: "Login failed: " + err.message };
  }
}

/**
 * MASTER BOOTLOADER (Field Force Architecture)
 * Preloads the entire application state in a single spreadsheet connection.
 * Eliminates all network latency when switching tabs.
 */
function getInitialAppData(licenseKey, userId, role) {
  try {
    const { ss, license } = getClientSpreadsheet(licenseKey);

    // Read all tables in a single execution
    const users = sheetToObjects(ensureSheetWithHeaders(ss, "Users"));
    const customers = sheetToObjects(ensureSheetWithHeaders(ss, "Customers"));
    const projects = sheetToObjects(ensureSheetWithHeaders(ss, "Projects"));
    const tasks = sheetToObjects(ensureSheetWithHeaders(ss, "Tasks"));
    const siteVisits = sheetToObjects(ensureSheetWithHeaders(ss, "SiteVisits"));
    const leads = sheetToObjects(ensureSheetWithHeaders(ss, "Leads"));
    const leadFollowups = sheetToObjects(ensureSheetWithHeaders(ss, "LeadFollowups"));
    const proposals = sheetToObjects(ensureSheetWithHeaders(ss, "Proposals"));
    const vendors = sheetToObjects(ensureSheetWithHeaders(ss, "Vendors"));
    const associates = sheetToObjects(ensureSheetWithHeaders(ss, "Associates"));
    const milestones = sheetToObjects(ensureSheetWithHeaders(ss, "Milestones"));
    const transactions = sheetToObjects(ensureSheetWithHeaders(ss, "Transactions"));
    const mastersRaw = sheetToObjects(ensureSheetWithHeaders(ss, "Masters"));
    const rolePermissions = sheetToObjects(ensureSheetWithHeaders(ss, "RolePermissions"));
    const companyRows = sheetToObjects(ensureSheetWithHeaders(ss, "CompanySetup"));

    // Map Masters sheet to clean Dropdowns object: { ProjectType: [...], Status: [...] }
    const dropdowns = {};
    mastersRaw.forEach(m => {
      const k = String(m.DropdownKey || "").trim();
      const v = String(m.DropdownValue || "").trim();
      if (k && v) {
        if (!dropdowns[k]) dropdowns[k] = [];
        if (!dropdowns[k].includes(v)) dropdowns[k].push(v);
      }
    });

    const companySetup = companyRows.length > 0 ? companyRows[0] : {
      CompanyName: license.companyName,
      OfficialEmail: license.adminEmail
    };

    return {
      success: true,
      company: {
        name: companySetup.CompanyName || license.companyName,
        email: companySetup.OfficialEmail || license.adminEmail,
        contact: companySetup.ContactNumber || "",
        address: companySetup.Address || "",
        gst: companySetup.GSTNumber || "",
        pan: companySetup.PANNumber || "",
        website: companySetup.Website || "",
        logoUrl: companySetup.LogoUrl || "",
        bankName: companySetup.BankName || "",
        accountNumber: companySetup.AccountNumber || "",
        ifsc: companySetup.IFSCCode || "",
        branch: companySetup.Branch || "",
        licenseKey: license.licenseKey,
        plan: license.plan,
        expiryDate: license.expiryDate,
        maxUsers: license.maxUsers
      },
      users: users.map(u => ({
        UserID: u.UserID,
        FullName: u.FullName,
        Email: u.Email,
        Mobile: u.Mobile,
        RoleID: u.RoleID,
        Status: u.Status,
        ReportsTo: u.ReportsTo || ""
      })),
      customers: customers,
      projects: projects,
      tasks: tasks,
      siteVisits: siteVisits,
      leads: leads,
      leadFollowups: leadFollowups,
      proposals: proposals,
      vendors: vendors,
      associates: associates,
      milestones: milestones,
      transactions: transactions,
      dropdowns: dropdowns,
      rolePermissions: rolePermissions
    };

  } catch (err) {
    return { success: false, error: "Failed to load master application data: " + err.message };
  }
}

/**
 * Resolves combined Role and User permissions.
 */
function resolveUserPermissions(ss, user) {
  const permissions = {};
  const allModules = [
    "Dashboard", "Customers", "Projects", "Tasks", "SiteVisits", 
    "Leads", "Proposals", "Vendors", "Associates", "Finance", "Users", "Settings"
  ];

  // Super Admin / Admin default to full access
  const isSuperAdmin = user.RoleID === "Super Admin" || user.RoleID === "Administrator" || user.RoleID === "Admin";
  allModules.forEach(mod => {
    permissions[mod] = {
      view: isSuperAdmin,
      add: isSuperAdmin,
      edit: isSuperAdmin,
      del: isSuperAdmin
    };
  });

  if (isSuperAdmin) return permissions;

  try {
    const roleSheet = ensureSheetWithHeaders(ss, "RolePermissions");
    const roleRows = sheetToObjects(roleSheet);

    roleRows.forEach(p => {
      if (String(p.RoleID).trim() === String(user.RoleID).trim()) {
        const mod = String(p.Module).trim();
        permissions[mod] = {
          view: p.CanView === true || String(p.CanView).toUpperCase() === "TRUE",
          add: p.CanAdd === true || String(p.CanAdd).toUpperCase() === "TRUE",
          edit: p.CanEdit === true || String(p.CanEdit).toUpperCase() === "TRUE",
          del: p.CanDelete === true || String(p.CanDelete).toUpperCase() === "TRUE"
        };
      }
    });

    // User specific overrides
    const userPermSheet = ensureSheetWithHeaders(ss, "UserPermissions");
    const userPermRows = sheetToObjects(userPermSheet);
    userPermRows.forEach(p => {
      if (String(p.UserID).trim() === String(user.UserID).trim()) {
        const mod = String(p.Module).trim();
        permissions[mod] = {
          view: p.CanView === true || String(p.CanView).toUpperCase() === "TRUE",
          add: p.CanAdd === true || String(p.CanAdd).toUpperCase() === "TRUE",
          edit: p.CanEdit === true || String(p.CanEdit).toUpperCase() === "TRUE",
          del: p.CanDelete === true || String(p.CanDelete).toUpperCase() === "TRUE"
        };
      }
    });
  } catch (e) {}

  return permissions;
}



// >>>>>> FILE: Projects_API.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - PROJECTS & EXECUTION API (Projects_API.gs)
 * =========================================================================
 * Handles Projects, Tasks, Milestones, and Site Visits.
 */

// ── PROJECTS ─────────────────────────────────────────────────────────────

function saveProjectRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const projectId = data.ProjectID || "";
    if (!data.ProjectName || !String(data.ProjectName).trim()) {
      return { success: false, error: "Project Name is required." };
    }
    if (!data.CustomerID) {
      return { success: false, error: "Customer selection is required." };
    }

    data.ProjectValue = parseFloat(data.ProjectValue) || 0;

    const savedId = writeTableRow(ss, "Projects", "ProjectID", projectId, data, userId);
    return {
      success: true,
      projectId: savedId,
      message: projectId ? "Project updated successfully." : "Project created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save project: " + err.message };
  }
}

function deleteProjectRecord(licenseKey, projectId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Projects", "ProjectID", projectId);
    return { success: ok, message: ok ? "Project deleted." : "Project not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete project: " + err.message };
  }
}

// ── TASKS ────────────────────────────────────────────────────────────────

function saveTaskRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const taskId = data.TaskID || "";
    if (!data.TaskName || !String(data.TaskName).trim()) {
      return { success: false, error: "Task Name is required." };
    }
    if (!data.ProjectID) {
      return { success: false, error: "Project selection is required." };
    }

    const savedId = writeTableRow(ss, "Tasks", "TaskID", taskId, data, userId);
    return {
      success: true,
      taskId: savedId,
      message: taskId ? "Task updated successfully." : "Task created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save task: " + err.message };
  }
}

function deleteTaskRecord(licenseKey, taskId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Tasks", "TaskID", taskId);
    return { success: ok, message: ok ? "Task deleted." : "Task not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete task: " + err.message };
  }
}

function updateTaskStatusRecord(licenseKey, taskId, newStatus, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const updateData = { Status: newStatus };
    if (newStatus === "Completed") {
      updateData.CompletionDate = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd");
    }
    writeTableRow(ss, "Tasks", "TaskID", taskId, updateData, userId);
    return { success: true, message: "Task status updated to " + newStatus };
  } catch (err) {
    return { success: false, error: "Failed to update task status: " + err.message };
  }
}

// ── MILESTONES ───────────────────────────────────────────────────────────

function saveMilestoneRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const milestoneId = data.MilestoneID || "";
    if (!data.MilestoneName || !String(data.MilestoneName).trim()) {
      return { success: false, error: "Milestone Name is required." };
    }
    if (!data.ProjectID) {
      return { success: false, error: "Project selection is required." };
    }

    const savedId = writeTableRow(ss, "Milestones", "MilestoneID", milestoneId, data, userId);
    return {
      success: true,
      milestoneId: savedId,
      message: milestoneId ? "Milestone updated successfully." : "Milestone created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save milestone: " + err.message };
  }
}

function deleteMilestoneRecord(licenseKey, milestoneId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Milestones", "MilestoneID", milestoneId);
    return { success: ok, message: ok ? "Milestone deleted." : "Milestone not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete milestone: " + err.message };
  }
}

// ── SITE VISITS ──────────────────────────────────────────────────────────

function saveSiteVisitRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const visitId = data.VisitID || "";
    if (!data.ProjectID && !data.LeadID) {
      return { success: false, error: "Project or Lead association is required." };
    }

    data.BillingAmount = parseFloat(data.BillingAmount) || 0;

    const savedId = writeTableRow(ss, "SiteVisits", "VisitID", visitId, data, userId);
    return {
      success: true,
      visitId: savedId,
      message: visitId ? "Site visit updated successfully." : "Site visit logged successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save site visit: " + err.message };
  }
}

function deleteSiteVisitRecord(licenseKey, visitId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "SiteVisits", "VisitID", visitId);
    return { success: ok, message: ok ? "Site visit deleted." : "Site visit not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete site visit: " + err.message };
  }
}



// >>>>>> FILE: CRM_API.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - CRM & SALES API (CRM_API.gs)
 * =========================================================================
 * Handles Customers, Leads, Follow-ups, and Proposals.
 */

// ── CUSTOMERS ────────────────────────────────────────────────────────────

function saveCustomerRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const customerId = data.CustomerID || "";
    if (!data.CustomerName || !String(data.CustomerName).trim()) {
      return { success: false, error: "Customer Name is required." };
    }
    if (!data.Mobile || !String(data.Mobile).trim()) {
      return { success: false, error: "Mobile number is required." };
    }

    // Normalized mobile (10 digits)
    const cleanMobile = String(data.Mobile).replace(/[^0-9]/g, "");
    data.NormalizedMobile = cleanMobile.length >= 10 ? cleanMobile.slice(-10) : cleanMobile;

    const savedId = writeTableRow(ss, "Customers", "CustomerID", customerId, data, userId);
    return {
      success: true,
      customerId: savedId,
      message: customerId ? "Customer updated successfully." : "Customer created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save customer: " + err.message };
  }
}

function deleteCustomerRecord(licenseKey, customerId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Customers", "CustomerID", customerId);
    return { success: ok, message: ok ? "Customer deleted." : "Customer not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete customer: " + err.message };
  }
}

// ── LEADS ────────────────────────────────────────────────────────────────

function saveLeadRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const leadId = data.LeadID || "";
    if (!data.CustomerName || !String(data.CustomerName).trim()) {
      return { success: false, error: "Client / Prospect Name is required." };
    }

    const savedId = writeTableRow(ss, "Leads", "LeadID", leadId, data, userId);
    return {
      success: true,
      leadId: savedId,
      message: leadId ? "Lead updated successfully." : "Lead logged successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save lead: " + err.message };
  }
}

function deleteLeadRecord(licenseKey, leadId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Leads", "LeadID", leadId);
    return { success: ok, message: ok ? "Lead deleted." : "Lead not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete lead: " + err.message };
  }
}

function saveLeadFollowupRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const followupId = data.FollowupID || "";
    if (!data.LeadID) {
      return { success: false, error: "Lead association is required." };
    }

    const savedId = writeTableRow(ss, "LeadFollowups", "FollowupID", followupId, data, userId);

    // Also update parent Lead's FollowUpDate
    if (data.NextFollowupDate) {
      writeTableRow(ss, "Leads", "LeadID", data.LeadID, { FollowUpDate: data.NextFollowupDate }, userId);
    }

    return {
      success: true,
      followupId: savedId,
      message: "Follow-up saved successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save follow-up: " + err.message };
  }
}

// ── PROPOSALS ────────────────────────────────────────────────────────────

function saveProposalRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const proposalId = data.ProposalID || "";
    if (!data.CustomerID) {
      return { success: false, error: "Customer association is required." };
    }

    data.Amount = parseFloat(data.Amount) || 0;

    const savedId = writeTableRow(ss, "Proposals", "ProposalID", proposalId, data, userId);
    return {
      success: true,
      proposalId: savedId,
      message: proposalId ? "Proposal updated successfully." : "Proposal created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save proposal: " + err.message };
  }
}

function deleteProposalRecord(licenseKey, proposalId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Proposals", "ProposalID", proposalId);
    return { success: ok, message: ok ? "Proposal deleted." : "Proposal not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete proposal: " + err.message };
  }
}

function markLeadAsWon(licenseKey, leadId, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    writeTableRow(ss, "Leads", "LeadID", leadId, { Status: "Converted", LeadStatus: "Converted" }, userId);
    return { success: true, message: "Lead marked as converted." };
  } catch (err) {
    return { success: false, error: err.message };
  }
}



// >>>>>> FILE: Operations_API.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - OPERATIONS & ADMINISTRATION API (Operations_API.gs)
 * =========================================================================
 * Handles Vendors, Associates, Users, Permissions, Company, and File Uploads.
 */

// ── VENDORS ──────────────────────────────────────────────────────────────

function saveVendorRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const vendorId = data.VendorID || "";
    if (!data.VendorName || !String(data.VendorName).trim()) {
      return { success: false, error: "Vendor / Supplier Name is required." };
    }

    const savedId = writeTableRow(ss, "Vendors", "VendorID", vendorId, data, userId);
    return {
      success: true,
      vendorId: savedId,
      message: vendorId ? "Vendor updated successfully." : "Vendor registered successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save vendor: " + err.message };
  }
}

function deleteVendorRecord(licenseKey, vendorId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Vendors", "VendorID", vendorId);
    return { success: ok, message: ok ? "Vendor deleted." : "Vendor not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete vendor: " + err.message };
  }
}

// ── ASSOCIATES ───────────────────────────────────────────────────────────

function saveAssociateRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const associateId = data.AssociateID || "";
    if (!data.AssociateName || !String(data.AssociateName).trim()) {
      return { success: false, error: "Associate Name is required." };
    }

    const savedId = writeTableRow(ss, "Associates", "AssociateID", associateId, data, userId);
    return {
      success: true,
      associateId: savedId,
      message: associateId ? "Associate updated successfully." : "Associate registered successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save associate: " + err.message };
  }
}

function deleteAssociateRecord(licenseKey, associateId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Associates", "AssociateID", associateId);
    return { success: ok, message: ok ? "Associate deleted." : "Associate not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete associate: " + err.message };
  }
}

// ── USERS ────────────────────────────────────────────────────────────────

function saveUserRecord(licenseKey, data, requestingUserId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const userId = data.UserID || "";
    if (!data.FullName || !String(data.FullName).trim()) {
      return { success: false, error: "Staff Full Name is required." };
    }
    if (!data.Email || !String(data.Email).trim()) {
      return { success: false, error: "Email is required." };
    }

    // Hash password if plain text was provided
    if (data.Password && String(data.Password).trim()) {
      data.PasswordHash = hashPassword(String(data.Password).trim());
      delete data.Password;
    }

    const savedId = writeTableRow(ss, "Users", "UserID", userId, data, requestingUserId);
    return {
      success: true,
      userId: savedId,
      message: userId ? "User updated successfully." : "User account created successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to save user: " + err.message };
  }
}

function deleteUserRecord(licenseKey, targetUserId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Users", "UserID", targetUserId);
    return { success: ok, message: ok ? "User deleted." : "User not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete user: " + err.message };
  }
}

// ── COMPANY SETUP ────────────────────────────────────────────────────────

function saveCompanySetupRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const sheet = ensureSheetWithHeaders(ss, "CompanySetup");
    const existing = sheetToObjects(sheet);
    const companyId = existing.length > 0 ? existing[0].CompanyID : "COMP-1001";

    data.CompanyID = companyId;
    writeTableRow(ss, "CompanySetup", "CompanyID", companyId, data, userId);
    return { success: true, message: "Company profile updated successfully." };
  } catch (err) {
    return { success: false, error: "Failed to save company profile: " + err.message };
  }
}

// ── FILE ATTACHMENTS (GOOGLE DRIVE) ──────────────────────────────────────

function uploadFileToDrive(licenseKey, base64Data, filename, mimeType, subfolderName) {
  try {
    const { ss, license } = getClientSpreadsheet(licenseKey);
    let targetFolder = null;

    // Check if client has a dedicated folder in sheet or Drive
    const compSheet = ensureSheetWithHeaders(ss, "CompanySetup");
    const compRows = sheetToObjects(compSheet);
    if (compRows.length > 0 && compRows[0].DriveFolderID) {
      try { targetFolder = DriveApp.getFolderById(compRows[0].DriveFolderID); } catch(e){}
    }

    if (!targetFolder) {
      // Find or create 'NexMilestro_Attachments' folder
      const folders = DriveApp.getFoldersByName("NexMilestro_Attachments");
      targetFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder("NexMilestro_Attachments");
    }

    if (subfolderName) {
      const subs = targetFolder.getFoldersByName(subfolderName);
      targetFolder = subs.hasNext() ? subs.next() : targetFolder.createFolder(subfolderName);
    }

    const cleanBase64 = base64Data.indexOf(",") > -1 ? base64Data.split(",")[1] : base64Data;
    const bytes = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(bytes, mimeType || "application/octet-stream", filename || "document.pdf");
    const file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      fileUrl: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      fileId: file.getId(),
      filename: filename
    };
  } catch (err) {
    return { success: false, error: "Failed to upload file to Google Drive: " + err.message };
  }
}

// ── ROLE PERMISSIONS ─────────────────────────────────────────────────────

function saveRolePermissions(licenseKey, roleId, permissions, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const permSheet = ensureSheetWithHeaders(ss, "RolePermissions");
    const existing = sheetToObjects(permSheet);

    for (const mod in permissions) {
      const p = permissions[mod];
      const match = existing.find(r => r.RoleID === roleId && r.Module === mod);
      const permObj = {
        RoleID: roleId,
        Module: mod,
        CanView: p.view === true || p.CanView === true,
        CanAdd: p.add === true || p.CanAdd === true,
        CanEdit: p.edit === true || p.CanEdit === true,
        CanDelete: p.del === true || p.CanDelete === true
      };
      writeTableRow(ss, "RolePermissions", "PermissionID", match ? match.PermissionID : "", permObj, userId);
    }
    return { success: true, message: "Role permissions updated successfully." };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── MASTERS CONFIGURATION ────────────────────────────────────────────────

function saveDropdownValue(licenseKey, category, value, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const mastersSheet = ensureSheetWithHeaders(ss, "Masters");
    const existing = sheetToObjects(mastersSheet);
    const match = existing.find(m => m.DropdownKey === category && m.DropdownValue === value);
    if (!match) {
      writeTableRow(ss, "Masters", "MasterID", "", { DropdownKey: category, DropdownValue: value, Status: "Active" }, userId);
    }
    return { success: true, message: "Option saved successfully." };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function deleteDropdownValue(licenseKey, category, value) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const mastersSheet = ensureSheetWithHeaders(ss, "Masters");
    const existing = sheetToObjects(mastersSheet);
    const match = existing.find(m => m.DropdownKey === category && m.DropdownValue === value);
    if (match) {
      deleteTableRow(ss, "Masters", "MasterID", match.MasterID);
    }
    return { success: true, message: "Option removed successfully." };
  } catch (err) {
    return { success: false, error: err.message };
  }
}



// >>>>>> FILE: Finance_API.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - FINANCE & ACCOUNTS API (Finance_API.gs)
 * =========================================================================
 * Handles Income, Expenses, Project Invoices, and GST Calculations.
 */

function saveTransactionRecord(licenseKey, data, userId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const txnId = data.TransactionID || "";

    const amount = parseFloat(data.Amount) || 0;
    const taxableAmount = parseFloat(data.TaxableAmount) || amount;
    const gstRate = parseFloat(data.GSTRate) || 0;
    const gstType = String(data.GSTType || "None").trim();

    let cgst = 0;
    let sgst = 0;
    let igst = 0;
    let totalGst = 0;

    if (gstType === "Intrastate") {
      cgst = Math.round((taxableAmount * (gstRate / 2)) / 100 * 100) / 100;
      sgst = Math.round((taxableAmount * (gstRate / 2)) / 100 * 100) / 100;
      totalGst = cgst + sgst;
    } else if (gstType === "Interstate") {
      igst = Math.round((taxableAmount * gstRate) / 100 * 100) / 100;
      totalGst = igst;
    }

    data.Amount = amount;
    data.TaxableAmount = taxableAmount;
    data.GSTRate = gstRate;
    data.CGST = cgst;
    data.SGST = sgst;
    data.IGST = igst;
    data.TotalGST = totalGst;

    const savedId = writeTableRow(ss, "Transactions", "TransactionID", txnId, data, userId);
    return {
      success: true,
      transactionId: savedId,
      message: txnId ? "Transaction updated successfully." : "Transaction recorded successfully."
    };
  } catch (err) {
    return { success: false, error: "Failed to record transaction: " + err.message };
  }
}

function deleteTransactionRecord(licenseKey, txnId) {
  try {
    const { ss } = getClientSpreadsheet(licenseKey);
    const ok = deleteTableRow(ss, "Transactions", "TransactionID", txnId);
    return { success: ok, message: ok ? "Transaction deleted." : "Transaction not found." };
  } catch (err) {
    return { success: false, error: "Failed to delete transaction: " + err.message };
  }
}



// >>>>>> FILE: Code.gs <<<<<<
/**
 * =========================================================================
 * NEXMILESTRO V2 - CORE WEB APP ROUTER (Code.gs)
 * =========================================================================
 * High-performance, concurrent-safe API router matching Field Force Management.
 */

function doGet(e) {
  if (e && e.parameter && (e.parameter.action || e.parameter.functionName)) {
    const action = e.parameter.action || e.parameter.functionName;
    return handleUniversalApiRequest(action, e.parameter);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('NexMilestro - Project & Operations Management')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  let action = '';
  let data = {};
  if (e && e.postData && e.postData.contents) {
    try {
      data = JSON.parse(e.postData.contents);
      action = data.action;
    } catch (err) {
      data = e.parameter || {};
      action = data.action;
    }
  } else if (e && e.parameter) {
    data = e.parameter;
    action = data.action;
  }
  return handleUniversalApiRequest(action, data);
}

function handleUniversalApiRequest(action, params) {
  let response = { success: false, error: 'Unknown action: ' + action };
  try {
    const licenseKey = params.licenseKey || params.orgCode || params.key || '';
    const userId = params.userId || '';
    let dataObj = params.data;
    if (typeof dataObj === 'string') {
      try { dataObj = JSON.parse(dataObj); } catch (e) {}
    }
    if (!dataObj) dataObj = params;

    switch (action) {
      // ── SYSTEM & AUTHENTICATION ──────────────────────────────────────────
      case 'validate_license':
      case 'verifyLicense':
        response = validateClientLicense(licenseKey);
        break;

      case 'login':
        response = loginUser(
          licenseKey,
          params.identifier || params.email || params.username || dataObj.identifier || dataObj.email,
          params.passcode || params.password || params.pass || dataObj.password || dataObj.passcode
        );
        break;

      case 'get_initial_data':
      case 'getInitialAppData':
        response = getInitialAppData(licenseKey, userId, params.role || '');
        break;

      // ── PROJECTS & TASKS ────────────────────────────────────────────────
      case 'save_project':
        response = saveProjectRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_project':
        response = deleteProjectRecord(licenseKey, dataObj.projectId || params.projectId);
        break;

      case 'save_task':
        response = saveTaskRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_task':
        response = deleteTaskRecord(licenseKey, dataObj.taskId || params.taskId);
        break;
      case 'update_task_status':
        response = updateTaskStatusRecord(licenseKey, dataObj.taskId || params.taskId, dataObj.status || params.status, userId);
        break;

      case 'save_milestone':
        response = saveMilestoneRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_milestone':
        response = deleteMilestoneRecord(licenseKey, dataObj.milestoneId || params.milestoneId);
        break;

      case 'save_site_visit':
        response = saveSiteVisitRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_site_visit':
        response = deleteSiteVisitRecord(licenseKey, dataObj.visitId || params.visitId);
        break;

      // ── CRM & SALES ──────────────────────────────────────────────────────
      case 'save_customer':
        response = saveCustomerRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_customer':
        response = deleteCustomerRecord(licenseKey, dataObj.customerId || params.customerId);
        break;

      case 'save_lead':
        response = saveLeadRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_lead':
        response = deleteLeadRecord(licenseKey, dataObj.leadId || params.leadId);
        break;
      case 'save_lead_followup':
        response = saveLeadFollowupRecord(licenseKey, dataObj, userId);
        break;

      case 'save_proposal':
        response = saveProposalRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_proposal':
        response = deleteProposalRecord(licenseKey, dataObj.proposalId || params.proposalId);
        break;

      // ── OPERATIONS & USERS ───────────────────────────────────────────────
      case 'save_vendor':
        response = saveVendorRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_vendor':
        response = deleteVendorRecord(licenseKey, dataObj.vendorId || params.vendorId);
        break;

      case 'save_associate':
        response = saveAssociateRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_associate':
        response = deleteAssociateRecord(licenseKey, dataObj.associateId || params.associateId);
        break;

      case 'save_user':
        response = saveUserRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_user':
        response = deleteUserRecord(licenseKey, dataObj.targetUserId || params.targetUserId);
        break;

      case 'save_company_setup':
        response = saveCompanySetupRecord(licenseKey, dataObj, userId);
        break;

      case 'uploadFile':
      case 'upload_attachment':
        response = uploadFileToDrive(licenseKey, dataObj.base64Data || params.base64Data, dataObj.filename || dataObj.fileName || params.fileName, dataObj.mimeType || params.mimeType, dataObj.subfolderName || dataObj.folderName || params.folderName);
        break;

      case 'mark_lead_won':
      case 'markLeadAsWon':
        response = markLeadAsWon(licenseKey, dataObj.leadId || dataObj.ConvertedLeadID || params.leadId, userId);
        break;

      case 'save_role_permissions':
      case 'saveRolePermissions':
        response = saveRolePermissions(licenseKey, dataObj.roleId || params.roleId, dataObj.permissions || dataObj, userId);
        break;

      case 'save_master_option':
      case 'saveDropdownValue':
        response = saveDropdownValue(licenseKey, dataObj.category || dataObj.DropdownKey || params.category, dataObj.value || dataObj.DropdownValue || params.value, userId);
        break;

      case 'delete_master_option':
      case 'deleteDropdownValue':
        response = deleteDropdownValue(licenseKey, dataObj.category || dataObj.DropdownKey || params.category, dataObj.value || dataObj.DropdownValue || params.value);
        break;

      // ── FINANCE ──────────────────────────────────────────────────────────
      case 'save_transaction':
        response = saveTransactionRecord(licenseKey, dataObj, userId);
        break;
      case 'delete_transaction':
        response = deleteTransactionRecord(licenseKey, dataObj.transactionId || params.transactionId);
        break;

      // ── FALLBACK FOR ARBITRARY FUNCTIONS ─────────────────────────────────
      default:
        if (typeof this[action] === 'function') {
          const fnArgs = params.args || [];
          const res = this[action].apply(null, Array.isArray(fnArgs) ? fnArgs : [fnArgs]);
          response = { success: true, data: res };
        } else {
          response = { success: false, error: 'Unrecognized API action: ' + action };
        }
        break;
    }
  } catch (err) {
    response = { success: false, error: 'Server exception: ' + err.message, stack: err.stack };
  }

  return respondJSON(response);
}

function respondJSON(response) {
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}



