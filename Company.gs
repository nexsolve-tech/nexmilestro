/**
 * Company.gs
 * Handles reading and updating the Organization Profile & Branding Setup.
 */

/**
 * Gets the current company profile setup.
 * Returns default values if no record exists yet.
 */
function getCompanySetup() {
  try {
    const rows = readTable("CompanySetup");
    if (rows && rows.length > 0) {
      return rows[0];
    }
    return {
      CompanyID: "CMP-001",
      CompanyName: "StudioSpace Interiors",
      Address: "",
      OfficialEmail: "",
      ContactNumber: "",
      PANNumber: "",
      GSTNumber: "",
      Website: "",
      BankName: "",
      AccountNumber: "",
      IFSCCode: "",
      Branch: "",
      LogoUrl: ""
    };
  } catch (e) {
    console.error("Error in getCompanySetup:", e);
    return {
      CompanyID: "CMP-001",
      CompanyName: "StudioSpace Interiors",
      Address: "",
      OfficialEmail: "",
      ContactNumber: "",
      PANNumber: "",
      GSTNumber: "",
      Website: "",
      BankName: "",
      AccountNumber: "",
      IFSCCode: "",
      Branch: "",
      LogoUrl: ""
    };
  }
}

/**
 * Saves or updates company setup profile and handles company logo upload.
 */
function saveCompanySetup(companyData, logoFileData, userId) {
  try {
    const lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) {
      return { success: false, message: "System is busy, please try again." };
    }

    let logoUrl = companyData.LogoUrl || "";

    // Upload logo image if provided
    if (logoFileData && logoFileData.base64 && logoFileData.filename) {
      try {
        const rootFolder = getCustomerFolder("System", "Company_Assets");
        const blob = Utilities.newBlob(
          Utilities.base64Decode(logoFileData.base64),
          logoFileData.mimeType || "image/png",
          "Company_Logo_" + logoFileData.filename
        );
        const file = rootFolder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        logoUrl = "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w1000";
      } catch (fileErr) {
        console.error("Logo upload error:", fileErr);
      }
    }

    let bankAccountsJson = "";
    if (typeof companyData.BankAccounts === "string") {
      bankAccountsJson = companyData.BankAccounts;
    } else if (companyData.BankAccounts) {
      bankAccountsJson = JSON.stringify(companyData.BankAccounts);
    }

    const now = new Date().toISOString();
    const rows = readTable("CompanySetup");
    const existing = (rows && rows.length > 0) ? rows[0] : null;

    const record = {
      CompanyID: existing ? existing.CompanyID : "CMP-001",
      CompanyName: companyData.CompanyName || "StudioSpace Interiors",
      Address: companyData.Address || "",
      OfficialEmail: companyData.OfficialEmail || "",
      ContactNumber: companyData.ContactNumber || "",
      PANNumber: (companyData.PANNumber || "").toUpperCase(),
      GSTNumber: (companyData.GSTNumber || "").toUpperCase(),
      Website: companyData.Website || "",
      BankName: companyData.BankName || "",
      AccountNumber: companyData.AccountNumber || "",
      IFSCCode: (companyData.IFSCCode || "").toUpperCase(),
      Branch: companyData.Branch || "",
      LogoUrl: logoUrl,
      BankAccounts: bankAccountsJson,
      ModifiedDate: now,
      ModifiedBy: userId || "Admin"
    };

    writeTableRow("CompanySetup", "CompanyID", record.CompanyID, record, userId);

    lock.releaseLock();
    return {
      success: true,
      message: "Company setup saved successfully!",
      company: record
    };
  } catch (e) {
    console.error("Error in saveCompanySetup:", e);
    return { success: false, message: "Failed to save company setup: " + e.message };
  }
}

/**
 * Returns Google Sheets native export URL to download entire workbook as .xlsx Excel file
 */
function getSystemBackupDownloadUrl() {
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
 * Erases operational data from Google Sheets (Super Admin Security Enforcement)
 */
function eraseAllSystemData(confirmCode, userId) {
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
