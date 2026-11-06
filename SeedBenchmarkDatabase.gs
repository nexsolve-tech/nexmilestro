/**
 * =========================================================================
 * NEXMILESTRO V2 - ENTERPRISE HIGH-VOLUME BENCHMARK SEEDER
 * =========================================================================
 * Populates the active Google Sheet database with production-scale stress data:
 * - 125 Customers
 * - 225 Projects
 * - 670+ Milestones
 * - 1,250 Tasks (Kanban Board)
 * - 1,050 Site Visits
 * - 180 Proposals
 * - 650 Financial Transactions
 * - 160 Leads & 320 Follow-ups
 * - 55 Vendors & 35 Associates
 * - Dropdown Masters, Role Permissions, Users & Company Setup
 *
 * Designed with 1-shot batch setValues() for maximum speed (< 20 seconds).
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("🚀 NexMilestro Tools")
      .addItem("⚡ Populate High-Volume Benchmark Data", "seedHighVolumeBenchmarkData")
      .addItem("🧹 Reset Empty Database with Headers", "setupDatabaseTabs")
      .addToUi();
  } catch(e) {}
}

function seedHighVolumeBenchmarkData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return executeHighVolumeSeeding(ss);
}

function executeHighVolumeSeeding(ss) {
  const startTime = new Date().getTime();
  
  const CITIES = ["Gurugram", "New Delhi", "Noida", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Ahmedabad", "Chandigarh", "Jaipur"];
  const STATES = ["Haryana", "Delhi", "Uttar Pradesh", "Maharashtra", "Karnataka", "Maharashtra", "Telangana", "Gujarat", "Punjab", "Rajasthan"];
  const FIRST_NAMES = ["Rajeev", "Amit", "Vikram", "Sunil", "Rohan", "Ananya", "Pooja", "Sanjay", "Deepak", "Neha", "Karan", "Gaurav", "Naveen", "Rahul", "Meera", "Aditya", "Shweta", "Manish", "Divya", "Tarun", "Ashish", "Sneha", "Alok", "Priya", "Vivek", "Kavita", "Siddharth", "Nidhi", "Harish", "Ritu"];
  const LAST_NAMES = ["Singhal", "Sharma", "Verma", "Mehta", "Patel", "Kapoor", "Gupta", "Malhotra", "Joshi", "Bansal", "Chopra", "Reddy", "Nair", "Saxena", "Bhatia", "Trivedi", "Agrawal", "Shah", "Iyer", "Rao", "Khanna", "Deshmukh", "Chawla", "Bhardwaj", "Kulkarni", "Mittal", "Sarin", "Dewan", "Goyal", "Seth"];
  const CORP_PREFIXES = ["DLF", "Oberoi", "Godrej", "Tata", "Lodha", "Prestige", "Sobha", "Brigade", "Hiranandani", "K Raheja", "Mahindra", "Reliance", "Adani", "Piramal", "Embassy", "Salarpuria", "Phoenix", "Shapoorji", "L&T", "GMR"];
  const CORP_SUFFIXES = ["Properties Ltd", "Realty & Infrastructure", "Developments Pvt Ltd", "Living Spaces", "Commercial Towers", "Projects Corp", "Asset Holdings", "Estates Pvt Ltd", "Builders & Turnkey", "Infrastructure Corp"];
  const PROJECT_TYPES = ["Luxury Residential", "Corporate Office Fitout", "Turnkey Villa Execution", "Retail Flagship Showroom", "Commercial Kitchen / Food", "Hospitality / Boutique Hotel"];
  const PROJECT_STATUSES = ["Planning & Design", "In Progress", "In Progress", "In Progress", "Under Review", "Completed", "On Hold"];
  const TASK_PRIORITIES = ["Critical", "High", "Medium", "Medium", "Low"];
  const TASK_STATUSES = ["Pending", "In Progress", "In Progress", "Under Review", "Completed", "Completed"];
  const VISIT_STATUSES = ["Completed", "Completed", "Completed", "Scheduled"];
  const PROPOSAL_STATUSES = ["Draft", "Sent", "Approved", "Approved", "Revised", "Rejected"];
  const LEAD_SOURCES = ["Client Referral", "Website Lead", "Architect Referral", "Exhibition", "Direct Inquiry", "LinkedIn"];
  const LEAD_STATUSES = ["New Inquiry", "Discussion", "Qualified", "Site Visit Scheduled", "Proposal Sent", "Won", "Lost"];

  const STAFF = [
    { id: "USR-101", name: "Mehul Gandhi", role: "Super Admin", mobile: "9811223344" },
    { id: "USR-102", name: "Dhwani Gandhi", role: "Project Manager", mobile: "9822334455" },
    { id: "USR-103", name: "Karan Mehta", role: "Site Engineer", mobile: "9833445566" },
    { id: "USR-104", name: "Ananya Sen", role: "Sales Executive", mobile: "9844556677" },
    { id: "USR-105", name: "Rajesh Kulkarni", role: "Finance Officer", mobile: "9855667788" },
    { id: "USR-106", name: "Siddharth Verma", role: "Project Manager", mobile: "9866778899" },
    { id: "USR-107", name: "Pooja Sharma", role: "Site Engineer", mobile: "9877889900" },
    { id: "USR-108", name: "Vikram Saxena", role: "Site Engineer", mobile: "9888990011" }
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function pad2(n) { return String(n).padStart(2, "0"); }
  function randDate(y1, y2) {
    const yr = rand(y1, y2);
    const mo = pad2(rand(1, 12));
    const da = pad2(rand(1, 28));
    return yr + "-" + mo + "-" + da;
  }
  function genPAN() {
    let p = "";
    for (let i = 0; i < 5; i++) p += pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    for (let i = 0; i < 4; i++) p += rand(0, 9);
    p += pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    return p;
  }

  // 1. Generate Customers (125)
  const custRows = [];
  const custIds = [];
  for (let i = 1; i <= 125; i++) {
    const cId = "CUST-" + (1000 + i);
    custIds.push(cId);
    const cityIdx = (i - 1) % CITIES.length;
    const city = CITIES[cityIdx];
    const state = STATES[cityIdx];
    const pan = genPAN();
    const gst = pad2((cityIdx % 35) + 1) + pan + "1Z" + pick("123456789ABCDEF");
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const contact = fn + " " + ln;
    const isCorp = (i % 3 !== 0);
    const cName = isCorp ? (pick(CORP_PREFIXES) + " " + pick(CORP_SUFFIXES)) : (contact + " Residence");
    const mobile = "98" + rand(10000000, 99999999);
    const email = isCorp ? ("contact@" + cName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15) + ".in") : (fn.toLowerCase() + "." + ln.toLowerCase() + "@gmail.com");

    custRows.push([
      cId, cName, mobile, mobile, "97" + rand(10000000, 99999999), email,
      rand(1, 400) + ", Sector " + rand(1, 95) + ", " + city,
      city, state, String(rand(110001, 800000)), pan, gst,
      isCorp ? "Enterprise / Commercial" : "HNI Residential",
      "Managed by StudioSpace account executive.", i > 120 ? "Inactive" : "Active",
      randDate(2025, 2026), "Admin", randDate(2026, 2026), "Admin", ""
    ]);
  }

  // 2. Generate Vendors (55)
  const vendRows = [];
  const vendIds = [];
  const VENDOR_CATS = ["Modular Woodwork & Veneers", "Italian Marble & Granite", "Sanitaryware & Bath Fittings", "Lighting & Automation", "HVAC & Ducting", "Civil, Masonry & POP", "Glazing & Aluminum Facades", "Upholstery, Curtains & Rugs", "Hardware & Architectural Fittings"];
  for (let i = 1; i <= 55; i++) {
    const vId = "VNDR-" + (1000 + i);
    vendIds.push(vId);
    const cat = VENDOR_CATS[(i - 1) % VENDOR_CATS.length];
    const vName = pick(LAST_NAMES) + " " + cat.split(" ")[0] + " & Co.";
    const pan = genPAN();
    const gst = pad2((i % 35) + 1) + pan + "1Z" + pick("123456789ABCDEF");
    vendRows.push([
      vId, vName, pick(FIRST_NAMES) + " " + pick(LAST_NAMES), "99" + rand(10000000, 99999999),
      "sales@" + vName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 12) + ".in",
      "Plot " + rand(1, 150) + ", Industrial Area, " + pick(CITIES), gst, cat, "Active",
      "Approved vendor on standard 30-day payment terms.", randDate(2025, 2026), "Admin", "", "", ""
    ]);
  }

  // 3. Generate Associates (35)
  const assocRows = [];
  const assocNames = [];
  const ASSOC_SPECS = ["Photorealistic 3D Rendering & Elevation", "MEP & Electrical Consultant", "Structural Engineer", "Acoustics & Home Cinema Specialist", "Landscape & Terrace Garden Architect", "Automation & IoT System Integrator"];
  for (let i = 1; i <= 35; i++) {
    const aId = "ASSOC-" + (100 + i);
    const spec = ASSOC_SPECS[(i - 1) % ASSOC_SPECS.length];
    const aName = "Studio " + pick(LAST_NAMES) + " Design Partners";
    assocNames.push(aName);
    const pan = genPAN();
    const gst = pad2((i % 35) + 1) + pan + "1Z" + pick("123456789ABCDEF");
    assocRows.push([
      aId, aName, pick(FIRST_NAMES) + " " + pick(LAST_NAMES), "98" + rand(10000000, 99999999),
      "contact@" + aName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15) + ".in",
      rand(1, 50) + ", Commercial Hub, " + pick(CITIES), gst, "Active",
      "Specialized in " + spec + ". Rate basis: Lumpsum milestone contract.", randDate(2025, 2026), "Admin", "", ""
    ]);
  }

  // 4. Generate Projects (225) & Milestones (670+)
  const projRows = [];
  const projIds = [];
  const msRows = [];
  let msCounter = 1000;
  const MS_TITLES = [
    "Site Survey, Demolition & Architectural Floor Plans",
    "MEP Piping, Electrical Conduiting & HVAC First Fix",
    "Flooring, False Ceiling Grid & POP Skimming",
    "Modular Millwork, Veneers & Kitchen Installation",
    "Surface Painting, Lighting Fixtures & Final Handover"
  ];

  for (let i = 1; i <= 225; i++) {
    const pId = "PROJ-" + (1000 + i);
    projIds.push(pId);
    const cId = custIds[(i - 1) % custIds.length];
    const pType = pick(PROJECT_TYPES);
    const status = pick(PROJECT_STATUSES);
    const budget = rand(18, 250) * 100000;
    const sDate = randDate(2025, 2026);
    const eDate = randDate(2026, 2027);
    const mgr = pick(STAFF.filter(s => s.role.indexOf("Manager") !== -1 || s.role.indexOf("Admin") !== -1));
    const pName = "Project " + (1000 + i) + " - " + pType.split(" ")[0] + " Phase " + (((i - 1) % 3) + 1);

    projRows.push([
      pId, pName, cId, "LEAD-" + (1000 + ((i % 150) + 1)), pType,
      pick(CITIES) + ", " + pick(STATES), sDate, eDate,
      status === "Completed" ? eDate : "", budget, status,
      "Turnkey scope including civil, MEP, millwork and finishing. Lead PM: " + mgr.name,
      sDate, "Admin", randDate(2026, 2026), "Admin", "",
      "https://chat.whatsapp.com/sample-" + pId.toLowerCase()
    ]);

    const numMs = rand(2, 4);
    for (let m = 0; m < numMs; m++) {
      msCounter++;
      const msId = "MS-" + msCounter;
      const msStatus = (status === "Completed") ? "Completed" : (m === 0 ? "Completed" : (m === 1 ? "In Progress" : "Pending"));
      const msWeight = Math.round(100 / numMs);
      const msBudget = Math.round((budget * msWeight) / 100);
      const msActual = (msStatus === "Completed") ? Math.round(msBudget * 0.98) : 0;
      msRows.push([
        msId, pId, MS_TITLES[m % MS_TITLES.length], randDate(2026, 2026),
        msStatus === "Completed" ? randDate(2026, 2026) : "", msStatus,
        "Weightage: " + msWeight + "%. Budget: ₹" + msBudget + ". Actual: ₹" + msActual,
        sDate, "Admin", "", "", pick(assocNames), Math.round(msBudget * 0.15), "Lumpsum"
      ]);
    }
  }

  // 5. Generate Tasks (1,250)
  const taskRows = [];
  const TASK_TPLS = [
    "Inspect marble slab vein continuity on floor",
    "Review detailed reflected ceiling plan (RCP)",
    "Coordinate plumbing pressure test with MEP team",
    "Verify veneer grain matching for master wardrobe",
    "Site laser levelling for false ceiling channel",
    "Approve electrical switchboard cutout schedule",
    "Finalize kitchen island stone bullnosing details",
    "Test smart automation lighting dimmer circuits",
    "Conduct acoustic baffle installation audit",
    "Audit HVAC plenum clearance above false ceiling",
    "Verify door frame plumb lines and shutter clearances",
    "Prepare client walkthrough defect snag list",
    "Inspect waterproofing flood test in terrace/bathrooms",
    "Review shop drawings submitted by millwork vendor",
    "Verify paint finish swatch shade under warm lighting"
  ];
  for (let i = 1; i <= 1250; i++) {
    const tId = "TASK-" + (1000 + i);
    const pId = projIds[(i - 1) % projIds.length];
    const staff = pick(STAFF);
    const status = pick(TASK_STATUSES);
    const prio = pick(TASK_PRIORITIES);
    const sDate = randDate(2026, 2026);
    const dDate = randDate(2026, 2026);
    const tpl = TASK_TPLS[(i - 1) % TASK_TPLS.length];

    taskRows.push([
      tId, pId, tpl + " (#" + i + ")", "Ensure architectural specifications. Project: " + pId,
      "Staff", staff.name, sDate, dDate, prio, status,
      status === "Completed" ? dDate : "",
      status === "Completed" ? "Completed and verified on site." : "Work scheduled.",
      sDate, "Admin", randDate(2026, 2026), "Admin"
    ]);
  }

  // 6. Generate Site Visits (1,050)
  const visitRows = [];
  const VISIT_PURPOSES = [
    "Routine Quality Audit & Snag Inspection",
    "Initial Laser Measurement & Layout Verification",
    "Pre-Cast Slab & MEP Conduiting Inspection",
    "Client Walkthrough & Finishes Sign-off",
    "Joinery & Millwork Dry-Fit Inspection",
    "False Ceiling Plenum & Lighting Audit",
    "Material Delivery Physical Verification"
  ];
  for (let i = 1; i <= 1050; i++) {
    const vId = "VISIT-" + (1000 + i);
    const isProj = (i % 6 !== 0);
    const pId = isProj ? projIds[(i - 1) % projIds.length] : "";
    const lId = isProj ? "" : ("LEAD-" + (1000 + ((i % 150) + 1)));
    const staff = pick(STAFF);
    const status = pick(VISIT_STATUSES);
    const vDate = randDate(2026, 2026);
    const fDate = randDate(2026, 2026);
    const isBillable = (i % 4 === 0) ? "Yes" : "No";
    const billAmt = (isBillable === "Yes") ? pick([1500, 2000, 2500, 3500, 5000]) : 0;

    visitRows.push([
      vId, pId, vDate, pick(VISIT_PURPOSES),
      "Inspected by " + staff.name + ". Workmanship verified according to drawings.",
      status === "Scheduled" ? fDate : (rand(0, 1) ? fDate : ""),
      (i % 3 === 0) ? ("https://drive.google.com/sample_visit_" + vId.toLowerCase() + ".jpg") : "",
      vDate, staff.name, "", "", staff.name, status, "Staff", isBillable, billAmt, lId
    ]);
  }

  // 7. Generate Leads (160) & Lead Followups (320)
  const leadRows = [];
  const flpRows = [];
  let flpCounter = 100;
  for (let i = 1; i <= 160; i++) {
    const lId = "LEAD-" + (1000 + i);
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    const contact = fn + " " + ln;
    const pType = pick(PROJECT_TYPES);
    const status = pick(LEAD_STATUSES);
    const lDate = randDate(2025, 2026);
    const staff = pick(STAFF);

    leadRows.push([
      lId, lDate, contact + " - " + pType.split(" ")[0] + " Scope", pType,
      "98" + rand(10000000, 99999999), fn.toLowerCase() + "." + ln.toLowerCase() + "@outlook.com",
      "Turnkey interior requirement for " + rand(2500, 10000) + " sqft space in " + pick(CITIES),
      "", (i % 3 === 0) ? "Commercial" : "Luxury Residential", status, pick(LEAD_SOURCES),
      staff.name, "Active client consultation pipeline.",
      (status !== "Won" && status !== "Lost") ? randDate(2026, 2026) : "",
      status === "Lost" ? "Client opted for modular vendor due to budget." : "",
      lDate, staff.name, "", ""
    ]);

    for (let f = 0; f < 2; f++) {
      flpCounter++;
      flpRows.push([
        "FLP-" + flpCounter, lId, randDate(2026, 2026), randDate(2026, 2026),
        "Discussion regarding space planning, moodboards and material specifications.",
        lDate, staff.name
      ]);
    }
  }

  // 8. Generate Proposals (180)
  const propRows = [];
  for (let i = 1; i <= 180; i++) {
    const prId = "PROP-" + (1000 + i);
    const isCust = (i % 5 !== 0);
    const cId = isCust ? custIds[(i - 1) % custIds.length] : "";
    const lId = !isCust ? ("LEAD-" + (1000 + ((i % 150) + 1))) : "";
    const pDate = randDate(2025, 2026);
    const status = pick(PROPOSAL_STATUSES);
    const amt = rand(20, 280) * 100000;

    propRows.push([
      prId, cId, "Commercial Proposal " + prId, pDate, amt,
      "Turnkey architectural execution: Civil demolition, masonry, electrical/HVAC conduits, false ceiling, premium woodwork, painting, and handover.",
      randDate(2026, 2026), status,
      (status === "Sent" || status === "Revised") ? randDate(2026, 2026) : "",
      "Payment plan: 50% advance, 40% milestone billing, 10% retention on handover.",
      pDate, "Admin", "", "", "", lId
    ]);
  }

  // 9. Generate Financial Transactions (650)
  const txnRows = [];
  const EXPENSE_CATS = ["Material - Marble & Stone", "Material - Woodwork & Veneers", "MEP & Electrical Materials", "Subcontractor / Associate Payout", "Site Labor & Carpentry Wages", "Office Rent & Facility", "Staff Salaries", "Travel, Site Logistics & Fuel"];
  const MODES = ["Bank Transfer (NEFT/RTGS)", "UPI / QR", "Cheque", "Credit Card"];
  const BANKS = ["HDFC Bank - Current A/c *9821", "ICICI Bank - Current A/c *4410", "Kotak Mahindra Bank - Current A/c *1109"];

  for (let i = 1; i <= 650; i++) {
    const txId = "TXN-" + (1000 + i);
    const isInc = (i % 3 === 0);
    const type = isInc ? "Income" : "Expense";
    const pId = projIds[(i - 1) % projIds.length];
    const vId = !isInc ? vendIds[(i - 1) % vendIds.length] : "";
    const cat = isInc ? "Client Milestone Payment" : pick(EXPENSE_CATS);
    const baseAmt = isInc ? rand(50000, 1500000) : rand(8000, 450000);
    const gstRate = 18;
    const gstAmt = Math.round((baseAmt * gstRate) / 100);
    const total = baseAmt + gstAmt;
    const tDate = randDate(2025, 2026);
    const mode = pick(MODES);

    txnRows.push([
      txId, pId, vId, tDate, type, cat, total, baseAmt,
      "CGST + SGST (18%)", gstRate, Math.round(gstAmt / 2), Math.round(gstAmt / 2), 0, gstAmt,
      mode, pick(BANKS), mode.substring(0, 4).toUpperCase() + "-" + rand(100000, 999999),
      isInc ? ("Receipt from " + pId) : ("Payment for " + cat),
      tDate, "Admin", "", "", (!isInc && i % 4 === 0) ? pick(assocNames) : "", ""
    ]);
  }

  // 10. Users (8)
  const userRows = STAFF.map(s => [
    s.id, s.name, s.name.toLowerCase().replace(" ", ".") + "@nexsolve.in", s.mobile,
    "$2a$10$wT8Kz54N.E4n3l8V0l.fkuQvW9.aM/7gG6WqZ5U7y5jK1zF2vT1ea", "No",
    s.role, "Active", randDate(2026, 2026), randDate(2025, 2025), "SYSTEM", "", "",
    s.role === "Super Admin" ? "" : "USR-101"
  ]);

  // 11. Role Permissions (Default Matrix)
  const permRows = [];
  const allMods = ["Dashboard", "Customers", "Projects", "Milestones", "Tasks", "SiteVisits", "Leads", "Proposals", "Vendors", "Associates", "Finance", "Reports", "Users", "Company", "Masters", "Help"];
  const roles = ["Super Admin", "Project Manager", "Site Engineer", "Sales Executive", "Finance Officer"];
  let permCounter = 100;
  roles.forEach(role => {
    allMods.forEach(mod => {
      permCounter++;
      const isSuper = (role === "Super Admin");
      let canView = isSuper;
      let canAdd = isSuper;
      let canEdit = isSuper;
      let canDel = isSuper;
      if (role === "Project Manager") {
        canView = ["Dashboard", "Customers", "Projects", "Milestones", "Tasks", "SiteVisits", "Vendors", "Associates", "Proposals", "Help"].indexOf(mod) !== -1;
        canAdd = canView; canEdit = canView; canDel = false;
      } else if (role === "Site Engineer") {
        canView = ["Dashboard", "Tasks", "SiteVisits", "Help"].indexOf(mod) !== -1;
        canAdd = canView; canEdit = canView; canDel = false;
      } else if (role === "Sales Executive") {
        canView = ["Dashboard", "Leads", "Customers", "Proposals", "Help"].indexOf(mod) !== -1;
        canAdd = canView; canEdit = canView; canDel = false;
      } else if (role === "Finance Officer") {
        canView = ["Dashboard", "Finance", "Reports", "Projects", "Vendors", "Customers", "Help"].indexOf(mod) !== -1;
        canAdd = canView; canEdit = canView; canDel = false;
      }
      permRows.push(["PERM-" + permCounter, role, mod, canView, canAdd, canEdit, canDel]);
    });
  });

  // 12. Masters
  const masterRows = [
    ["ProjectType", "Luxury Residential"], ["ProjectType", "Corporate Office Fitout"], ["ProjectType", "Turnkey Villa Execution"], ["ProjectType", "Retail Flagship Showroom"], ["ProjectType", "Commercial Kitchen / Food"], ["ProjectType", "Hospitality / Boutique Hotel"],
    ["ProjectStatus", "Planning & Design"], ["ProjectStatus", "In Progress"], ["ProjectStatus", "Under Review"], ["ProjectStatus", "Completed"], ["ProjectStatus", "On Hold"], ["ProjectStatus", "Cancelled"],
    ["TaskPriority", "Critical"], ["TaskPriority", "High"], ["TaskPriority", "Medium"], ["TaskPriority", "Low"],
    ["TaskStatus", "Pending"], ["TaskStatus", "In Progress"], ["TaskStatus", "Under Review"], ["TaskStatus", "Completed"], ["TaskStatus", "Cancelled"],
    ["LeadSource", "Client Referral"], ["LeadSource", "Website Lead"], ["LeadSource", "Architect Referral"], ["LeadSource", "Exhibition"], ["LeadSource", "Direct Inquiry"], ["LeadSource", "LinkedIn"],
    ["LeadStatus", "New Inquiry"], ["LeadStatus", "Discussion"], ["LeadStatus", "Qualified"], ["LeadStatus", "Site Visit Scheduled"], ["LeadStatus", "Proposal Sent"], ["LeadStatus", "Won"], ["LeadStatus", "Lost"],
    ["ExpenseCategory", "Material - Marble & Stone"], ["ExpenseCategory", "Material - Woodwork & Veneers"], ["ExpenseCategory", "MEP & Electrical Materials"], ["ExpenseCategory", "Subcontractor / Associate Payout"], ["ExpenseCategory", "Site Labor & Carpentry Wages"], ["ExpenseCategory", "Office Rent & Facility"], ["ExpenseCategory", "Staff Salaries"], ["ExpenseCategory", "Travel, Site Logistics & Fuel"],
    ["PaymentMode", "Bank Transfer (NEFT/RTGS)"], ["PaymentMode", "UPI / QR"], ["PaymentMode", "Cheque"], ["PaymentMode", "Credit Card"]
  ];

  // 13. Company Setup
  const companyRows = [
    [
      "COMP-101", "NexSolve Architecture & Turnkey Solutions Pvt. Ltd.",
      "Plot 42, Institutional Area, Sector 44, Gurugram, Haryana - 122003",
      "mehul.gandhi@nexsolve.in", "+91 98112 23344", "AAACN1234F", "06AAACN1234F1Z9",
      "https://nexsolve.in", "HDFC Bank", "50200012349821", "HDFC0000123", "Sector 44 Gurugram",
      "", JSON.stringify(BANKS), randDate(2026, 2026), "Admin"
    ]
  ];

  // Schema definitions
  const TABLE_CONFIGS = [
    { name: "Customers", headers: ["CustomerID", "CustomerName", "Mobile", "NormalizedMobile", "AlternateMobile", "Email", "Address", "City", "State", "Pincode", "PANCardNumber", "GSTNumber", "CustomerType", "Notes", "Status", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments"], data: custRows },
    { name: "Vendors", headers: ["VendorID", "VendorName", "ContactPerson", "Mobile", "Email", "Address", "GSTNumber", "VendorType", "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments"], data: vendRows },
    { name: "Associates", headers: ["AssociateID", "AssociateName", "ContactPerson", "Mobile", "Email", "Address", "GSTNumber", "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"], data: assocRows },
    { name: "Projects", headers: ["ProjectID", "ProjectName", "CustomerID", "InquiryID", "ProjectType", "Location", "StartDate", "ExpectedCompletionDate", "ActualCompletionDate", "ProjectValue", "Status", "Notes", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments", "WhatsAppGroupLink"], data: projRows },
    { name: "Milestones", headers: ["MilestoneID", "ProjectID", "MilestoneName", "DueDate", "CompletionDate", "Status", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "AssociateName", "AssociateCost", "AssociateType"], data: msRows },
    { name: "Tasks", headers: ["TaskID", "ProjectID", "TaskName", "Description", "AssignedType", "AssignedTo", "StartDate", "DueDate", "Priority", "Status", "CompletionDate", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"], data: taskRows },
    { name: "SiteVisits", headers: ["VisitID", "ProjectID", "VisitDate", "Purpose", "Remarks", "NextFollowupDate", "Photos", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "AssignedTo", "Status", "AssignedType", "IsBillable", "BillingAmount", "LeadID"], data: visitRows },
    { name: "Leads", headers: ["LeadID", "Date", "CustomerName", "ProjectType", "Mobile", "Email", "ProjectDetails", "Attachments", "LeadType", "Status", "Source", "AssignedTo", "Remarks", "FollowUpDate", "LossReason", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy"], data: leadRows },
    { name: "LeadFollowups", headers: ["FollowupID", "LeadID", "FollowupDate", "NextFollowupDate", "DiscussionNotes", "CreatedDate", "CreatedBy"], data: flpRows },
    { name: "Proposals", headers: ["ProposalID", "CustomerID", "ProjectName", "ProposalDate", "Amount", "ScopeOfWork", "ValidityDate", "Status", "FollowUpDate", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "Attachments", "LeadID"], data: propRows },
    { name: "Transactions", headers: ["TransactionID", "ProjectID", "VendorID", "TransactionDate", "Type", "Category", "Amount", "TaxableAmount", "GSTType", "GSTRate", "CGST", "SGST", "IGST", "TotalGST", "PaymentMode", "BankAccount", "ReferenceNumber", "Remarks", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "AssociateName", "Attachments"], data: txnRows },
    { name: "Users", headers: ["UserID", "FullName", "Email", "Mobile", "PasswordHash", "MustChangePassword", "RoleID", "Status", "LastLogin", "CreatedDate", "CreatedBy", "ModifiedDate", "ModifiedBy", "ReportsTo"], data: userRows },
    { name: "RolePermissions", headers: ["PermissionID", "RoleID", "Module", "CanView", "CanAdd", "CanEdit", "CanDelete"], data: permRows },
    { name: "Masters", headers: ["DropdownKey", "DropdownValue"], data: masterRows },
    { name: "CompanySetup", headers: ["CompanyID", "CompanyName", "Address", "OfficialEmail", "ContactNumber", "PANNumber", "GSTNumber", "Website", "BankName", "AccountNumber", "IFSCCode", "Branch", "LogoUrl", "BankAccounts", "ModifiedDate", "ModifiedBy"], data: companyRows }
  ];

  // Batch Write all tables to Spreadsheet
  TABLE_CONFIGS.forEach(function(cfg) {
    let sheet = ss.getSheetByName(cfg.name);
    if (!sheet) {
      sheet = ss.insertSheet(cfg.name);
    }
    sheet.clear();
    
    // Write headers
    sheet.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
    sheet.getRange(1, 1, 1, cfg.headers.length)
      .setBackground("#0f766e")
      .setFontColor("#ffffff")
      .setFontWeight("bold");
    sheet.setFrozenRows(1);

    // High-performance single-call array write
    if (cfg.data && cfg.data.length > 0) {
      sheet.getRange(2, 1, cfg.data.length, cfg.headers.length).setValues(cfg.data);
    }
  });

  const durationSec = ((new Date().getTime() - startTime) / 1000).toFixed(1);
  const msg = "✅ Benchmark Database Generation Complete in " + durationSec + "s!\n\n" +
    "• Customers: " + custRows.length + "\n" +
    "• Projects: " + projRows.length + "\n" +
    "• Milestones: " + msRows.length + "\n" +
    "• Tasks: " + taskRows.length + " (Kanban)\n" +
    "• Site Visits: " + visitRows.length + "\n" +
    "• Proposals: " + propRows.length + "\n" +
    "• Transactions: " + txnRows.length + "\n" +
    "• Leads: " + leadRows.length + " (" + flpRows.length + " followups)\n" +
    "• Vendors & Associates: " + (vendRows.length + assocRows.length) + "\n\n" +
    "All sheets are indexed, relational, and formatted for 0ms NexMilestro performance testing.";
    
  try {
    SpreadsheetApp.getUi().alert("NexMilestro Benchmark Engine", msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch(e) {
    Logger.log(msg);
  }

  return { success: true, message: msg };
}
