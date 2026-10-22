/**
 * Database.gs
 * Exposes core utility functions for reading and writing data to Google Sheets.
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
 * Safe spreadsheet acquisition utility.
 * Supports container-bound connections and falls back to SPREADSHEET_ID script property.
 */
function getSpreadsheet() {
  let ss = null;
  const propId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (propId && String(propId).trim() !== "") {
    try {
      ss = SpreadsheetApp.openById(String(propId).trim());
    } catch(e) {}
  }
  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {}
  }
  if (!ss) {
    throw new Error("Spreadsheet Connection Error: No active spreadsheet is bound to this script. " +
                    "Please bind this script to a Google Sheet (Extensions > Apps Script inside the sheet), " +
                    "or set the SPREADSHEET_ID script property under Settings > Script Properties.");
  }
  return ss;
}

/**
 * Initializes the database. Creates sheets if they don't exist
 * and sets up headers. Also inserts a default admin user.
 */
function setupSpreadsheet() {
  const ss = getSpreadsheet();
  let forceReset = false;
  try {
    const ui = SpreadsheetApp.getUi();
    const response = ui.alert("Database Reset", "Do you want to reset all spreadsheet sheets? This will delete all existing rows and write fresh, clean dummy records for all 10 modules.", ui.ButtonSet.YES_NO);
    if (response === ui.Button.YES) {
      forceReset = true;
    }
  } catch (e) {
    // Falls back to true when executed from the Apps Script editor directly
    forceReset = true;
  }
  
  for (const sheetName in SHEET_HEADERS) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    
    // Clear and set headers if sheet is empty or headers mismatch
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const headers = SHEET_HEADERS[sheetName];
    
    if (lastRow === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    } else {
      // Ensure headers are correct
      const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const match = headers.every((h, i) => currentHeaders[i] === h);
      if (!match) {
        // If they don't match, overwrite first row
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
    }
  }
  
  // Seed Users
  const userSheet = ss.getSheetByName("Users");
  if (forceReset || userSheet.getLastRow() <= 1) {
    if (userSheet.getLastRow() > 1) {
      userSheet.getRange(2, 1, userSheet.getLastRow() - 1, userSheet.getLastColumn()).clearContent();
    }
    const adminEmail = "admin@example.com";
    const defaultPassword = "admin";
    const adminHash = hashPassword(defaultPassword);
    const sarahHash = hashPassword("sarah123");
    const alexHash = hashPassword("alex123");
    const rajeshHash = hashPassword("rajesh123");
    const priyaHash = hashPassword("priya123");
    
    const userRows = [
      ["USR-1001", "Administrator", adminEmail, "9999999999", adminHash, "No", "Super Admin", "Active", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["USR-1002", "Sarah the Architect", "sarah@example.com", "9876543211", sarahHash, "No", "Architect", "Active", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["USR-1003", "Alex the Designer", "alex@example.com", "9876543212", alexHash, "No", "Designer", "Active", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["USR-1004", "Rajesh the Engineer", "rajesh.eng@example.com", "9876543213", rajeshHash, "No", "Engineer", "Active", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["USR-1005", "Priya the Sales Manager", "priya@example.com", "9876543214", priyaHash, "No", "Sales Manager", "Active", "", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    userSheet.getRange(2, 1, userRows.length, userRows[0].length).setValues(userRows);
  }
  
  // Seed Customers
  const customerSheet = ss.getSheetByName("Customers");
  if (forceReset || customerSheet.getLastRow() <= 1) {
    if (customerSheet.getLastRow() > 1) {
      customerSheet.getRange(2, 1, customerSheet.getLastRow() - 1, customerSheet.getLastColumn()).clearContent();
    }
    const customerRows = [
      ["CUST-1001", "Aditya Birla Group", "9876543210", "9876543210", "", "info@adityabirla.com", "Worli, South Mumbai", "Mumbai", "Maharashtra", "400030", "ABCDE1234F", "27AAACA1234A1Z1", "Commercial", "HQ Corporate Office Layout", "Active", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["CUST-1002", "Rajesh Sharma", "9123456789", "9123456789", "9876543219", "rajesh@gmail.com", "124, Lotus Blvd, Whitefield", "Bangalore", "Karnataka", "560066", "FGHIJ5678K", "29BBBBD5678K1Z5", "Residential", "Requires modular kitchen and Italian marble flooring", "Active", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["CUST-1003", "Meera Kapoor", "9812738490", "9812738490", "", "meera@outlook.com", "Penthouse 5B, Vasant Kunj", "Delhi", "Delhi", "110070", "LMNOP9012Q", "07CCCCE9012Q1Z9", "Residential", "Luxury bedroom lighting design, high budget", "Active", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["CUST-1004", "Rohan Mehta", "9922881177", "9922881177", "", "rohan@mehtabuilders.com", "52, Gariahat Road", "Kolkata", "West Bengal", "700019", "RSTUV3456W", "19DDDDF3456W1Z2", "Commercial", "Office reception layout redesign", "Active", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["CUST-1005", "Sunita Rao", "9845012345", "9845012345", "", "sunita.rao@yahoo.com", "34, Banjara Hills", "Hyderabad", "Telangana", "500034", "XYZAB7890C", "36EEEEF7890C1Z0", "Residential", "Bungalow terrace garden and landscaping design", "Active", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    customerSheet.getRange(2, 1, customerRows.length, customerRows[0].length).setValues(customerRows);
  }
  
  // Seed Projects
  const projectSheet = ss.getSheetByName("Projects");
  if (forceReset || projectSheet.getLastRow() <= 1) {
    if (projectSheet.getLastRow() > 1) {
      projectSheet.getRange(2, 1, projectSheet.getLastRow() - 1, projectSheet.getLastColumn()).clearContent();
    }
    const projectRows = [
      ["PROJ-1001", "Aditya Birla HQ Interior", "CUST-1001", "", "Commercial", "Worli, Mumbai", new Date("2026-05-01"), new Date("2026-12-15"), "", 1500000, "In Progress", "Executive lounge and open workstation design", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROJ-1002", "Sharma Villa Renovation", "CUST-1002", "", "Residential", "Whitefield, Bangalore", new Date("2026-06-01"), new Date("2026-09-30"), "", 800000, "In Progress", "Full villa remodel except bathrooms", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROJ-1003", "Kapoor Penthouse Design", "CUST-1003", "", "Residential", "Vasant Kunj, Delhi", new Date("2026-07-15"), new Date("2026-11-30"), "", 1200000, "Planning", "Awaiting structural clearance certificate", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROJ-1004", "Mehta Office Layout", "CUST-1004", "", "Commercial", "Gariahat, Kolkata", new Date("2026-08-01"), new Date("2027-02-28"), "", 950000, "Proposed", "Waiting for layout blueprint approvals", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROJ-1005", "Sunita Rao Landscaping", "CUST-1005", "", "Residential", "Banjara Hills, Hyderabad", new Date("2026-05-10"), new Date("2026-08-30"), new Date("2026-08-25"), 450000, "Completed", "Handed over project. Completed successfully.", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    projectSheet.getRange(2, 1, projectRows.length, projectRows[0].length).setValues(projectRows);
  }
  
  // Seed SiteVisits
  const visitSheet = ss.getSheetByName("SiteVisits");
  if (forceReset || visitSheet.getLastRow() <= 1) {
    if (visitSheet.getLastRow() > 1) {
      visitSheet.getRange(2, 1, visitSheet.getLastRow() - 1, visitSheet.getLastColumn()).clearContent();
    }
    const visitRows = [
      ["VISIT-1001", "PROJ-1001", new Date("2026-06-15"), "Kickoff & measurements", "Measured columns and elevations. Site ready for partition walls.", new Date("2026-07-10"), "[]", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VISIT-1002", "PROJ-1001", new Date("2026-06-25"), "Partition wall check", "Gypsum framing completed. HVAC ducts layout verification done.", new Date("2026-07-20"), "[]", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VISIT-1003", "PROJ-1002", new Date("2026-06-28"), "Plaster checking", "Found hollow sounding plaster on living room wall. Contractor notified.", new Date("2026-07-05"), "[]", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VISIT-1004", "PROJ-1003", new Date("2026-07-18"), "Initial structural inspection", "Found beam offsets in penthouse grid. Drawing adjustments needed.", new Date("2026-08-01"), "[]", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VISIT-1005", "PROJ-1004", new Date("2026-08-05"), "Pre-construction briefing", "Met sub-contractors on site. Scheduled material transport gates.", new Date("2026-08-15"), "[]", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    visitSheet.getRange(2, 1, visitRows.length, visitRows[0].length).setValues(visitRows);
  }
  
  // Seed Tasks
  const taskSheet = ss.getSheetByName("Tasks");
  if (forceReset || taskSheet.getLastRow() <= 1) {
    if (taskSheet.getLastRow() > 1) {
      taskSheet.getRange(2, 1, taskSheet.getLastRow() - 1, taskSheet.getLastColumn()).clearContent();
    }
    const taskRows = [
      ["TASK-1001", "PROJ-1001", "Layout Blueprint Design", "Draft partition wall and workstation layouts in AutoCAD", "Staff", "Sarah the Architect", new Date("2026-05-02"), new Date("2026-05-20"), "High", "Completed", new Date("2026-05-18"), "Approved by client", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TASK-1002", "PROJ-1001", "HVAC Ducting Check", "Co-ordinate with HVAC contractor on layout files", "Staff", "Sarah the Architect", new Date("2026-06-10"), new Date("2026-07-15"), "High", "In Progress", "", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TASK-1003", "PROJ-1002", "Kitchen 3D Renders", "Develop and render kitchen design options with material finishes", "Staff", "Alex the Designer", new Date("2026-06-15"), new Date("2026-07-05"), "Medium", "In Progress", "", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TASK-1004", "PROJ-1003", "Initial Mood Board", "Gather material references, colors, textures for master bedroom", "Staff", "Alex the Designer", new Date("2026-07-16"), new Date("2026-07-25"), "Low", "Pending", "", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TASK-1005", "PROJ-1005", "Landscape Planting Selection", "Select and purchase exotic palms and grass layers for turf setup", "Staff", "Rajesh the Engineer", new Date("2026-05-12"), new Date("2026-06-01"), "Medium", "Completed", new Date("2026-05-28"), "Material delivered and planted", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    taskSheet.getRange(2, 1, taskRows.length, taskRows[0].length).setValues(taskRows);
  }

  // Seed Leads
  const leadSheet = ss.getSheetByName("Leads");
  if (forceReset || leadSheet.getLastRow() <= 1) {
    if (leadSheet.getLastRow() > 1) {
      leadSheet.getRange(2, 1, leadSheet.getLastRow() - 1, leadSheet.getLastColumn()).clearContent();
    }
    const leadRows = [
      ["LEAD-1001", new Date("2026-06-20"), "Anil Goyal", "Interior Design", "9898989898", "goyal@gmail.com", "Complete workspace layout design and modular office furniture setup", "https://drive.google.com/open?id=123", "Corporate", "Qualified", "Social Media", "Sarah the Architect", "Needs glass partitions and modular seats.", new Date("2026-07-10"), "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["LEAD-1002", new Date("2026-06-22"), "Siddharth Roy", "Renovation", "9797979797", "roy@yahoo.com", "Modular kitchen carpentry and granite counter top setup", "", "Residential", "Proposal Sent", "Reference", "Alex the Designer", "Awaiting quote confirmation.", new Date("2026-07-08"), "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["LEAD-1003", new Date("2026-06-25"), "Vikram Malhotra", "Architecture", "9122334455", "vikram@malhotra.in", "3-storey bungalow layout design and drawing checklist", "", "Residential", "Contacted", "Cold Call", "Rajesh the Engineer", "Set site measurement briefing.", new Date("2026-07-05"), "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["LEAD-1004", new Date("2026-06-28"), "Kavita Nair", "Interior Design", "9822334455", "kavita@outlook.com", "Flat lounge interior styling work and soft furnishings", "", "Residential", "Lost", "Website", "Priya the Sales Manager", "Budget too low for requested scope.", new Date("2026-07-02"), "Budget constraints", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["LEAD-1005", new Date("2026-07-01"), "Pooja Singhal", "Civil Engineering", "9911556677", "pooja@singhal.co", "Factory warehouse level flooring design reconstruction", "", "Corporate", "New", "Cold Call", "Priya the Sales Manager", "Sent company profile presentation link.", new Date("2026-07-06"), "", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    leadSheet.getRange(2, 1, leadRows.length, leadRows[0].length).setValues(leadRows);
  }

  // Seed LeadFollowups
  const followupSheet = ss.getSheetByName("LeadFollowups");
  if (forceReset || followupSheet.getLastRow() <= 1) {
    if (followupSheet.getLastRow() > 1) {
      followupSheet.getRange(2, 1, followupSheet.getLastRow() - 1, followupSheet.getLastColumn()).clearContent();
    }
    const followupRows = [
      ["FLP-1001", "LEAD-1001", new Date("2026-06-21"), new Date("2026-07-10"), "First inquiry review: Goyal likes our past corporate projects. Sourcing budget logs.", new Date(), "SYSTEM"],
      ["FLP-1002", "LEAD-1002", new Date("2026-06-23"), new Date("2026-07-08"), "Sent kitchen estimates via email. Sid wants modular hardware options listing.", new Date(), "SYSTEM"],
      ["FLP-1003", "LEAD-1001", new Date("2026-07-05"), new Date("2026-07-10"), "Discussed glass partition pricing. Goyal confirmed budget is fine.", new Date(), "Sarah the Architect"],
      ["FLP-1004", "LEAD-1003", new Date("2026-06-26"), new Date("2026-07-05"), "Initial intro call done. Malhotra will share detailed structural dwg.", new Date(), "Rajesh the Engineer"],
      ["FLP-1005", "LEAD-1004", new Date("2026-06-30"), new Date("2026-07-02"), "Discussed budget limitations. Client cannot stretch past 1.5L. Marked lost.", new Date(), "Priya the Sales Manager"]
    ];
    followupSheet.getRange(2, 1, followupRows.length, followupRows[0].length).setValues(followupRows);
  }

  // Seed Proposals
  const proposalSheet = ss.getSheetByName("Proposals");
  if (forceReset || proposalSheet.getLastRow() <= 1) {
    if (proposalSheet.getLastRow() > 1) {
      proposalSheet.getRange(2, 1, proposalSheet.getLastRow() - 1, proposalSheet.getLastColumn()).clearContent();
    }
    const proposalRows = [
      ["PROP-1001", "CUST-1001", "Aditya Birla Reception Lounge", new Date("2026-05-10"), 450000, "Designing layout, sourcing partition glass panels, wiring design, false ceiling installation.", new Date("2026-06-10"), "Accepted", "", "Approved by Birla management board", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROP-1002", "CUST-1002", "Sharma Master Bedroom Decor", new Date("2026-06-25"), 180000, "Carpentry design, lighting fixtures installation, painting layout, soft furnishings setup.", new Date("2026-07-25"), "Sent", new Date("2026-07-06"), "Awaiting final layout confirmation", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROP-1003", "CUST-1003", "Kapoor Penthouse False Ceiling", new Date("2026-07-20"), 220000, "Gypsum board framing cove lighting wiring grids installation", new Date("2026-08-20"), "Draft", new Date("2026-07-25"), "Mood boards shared", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROP-1004", "CUST-1004", "Mehta Commercial Layout Plan", new Date("2026-08-05"), 550000, "Designing furniture systems electrical checks HVAC layouts plans", new Date("2026-09-05"), "Draft", "", "Draft layout blueprints ready", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["PROP-1005", "CUST-1005", "Sunita Rao Garden Landscape", new Date("2026-05-11"), 150000, "Exotic palms turf installation borders layout paths setup", new Date("2026-06-10"), "Accepted", "", "Approved by Sunita Rao", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    proposalSheet.getRange(2, 1, proposalRows.length, proposalRows[0].length).setValues(proposalRows);
  }

  // Seed Vendors
  const vendorSheet = ss.getSheetByName("Vendors");
  if (forceReset || vendorSheet.getLastRow() <= 1) {
    if (vendorSheet.getLastRow() > 1) {
      vendorSheet.getRange(2, 1, vendorSheet.getLastRow() - 1, vendorSheet.getLastColumn()).clearContent();
    }
    const vendorRows = [
      ["VNDR-1001", "Apex Electricals", "Ramesh Singh", "9112233445", "contact@apexelectricals.com", "G-4, Sector 5, Bangalore", "29AAAAP1234E1Z9", "Electrical", "Active", "Reliable contractor for commercial electrical wiring", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VNDR-1002", "Sai Ply & Timber", "Vikram Patel", "9223344556", "sales@saiply.com", "12, Timber Market, Mumbai", "27AAAPV5544B2Z4", "Carpentry", "Active", "Plywood, MDF board, laminate, and hard-wood supplier", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VNDR-1003", "Elite Marble & Granite", "Anil Shah", "9334455667", "elite@shah.in", "52, Marble Mandi, New Delhi", "07AAAFE9988C1Z3", "Masonry", "Active", "Statuario and Italian marble blocks supplier", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VNDR-1004", "Krishna Fabrication", "Santosh Yadav", "9445566778", "krishfab@gmail.com", "Plot 14, MIDC, Pune", "27AAAKF1122D1Z0", "Metal Works", "Active", "Glass structural steel framing fabrications", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["VNDR-1005", "Royal Paint Works", "Devendra Kumar", "9556677889", "info@royalpaint.co", "22, GIDC, Ahmedabad", "24AAAPR5522F2Z1", "Painting", "Active", "Asian and Berger paints distributor", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    vendorSheet.getRange(2, 1, vendorRows.length, vendorRows[0].length).setValues(vendorRows);
  }

  // Seed Transactions
  const transactionSheet = ss.getSheetByName("Transactions");
  if (forceReset || transactionSheet.getLastRow() <= 1) {
    if (transactionSheet.getLastRow() > 1) {
      transactionSheet.getRange(2, 1, transactionSheet.getLastRow() - 1, transactionSheet.getLastColumn()).clearContent();
    }
    const transactionRows = [
      ["TXN-1001", "PROJ-1001", "", new Date("2026-05-15"), "Income", "Client Payment", 500000, "Bank Transfer", "TXN554433221", "First advance payment from Birla Group", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TXN-1002", "PROJ-1001", "VNDR-1001", new Date("2026-05-20"), "Expense", "Material Purchase", 120000, "UPI", "UPI8877665544", "Paid Ramesh Singh for copper cables wiring materials", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TXN-1003", "PROJ-1002", "VNDR-1002", new Date("2026-06-15"), "Expense", "Material Purchase", 85000, "Cheque", "CHQ000125", "Payment for kitchen ply sheets", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TXN-1004", "PROJ-1002", "", new Date("2026-06-20"), "Income", "Client Payment", 300000, "Bank Transfer", "TXN99887766", "Stage 1 payment from Rajesh Sharma", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["TXN-1005", "PROJ-1003", "VNDR-1003", new Date("2026-07-22"), "Expense", "Material Purchase", 250000, "Bank Transfer", "TXN00998877", "Sourced Statuario marble blocks supply check", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    transactionSheet.getRange(2, 1, transactionRows.length, transactionRows[0].length).setValues(transactionRows);
  }

  // Seed Masters dropdown values
  const masterSheet = ss.getSheetByName("Masters");
  if (forceReset || masterSheet.getLastRow() <= 1) {
    if (masterSheet.getLastRow() > 1) {
      masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, masterSheet.getLastColumn()).clearContent();
    }
    // No pre-defined values seeded per admin instructions. Clean slate setup.
  }
  
  // Seed RolePermissions
  const permSheet = ss.getSheetByName("RolePermissions");
  if (forceReset || permSheet.getLastRow() <= 1) {
    if (permSheet.getLastRow() > 1) {
      permSheet.getRange(2, 1, permSheet.getLastRow() - 1, permSheet.getLastColumn()).clearContent();
    }
    
    const modules = [
      "Dashboard", "Customers", "Projects", "SiteVisits", "Tasks", 
      "Leads", "Proposals", "Vendors", "Associates", "Finance", "Reports", "Users", "Masters"
    ];
    const roles = ["Super Admin", "Admin", "Designer", "Architect", "Engineer"];
    
    const permRows = [];
    let permIdCounter = 1001;
    
    roles.forEach(role => {
      modules.forEach(mod => {
        let view = true;
        let add = true;
        let edit = true;
        let del = true;
        
        if (role === "Super Admin" || role === "Admin") {
          // Full access
        } else {
          // Staff roles (Designer, Architect, Engineer)
          const isStaffModule = ["Dashboard", "Customers", "Projects", "SiteVisits", "Tasks", "Leads", "Proposals", "Vendors", "Associates"].indexOf(mod) !== -1;
          if (!isStaffModule) {
            view = false;
            add = false;
            edit = false;
            del = false;
          } else {
            // For staff modules, let them View, Add, and Edit, but block Delete!
            del = false;
          }
        }
        
        permRows.push([
          "PERM-" + permIdCounter++,
          role,
          mod,
          view,
          add,
          edit,
          del
        ]);
      });
    });
    
    permSheet.getRange(2, 1, permRows.length, permRows[0].length).setValues(permRows);
  }
  
  // Seed Milestones
  const milestoneSheet = ss.getSheetByName("Milestones");
  if (forceReset || milestoneSheet.getLastRow() <= 1) {
    if (milestoneSheet.getLastRow() > 1) {
      milestoneSheet.getRange(2, 1, milestoneSheet.getLastRow() - 1, milestoneSheet.getLastColumn()).clearContent();
    }
    const msRows = [
      ["MS-1001", "PROJ-1001", "Concept Design Approval", new Date("2026-05-15"), "Completed", "Approved by Aditya Birla reps", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1002", "PROJ-1001", "Ducting Blueprint Finalized", new Date("2026-07-01"), "Completed", "Signed off by HVAC contractor", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1003", "PROJ-1001", "Site Procurement & Masonry", new Date("2026-09-15"), "In Progress", "Drywalls and frames in progress", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1004", "PROJ-1001", "Finishing and Flooring Inspection", new Date("2026-11-30"), "Pending", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1005", "PROJ-1001", "Handover and Move-in checklist", new Date("2026-12-15"), "Pending", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],

      ["MS-1006", "PROJ-1002", "Dismantling & Structure Check", new Date("2026-06-15"), "Completed", "Dismantled old counter-top and cabinets", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1007", "PROJ-1002", "Modular Cabinet Carpentry", new Date("2026-08-01"), "In Progress", "Carpentry work started in workshop", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1008", "PROJ-1002", "Granite counter-top placement", new Date("2026-09-15"), "Pending", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      
      ["MS-1009", "PROJ-1003", "Civil Blueprint Sign-off", new Date("2026-08-15"), "Pending", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1010", "PROJ-1003", "Electrical duct wiring selection", new Date("2026-10-01"), "Pending", "", new Date(), "SYSTEM", new Date(), "SYSTEM"],

      ["MS-1011", "PROJ-1005", "Tree Selection Sign-off", new Date("2026-05-25"), "Completed", "Exotic palms chosen by client", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1012", "PROJ-1005", "Planting Turf installation", new Date("2026-07-20"), "Completed", "Grass carpet laid down", new Date(), "SYSTEM", new Date(), "SYSTEM"],
      ["MS-1013", "PROJ-1005", "Client Handover Inspection", new Date("2026-08-25"), "Completed", "Inspected and accepted", new Date(), "SYSTEM", new Date(), "SYSTEM"]
    ];
    milestoneSheet.getRange(2, 1, msRows.length, msRows[0].length).setValues(msRows);
  }
  
  return "Database setup complete! Created tables and seeded dummy data for all modules (Admin User: admin@example.com / admin)";
}

/**
 * Helper to get a sheet by name
 */
function getSheet(tableName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(tableName);
  const headers = SHEET_HEADERS[tableName];
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
    if (headers && headers.length > 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
    }
  } else if (headers && headers.length > 0) {
    const currentLastCol = sheet.getLastColumn();
    if (currentLastCol < headers.length) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return sheet;
}

/**
 * Reads all data from a sheet and maps it to an array of objects
 */
function readTable(tableName) {
  try {
    const sheet = getSheet(tableName);
    const lastRow = sheet.getLastRow();
    const headers = SHEET_HEADERS[tableName];
    
    if (lastRow <= 1) {
      return [];
    }
    
    const data = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    let tz = "GMT";
    try { tz = Session.getScriptTimeZone() || "GMT"; } catch(e){}
    
    return data.map((row, rowIndex) => {
      const obj = { _rowNum: rowIndex + 2 };
      headers.forEach((header, colIndex) => {
        let val = row[colIndex];
        if (val instanceof Date) {
          if (!isNaN(val.getTime())) {
            try {
              obj[header] = Utilities.formatDate(val, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
            } catch(e) {
              obj[header] = val.toISOString();
            }
          } else {
            obj[header] = "";
          }
        } else if (val === null || val === undefined) {
          obj[header] = "";
        } else {
          obj[header] = val;
        }
      });
      return obj;
    });
  } catch(e) {
    console.error("Error reading table " + tableName + ": " + e.message);
    return [];
  }
}

/**
 * Generates the next sequential ID for a table (e.g. USR-1002, CUST-1005)
 */
function generateNextId(tableName) {
  const sheet = getSheet(tableName);
  const lastRow = sheet.getLastRow();
  const prefix = ID_PREFIXES[tableName] || "ID-";
  
  if (lastRow <= 1) {
    return prefix + "1001";
  }
  
  // Look at the last row's ID column (column 1)
  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(row => row[0]);
  let maxIdNum = 1000;
  
  ids.forEach(idStr => {
    if (idStr && typeof idStr === 'string' && idStr.startsWith(prefix)) {
      const numPart = parseInt(idStr.replace(prefix, ""), 10);
      if (!isNaN(numPart) && numPart > maxIdNum) {
        maxIdNum = numPart;
      }
    }
  });
  
  return prefix + (maxIdNum + 1);
}

/**
 * Inserts or updates a row in a table.
 * If idValue is missing or not found, it performs an insert.
 * Otherwise, it performs an update.
 */
function writeTableRow(tableName, idColumnName, idValue, objectData, userId) {
  const sheet = getSheet(tableName);
  const headers = SHEET_HEADERS[tableName];
  const lastRow = sheet.getLastRow();
  
  let targetRowIndex = -1;
  let finalIdValue = idValue;
  const now = new Date();
  
  // If we have an ID value, look for the row index
  if (idValue && lastRow > 1) {
    const idColIndex = headers.indexOf(idColumnName);
    if (idColIndex !== -1) {
      const idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().map(row => row[0]);
      const matchIndex = idValues.indexOf(idValue);
      if (matchIndex !== -1) {
        targetRowIndex = matchIndex + 2; // Offset by 2 (header row + 0-indexing)
      }
    }
  }
  
  // Set tracking columns
  if (targetRowIndex === -1) {
    // Insert Mode
    if (!idValue || String(idValue).trim() === "") {
      finalIdValue = generateNextId(tableName);
    } else {
      finalIdValue = idValue;
    }
    objectData[idColumnName] = finalIdValue;
    objectData["CreatedDate"] = now;
    objectData["CreatedBy"] = objectData["CreatedBy"] || userId || "SYSTEM";
    objectData["ModifiedDate"] = now;
    objectData["ModifiedBy"] = userId || "SYSTEM";
    
    // Assemble the row values
    const rowValues = headers.map(header => {
      let val = objectData[header];
      return val === undefined ? "" : val;
    });
    
    sheet.appendRow(rowValues);
  } else {
    // Update Mode
    objectData["ModifiedDate"] = now;
    objectData["ModifiedBy"] = userId || "SYSTEM";
    
    // Fetch the existing row, merge it, and set the whole row back
    const existingValues = sheet.getRange(targetRowIndex, 1, 1, headers.length).getValues()[0];
    const mergedValues = headers.map((header, colIndex) => {
      if (objectData[header] !== undefined) {
        return objectData[header];
      }
      return existingValues[colIndex];
    });
    
    sheet.getRange(targetRowIndex, 1, 1, headers.length).setValues([mergedValues]);
  }
  
  // Return the saved object
  return finalIdValue;
}

/**
 * Simple helper to delete a row by its ID
 */
function deleteTableRow(tableName, idColumnName, idValue) {
  const sheet = getSheet(tableName);
  const headers = SHEET_HEADERS[tableName];
  const lastRow = sheet.getLastRow();
  
  if (lastRow <= 1 || !idValue) return false;
  
  const idColIndex = headers.indexOf(idColumnName);
  if (idColIndex === -1) return false;
  
  const idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().map(row => row[0]);
  const matchIndex = idValues.indexOf(idValue);
  
  if (matchIndex !== -1) {
    sheet.deleteRow(matchIndex + 2);
    return true;
  }
  return false;
}

/**
 * Reads Masters table and groups options by DropdownKey.
 */
function getDropdownValues() {
  try {
    const rawData = readTable("Masters");
    const grouped = {};
    
    rawData.forEach(row => {
      const key = row.DropdownKey;
      const val = row.DropdownValue;
      if (key && val) {
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(val);
      }
    });
    
    // Ensure all keys exist with at least an empty array fallback
    const expectedKeys = [
      "CustomerType", "ProjectType", "ProjectStatus", "TaskPriority", "TaskStatus",
      "LeadSource", "LeadStatus", "ProposalStatus", "VendorType", "PaymentMode", "TransactionCategory", 
      "IncomeCategory", "ExpenseCategory", "IncomeCategoryProject", "IncomeCategoryNonProject", 
      "ExpenseCategoryProject", "ExpenseCategoryNonProject", "LeadType", "UserRole", "TransactionType"
    ];
    expectedKeys.forEach(k => {
      if (!grouped[k]) {
        grouped[k] = [];
      }
    });
    
    return grouped;
  } catch (e) {
    throw new Error("Failed to load master dropdown values: " + e.message);
  }
}

/**
 * Saves a new value to the Masters table under a specific key.
 */
function saveDropdownValue(key, value, userId) {
  try {
    checkUserPermission(userId, "Masters", "edit");
    if (!key || !value || !value.trim()) {
      return { success: false, message: "Category and option value are required." };
    }
    
    const sh = getSheet("Masters");
    const data = sh.getDataRange().getValues();
    
    // Check for duplicate
    const duplicate = data.some(row => 
      String(row[0]).trim().toLowerCase() === key.trim().toLowerCase() &&
      String(row[1]).trim().toLowerCase() === value.trim().toLowerCase()
    );
    
    if (duplicate) {
      return { success: false, message: "This value already exists in this category." };
    }
    
    sh.appendRow([key.trim(), value.trim()]);
    return { success: true, message: "Dropdown option added successfully." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Alias for saveDropdownValue
 */
function addDropdownValue(key, value, userId) {
  return saveDropdownValue(key, value, userId);
}

/**
 * Deletes a value from the Masters table.
 */
function deleteDropdownValue(key, value, userId) {
  try {
    checkUserPermission(userId, "Masters", "delete");
    const sh = getSheet("Masters");
    const lastRow = sh.getLastRow();
    if (lastRow <= 1) return { success: false, message: "No dropdown options found." };
    
    const data = sh.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = 0; i < data.length; i++) {
      if (
        String(data[i][0]).trim().toLowerCase() === key.trim().toLowerCase() &&
        String(data[i][1]).trim().toLowerCase() === value.trim().toLowerCase()
      ) {
        sh.deleteRow(i + 2);
        return { success: true, message: "Dropdown option deleted successfully." };
      }
    }
    return { success: false, message: "Dropdown option not found." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Resolves user email address by their FullName string
 */
function getUserEmailByName(fullName) {
  try {
    const users = readTable("Users");
    const user = users.find(u => u.FullName === fullName);
    return user ? user.Email : null;
  } catch(e) {
    return null;
  }
}

/**
 * Resolves user email address by UserID
 */
function getUserEmailById(userId) {
  try {
    const users = readTable("Users");
    const user = users.find(u => u.UserID === userId);
    return user ? user.Email : null;
  } catch(e) {
    return null;
  }
}

/**
 * Central system notification dispatcher using Apps Script MailApp
 */
function sendSystemNotification(type, record) {
  try {
    let toEmail = "";
    let subject = "";
    let body = "";
    
    if (type === "lead_assigned") {
      const email = getUserEmailByName(record.AssignedTo);
      if (email) {
        toEmail = email;
        subject = `[StudioSpace] New Lead Assigned: ${record.CustomerName}`;
        body = `Hi ${record.AssignedTo},\n\nYou have been assigned a new lead:\n\n` +
               `Customer: ${record.CustomerName}\n` +
               `Project Type: ${record.ProjectType}\n` +
               `Details: ${record.ProjectDetails}\n\n` +
               `Please check the system console for more details.`;
      }
    }
    else if (type === "visit_assigned") {
      const email = getUserEmailById(record.AssignedTo);
      const users = readTable("Users");
      const user = users.find(u => u.UserID === record.AssignedTo);
      const name = user ? user.FullName : "Team Member";
      if (email) {
        toEmail = email;
        const visitDateStr = record.VisitDate ? new Date(record.VisitDate).toDateString() : "Not specified";
        subject = `[StudioSpace] New Site Visit Assigned`;
        body = `Hi ${name},\n\nYou have been assigned a site visit:\n\n` +
               `Project ID: ${record.ProjectID}\n` +
               `Date: ${visitDateStr}\n` +
               `Purpose: ${record.Purpose}\n` +
               `Remarks: ${record.Remarks || "-"}\n\n` +
               `Please check your schedule in the system console.`;
      }
    }
    else if (type === "visit_completed") {
      const creatorEmail = getUserEmailById(record.CreatedBy);
      toEmail = creatorEmail || "admin@example.com";
      const visitDateStr = record.VisitDate ? new Date(record.VisitDate).toDateString() : "";
      subject = `[StudioSpace] Site Visit Completed - Project ${record.ProjectID}`;
      body = `Hi,\n\nThe site visit for Project ${record.ProjectID} has been marked as Completed.\n\n` +
             `Date: ${visitDateStr}\n` +
             `Purpose: ${record.Purpose}\n` +
             `Remarks: ${record.Remarks || "-"}\n` +
             `Logged Photos: ${record.Photos || "None"}\n\n` +
             `Check the logs in the console.`;
    }
    else if (type === "task_assigned") {
      if (record.AssignedType === "Staff") {
        toEmail = getUserEmailByName(record.AssignedTo);
      } else if (record.AssignedType === "Vendor") {
        try {
          const vendors = readTable("Vendors");
          const vendor = vendors.find(v => v.VendorName === record.AssignedTo);
          if (vendor) toEmail = vendor.Email;
        } catch(e) {}
      } else if (record.AssignedType === "Associate") {
        try {
          const associates = readTable("Associates");
          const assoc = associates.find(a => a.AssociateName === record.AssignedTo);
          if (assoc) toEmail = assoc.Email;
        } catch(e) {}
      }
      
      if (toEmail) {
        const dueDateStr = record.DueDate ? new Date(record.DueDate).toDateString() : "Not specified";
        subject = `[StudioSpace] New Task Assigned: ${record.TaskName}`;
        body = `Hi ${record.AssignedTo},\n\nYou have been assigned a task:\n\n` +
               `Task: ${record.TaskName}\n` +
               `Project: ${record.ProjectID}\n` +
               `Priority: ${record.Priority}\n` +
               `Due Date: ${dueDateStr}\n` +
               `Description: ${record.Description || "-"}\n\n` +
               `Please check the task board in the console.`;
      }
    }
    else if (type === "task_completed") {
      const creatorEmail = getUserEmailById(record.CreatedBy);
      toEmail = creatorEmail || "admin@example.com";
      subject = `[StudioSpace] Task Completed: ${record.TaskName}`;
      body = `Hi,\n\nThe task "${record.TaskName}" for Project ${record.ProjectID} has been completed.\n\n` +
             `Task: ${record.TaskName}\n` +
             `Assigned To: ${record.AssignedTo} (${record.AssignedType})\n` +
             `Remarks: ${record.Remarks || "-"}\n\n` +
             `Check the task board in the console.`;
    }
    
    if (toEmail) {
      MailApp.sendEmail({
        to: toEmail,
        subject: subject,
        body: body
      });
    }
  } catch (e) {
    console.error("Failed to send system notification email:", e);
  }
}

/**
 * Safely updates spreadsheet headers without deleting/resetting user records.
 */
function migrateHeaders() {
  const ss = getSpreadsheet();
  for (const sheetName in SHEET_HEADERS) {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      const headers = SHEET_HEADERS[sheetName];
      // If we added new columns, write the new header row
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return "Database headers successfully migrated!";
}

/**
 * Helper to get or create a Drive folder.
 */
function getFolderOrCreate(folderName, parentFolder) {
  const root = parentFolder || DriveApp;
  const folders = root.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  const newFolder = root.createFolder(folderName);
  newFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return newFolder;
}

/**
 * Creates or retrieves a Customer-specific folder in Google Drive.
 * Structure: StudioSpace_Customers -> Customer Name (Main folder) -> Sub folders (Customer Documents, Project Documents)
 */
function getCustomerFolder(customerName, customerId, subfolderName) {
  const parent = getFolderOrCreate("StudioSpace_Customers");
  const folderName = `${customerId}_${customerName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}`;
  const mainFolder = getFolderOrCreate(folderName, parent);

  // Ensure standard subfolders exist within Customer Main folder
  const custDocsFolder = getFolderOrCreate("Customer Documents", mainFolder);
  const projDocsFolder = getFolderOrCreate("Project Documents", mainFolder);

  if (subfolderName === "Customer Documents") return custDocsFolder;
  if (subfolderName === "Project Documents") return projDocsFolder;
  if (subfolderName) return getFolderOrCreate(subfolderName, mainFolder);

  return mainFolder;
}

/**
 * Creates or retrieves a Vendor-specific folder in Google Drive.
 */
function getVendorFolder(vendorName, vendorId) {
  const parent = getFolderOrCreate("StudioSpace_Vendors");
  const folderName = `${vendorId}_${vendorName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}`;
  return getFolderOrCreate(folderName, parent);
}

/**
 * Creates or retrieves a Project-specific folder in Google Drive.
 * Option to place project subfolder under Customer's Project Documents folder if Customer info is available.
 */
function getProjectFolder(projectName, projectId, customerId, customerName) {
  let parent = getFolderOrCreate("StudioSpace_Projects");
  if (customerId && customerName) {
    parent = getCustomerFolder(customerName, customerId, "Project Documents");
  }
  const folderName = `${projectId}_${projectName.replace(/[^a-zA-Z0-9\s]/g, "").replace(/\s+/g, "_")}`;
  return getFolderOrCreate(folderName, parent);
}

/**
 * Saves uploaded files list to a target Drive folder and returns comma-separated URLs.
 */
function saveUploadedFilesToFolder(fileData, targetFolder) {
  if (!fileData) return "";
  const fileList = Array.isArray(fileData) ? fileData : [fileData];
  let uploadedUrls = [];
  
  fileList.forEach(f => {
    if (f.base64 && f.filename) {
      const decodedBytes = Utilities.base64Decode(f.base64);
      const blob = Utilities.newBlob(decodedBytes, f.mimeType, f.filename);
      const file = targetFolder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      uploadedUrls.push(file.getUrl());
    }
  });
  
  return uploadedUrls.join(", ");
}
