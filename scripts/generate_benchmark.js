const fs = require('fs');
const path = require('path');

console.log("=== GENERATING HIGH-VOLUME BENCHMARK DATASET FOR NEXMILESTRO ===");

const CITIES = ["Gurugram", "New Delhi", "Noida", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Ahmedabad", "Chandigarh", "Jaipur"];
const STATES = ["Haryana", "Delhi", "Uttar Pradesh", "Maharashtra", "Karnataka", "Maharashtra", "Telangana", "Gujarat", "Punjab", "Rajasthan"];

const FIRST_NAMES = [
  "Rajeev", "Amit", "Vikram", "Sunil", "Rohan", "Ananya", "Pooja", "Sanjay", "Deepak", "Neha",
  "Karan", "Gaurav", "Naveen", "Rahul", "Meera", "Aditya", "Shweta", "Manish", "Divya", "Tarun",
  "Ashish", "Sneha", "Alok", "Priya", "Vivek", "Kavita", "Siddharth", "Nidhi", "Harish", "Ritu"
];

const LAST_NAMES = [
  "Singhal", "Sharma", "Verma", "Mehta", "Patel", "Kapoor", "Gupta", "Malhotra", "Joshi", "Bansal",
  "Chopra", "Reddy", "Nair", "Saxena", "Bhatia", "Trivedi", "Agrawal", "Shah", "Iyer", "Rao",
  "Khanna", "Deshmukh", "Chawla", "Bhardwaj", "Kulkarni", "Mittal", "Sarin", "Dewan", "Goyal", "Seth"
];

const CORP_PREFIXES = [
  "DLF", "Oberoi", "Godrej", "Tata", "Lodha", "Prestige", "Sobha", "Brigade", "Hiranandani", "K Raheja",
  "Mahindra", "Reliance", "Adani", "Piramal", "Embassy", "Salarpuria", "Phoenix", "Shapoorji", "L&T", "GMR"
];

const CORP_SUFFIXES = [
  "Properties Ltd", "Realty & Infrastructure", "Developments Pvt Ltd", "Living Spaces", "Commercial Towers",
  "Projects Corp", "Asset Holdings", "Estates Pvt Ltd", "Builders & Turnkey", "Infrastructure Corp"
];

const PROJECT_TYPES = [
  "Luxury Residential", "Corporate Office Fitout", "Turnkey Villa Execution",
  "Retail Flagship Showroom", "Commercial Kitchen / Food", "Hospitality / Boutique Hotel"
];

const PROJECT_STATUSES = ["Planning & Design", "In Progress", "In Progress", "In Progress", "Under Review", "Completed", "On Hold"];
const TASK_PRIORITIES = ["Critical", "High", "Medium", "Medium", "Low"];
const TASK_STATUSES = ["Pending", "In Progress", "In Progress", "Under Review", "Completed", "Completed"];
const VISIT_STATUSES = ["Completed", "Completed", "Completed", "Scheduled"];
const PROPOSAL_STATUSES = ["Draft", "Sent", "Approved", "Approved", "Revised", "Rejected"];
const LEAD_SOURCES = ["Client Referral", "Website Lead", "Architect Referral", "Exhibition", "Direct Inquiry", "LinkedIn"];
const LEAD_STATUSES = ["New Inquiry", "Discussion", "Qualified", "Site Visit Scheduled", "Proposal Sent", "Won", "Lost"];

const STAFF_MEMBERS = [
  { UserID: "USR-101", FullName: "Mehul Gandhi", RoleID: "Super Admin", Mobile: "9811223344" },
  { UserID: "USR-102", FullName: "Dhwani Gandhi", RoleID: "Project Manager", Mobile: "9822334455" },
  { UserID: "USR-103", FullName: "Karan Mehta", RoleID: "Site Engineer", Mobile: "9833445566" },
  { UserID: "USR-104", FullName: "Ananya Sen", RoleID: "Sales Executive", Mobile: "9844556677" },
  { UserID: "USR-105", FullName: "Rajesh Kulkarni", RoleID: "Finance Officer", Mobile: "9855667788" },
  { UserID: "USR-106", FullName: "Siddharth Verma", RoleID: "Project Manager", Mobile: "9866778899" },
  { UserID: "USR-107", FullName: "Pooja Sharma", RoleID: "Site Engineer", Mobile: "9877889900" },
  { UserID: "USR-108", FullName: "Vikram Saxena", RoleID: "Site Engineer", Mobile: "9888990011" }
];

function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(startYear, endYear) {
  const start = new Date(startYear, 0, 1).getTime();
  const end = new Date(endYear, 11, 31).getTime();
  const d = new Date(start + Math.random() * (end - start));
  return d.toISOString().substring(0, 10);
}

function generatePAN() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let pan = "";
  for (let i = 0; i < 5; i++) pan += randomChoice(letters);
  for (let i = 0; i < 4; i++) pan += randomInt(0, 9);
  pan += randomChoice(letters);
  return pan;
}

function generateGST(pan, stateIndex) {
  const stateCode = String((stateIndex % 35) + 1).padStart(2, "0");
  return `${stateCode}${pan}1Z${randomChoice("123456789ABCDEF")}`;
}

// 1. Generate 120 Customers
const customers = [];
for (let i = 1; i <= 125; i++) {
  const custId = `CUST-${1000 + i}`;
  const cityIdx = (i - 1) % CITIES.length;
  const city = CITIES[cityIdx];
  const state = STATES[cityIdx];
  const pan = generatePAN();
  const gst = generateGST(pan, cityIdx);
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const contactPerson = `${firstName} ${lastName}`;
  const isCorp = (i % 3 !== 0);
  const companyName = isCorp 
    ? `${randomChoice(CORP_PREFIXES)} ${randomChoice(CORP_SUFFIXES)}`
    : `${contactPerson} Residence`;
  const mobile = `98${randomInt(10000000, 99999999)}`;
  const email = isCorp 
    ? `contact@${companyName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15)}.in`
    : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`;

  customers.push({
    CustomerID: custId,
    CustomerName: companyName,
    Mobile: mobile,
    NormalizedMobile: mobile,
    AlternateMobile: `97${randomInt(10000000, 99999999)}`,
    Email: email,
    Address: `${randomInt(1, 400)}, Sector ${randomInt(1, 95)}, ${city}`,
    City: city,
    State: state,
    Pincode: `${randomInt(110001, 800000)}`,
    PANCardNumber: pan,
    GSTNumber: gst,
    CustomerType: isCorp ? "Enterprise / Commercial" : "HNI Residential",
    Notes: `Established account managed by StudioSpace. Priority rating: ${randomChoice(["Tier 1 Platinum", "Tier 2 Gold", "Standard"])}.`,
    Status: i > 120 ? "Inactive" : "Active",
    CreatedDate: randomDate(2025, 2026),
    CreatedBy: "Admin",
    ModifiedDate: randomDate(2026, 2026),
    ModifiedBy: "Admin",
    Attachments: ""
  });
}

// 2. Generate 55 Vendors
const VENDOR_CATS = [
  "Modular Woodwork & Veneers", "Italian Marble & Granite", "Sanitaryware & Bath Fittings",
  "Lighting & Automation", "HVAC & Ducting", "Civil, Masonry & POP", "Glazing & Aluminum Facades",
  "Upholstery, Curtains & Rugs", "Hardware & Architectural Fittings"
];
const vendors = [];
for (let i = 1; i <= 55; i++) {
  const vId = `VNDR-${1000 + i}`;
  const cat = VENDOR_CATS[(i - 1) % VENDOR_CATS.length];
  const pan = generatePAN();
  const vName = `${randomChoice(LAST_NAMES)} ${cat.split(" ")[0]} & Co.`;
  vendors.push({
    VendorID: vId,
    VendorName: vName,
    ContactPerson: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
    Mobile: `99${randomInt(10000000, 99999999)}`,
    Email: `sales@${vName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 12)}.in`,
    Address: `Plot ${randomInt(1, 150)}, Industrial Area, ${randomChoice(CITIES)}`,
    GSTNumber: generateGST(pan, i),
    VendorType: cat,
    Status: "Active",
    Notes: "Approved vendor on 30-day payment terms.",
    CreatedDate: randomDate(2025, 2026),
    CreatedBy: "Admin",
    ModifiedDate: "",
    ModifiedBy: "",
    Attachments: ""
  });
}

// 3. Generate 35 Associates
const ASSOC_SPECS = [
  "Photorealistic 3D Rendering & Elevation", "MEP & Electrical Consultant", "Structural Engineer",
  "Acoustics & Home Cinema Specialist", "Landscape & Terrace Garden Architect", "Automation & IoT System Integrator"
];
const associates = [];
for (let i = 1; i <= 35; i++) {
  const aId = `ASSOC-${100 + i}`;
  const spec = ASSOC_SPECS[(i - 1) % ASSOC_SPECS.length];
  const aName = `Studio ${randomChoice(LAST_NAMES)} Design Partners`;
  associates.push({
    AssociateID: aId,
    AssociateName: aName,
    ContactPerson: `${randomChoice(FIRST_NAMES)} ${randomChoice(LAST_NAMES)}`,
    Mobile: `98${randomInt(10000000, 99999999)}`,
    Email: `contact@${aName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15)}.in`,
    Address: `${randomInt(1, 50)}, Commercial Complex, ${randomChoice(CITIES)}`,
    GSTNumber: generateGST(generatePAN(), i),
    Status: "Active",
    Notes: `Specialized in ${spec}. Rate basis: Lumpsum milestone contract.`,
    CreatedDate: randomDate(2025, 2026),
    CreatedBy: "Admin",
    ModifiedDate: "",
    ModifiedBy: ""
  });
}

// 4. Generate 225 Projects
const projects = [];
const milestones = [];
let milestoneCounter = 1000;

for (let i = 1; i <= 225; i++) {
  const pId = `PROJ-${1000 + i}`;
  const cust = customers[(i - 1) % customers.length];
  const projType = randomChoice(PROJECT_TYPES);
  const status = randomChoice(PROJECT_STATUSES);
  const budget = randomInt(18, 250) * 100000; // ₹18 Lakhs to ₹2.5 Cr
  const startDate = randomDate(2025, 2026);
  const sDateObj = new Date(startDate);
  const eDateObj = new Date(sDateObj.getTime() + randomInt(60, 240) * 86400000);
  const expCompDate = eDateObj.toISOString().substring(0, 10);
  const mgr = randomChoice(STAFF_MEMBERS.filter(s => s.RoleID.includes("Admin") || s.RoleID.includes("Manager")));
  const pName = `${cust.CustomerName.split(" ")[0]} - ${projType.split(" ")[0]} Phase ${((i - 1) % 3) + 1}`;

  projects.push({
    ProjectID: pId,
    ProjectName: pName,
    CustomerID: cust.CustomerID,
    InquiryID: `LEAD-${1000 + ((i % 150) + 1)}`,
    ProjectType: projType,
    Location: `${cust.City}, ${cust.State}`,
    StartDate: startDate,
    ExpectedCompletionDate: expCompDate,
    ActualCompletionDate: status === "Completed" ? expCompDate : "",
    ProjectValue: budget,
    Status: status,
    Notes: `Turnkey execution scope including civil, MEP, bespoke millwork, and finishes. Managed by ${mgr.FullName}.`,
    CreatedDate: startDate,
    CreatedBy: "Admin",
    ModifiedDate: randomDate(2026, 2026),
    ModifiedBy: "Admin",
    Attachments: "",
    WhatsAppGroupLink: `https://chat.whatsapp.com/sample-${pId.toLowerCase()}`
  });

  // Generate 2-4 Milestones per project (~600 milestones total)
  const numMs = randomInt(2, 4);
  const msTitles = [
    "Site Survey, Demolition & Architectural Floor Plans",
    "MEP Piping, Electrical Conduiting & HVAC First Fix",
    "Flooring, False Ceiling Grid & POP Skimming",
    "Modular Millwork, Veneers & Kitchen Installation",
    "Surface Painting, Lighting Fixtures & Final Handover"
  ];
  for (let m = 0; m < numMs; m++) {
    milestoneCounter++;
    const msId = `MS-${milestoneCounter}`;
    const msStatus = (status === "Completed") ? "Completed" : (m === 0 ? "Completed" : (m === 1 ? "In Progress" : "Pending"));
    const msWeight = Math.round(100 / numMs);
    const msBudget = Math.round((budget * msWeight) / 100);
    const msActual = (msStatus === "Completed") ? Math.round(msBudget * (0.95 + Math.random() * 0.1)) : 0;
    const assignedAssoc = randomChoice(associates);

    milestones.push({
      MilestoneID: msId,
      ProjectID: pId,
      MilestoneName: msTitles[m % msTitles.length],
      DueDate: randomDate(2026, 2026),
      CompletionDate: msStatus === "Completed" ? randomDate(2026, 2026) : "",
      Status: msStatus,
      Remarks: `Weightage: ${msWeight}%. Budget: ₹${msBudget.toLocaleString('en-IN')}. Actual Cost: ₹${msActual.toLocaleString('en-IN')}`,
      CreatedDate: startDate,
      CreatedBy: "Admin",
      ModifiedDate: "",
      ModifiedBy: "",
      AssociateName: assignedAssoc.AssociateName,
      AssociateCost: Math.round(msBudget * 0.15),
      AssociateType: "Lumpsum"
    });
  }
}

// 5. Generate 1,250 Tasks
const TASK_TEMPLATES = [
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

const tasks = [];
for (let i = 1; i <= 1250; i++) {
  const tId = `TASK-${1000 + i}`;
  const proj = projects[(i - 1) % projects.length];
  const staff = randomChoice(STAFF_MEMBERS);
  const status = randomChoice(TASK_STATUSES);
  const priority = randomChoice(TASK_PRIORITIES);
  const tpl = TASK_TEMPLATES[(i - 1) % TASK_TEMPLATES.length];
  const startDate = randomDate(2026, 2026);
  const sObj = new Date(startDate);
  const dueDate = new Date(sObj.getTime() + randomInt(2, 21) * 86400000).toISOString().substring(0, 10);

  tasks.push({
    TaskID: tId,
    ProjectID: proj.ProjectID,
    TaskName: `${tpl} (#${i})`,
    Description: `Ensure strict architectural standards as per approved BOQ specifications. Site: ${proj.Location}.`,
    AssignedType: "Staff",
    AssignedTo: staff.FullName,
    StartDate: startDate,
    DueDate: dueDate,
    Priority: priority,
    Status: status,
    CompletionDate: (status === "Completed") ? dueDate : "",
    Remarks: status === "Completed" ? "Inspected and signed off on site." : "Work in progress.",
    CreatedDate: startDate,
    CreatedBy: "Admin",
    ModifiedDate: randomDate(2026, 2026),
    ModifiedBy: "Admin"
  });
}

// 6. Generate 1,050 Site Visits
const VISIT_PURPOSES = [
  "Routine Quality Audit & Snag Inspection",
  "Initial Laser Measurement & Layout Verification",
  "Pre-Cast Slab & MEP Conduiting Inspection",
  "Client Walkthrough & Finishes Sign-off",
  "Joinery & Millwork Dry-Fit Inspection",
  "False Ceiling Plenum & Lighting Audit",
  "Material Delivery Physical Verification"
];

const siteVisits = [];
for (let i = 1; i <= 1050; i++) {
  const vId = `VISIT-${1000 + i}`;
  const isProj = (i % 6 !== 0);
  const proj = isProj ? projects[(i - 1) % projects.length] : null;
  const leadId = isProj ? "" : `LEAD-${1000 + ((i % 150) + 1)}`;
  const staff = randomChoice(STAFF_MEMBERS);
  const status = randomChoice(VISIT_STATUSES);
  const visitDate = randomDate(2026, 2026);
  const vDateObj = new Date(visitDate);
  const followupDate = new Date(vDateObj.getTime() + randomInt(5, 20) * 86400000).toISOString().substring(0, 10);
  const isBillable = (i % 4 === 0) ? "Yes" : "No";
  const billAmount = (isBillable === "Yes") ? randomChoice([1500, 2000, 2500, 3500, 5000]) : 0;
  const purpose = randomChoice(VISIT_PURPOSES);

  siteVisits.push({
    VisitID: vId,
    ProjectID: proj ? proj.ProjectID : "",
    VisitDate: visitDate,
    Purpose: purpose,
    Remarks: `Inspection completed by ${staff.FullName}. Site status verified in good order. Observations recorded in field log.`,
    NextFollowupDate: status === "Scheduled" ? followupDate : (randomInt(0, 1) ? followupDate : ""),
    Photos: (i % 3 === 0) ? `https://drive.google.com/sample_visit_${vId.toLowerCase()}.jpg` : "",
    CreatedDate: visitDate,
    CreatedBy: staff.FullName,
    ModifiedDate: "",
    ModifiedBy: "",
    AssignedTo: staff.FullName,
    Status: status,
    AssignedType: "Staff",
    IsBillable: isBillable,
    BillingAmount: billAmount,
    LeadID: leadId
  });
}

// 7. Generate 160 Leads & 320 Follow-ups
const leads = [];
const leadFollowups = [];
let flpCounter = 100;

for (let i = 1; i <= 160; i++) {
  const lId = `LEAD-${1000 + i}`;
  const firstName = randomChoice(FIRST_NAMES);
  const lastName = randomChoice(LAST_NAMES);
  const contact = `${firstName} ${lastName}`;
  const city = randomChoice(CITIES);
  const pType = randomChoice(PROJECT_TYPES);
  const status = randomChoice(LEAD_STATUSES);
  const dealValue = randomInt(25, 300) * 100000;
  const staff = randomChoice(STAFF_MEMBERS);
  const lDate = randomDate(2025, 2026);

  leads.push({
    LeadID: lId,
    Date: lDate,
    CustomerName: `${contact} - ${pType.split(" ")[0]} Design`,
    ProjectType: pType,
    Mobile: `98${randomInt(10000000, 99999999)}`,
    Email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@outlook.com`,
    ProjectDetails: `Requirement for ${randomInt(3000, 12000)} sqft turnkey space in ${city}. Estimated budget ₹${dealValue.toLocaleString('en-IN')}.`,
    Attachments: "",
    LeadType: (i % 3 === 0) ? "Commercial" : "Luxury Residential",
    Status: status,
    Source: randomChoice(LEAD_SOURCES),
    AssignedTo: staff.FullName,
    Remarks: `Prospect is actively looking to start within ${randomChoice(["1 month", "2 weeks", "immediate", "next quarter"])}.`,
    FollowUpDate: (status !== "Won" && status !== "Lost") ? randomDate(2026, 2026) : "",
    LossReason: status === "Lost" ? "Client opted for modular vendor due to budget constraints." : "",
    CreatedDate: lDate,
    CreatedBy: staff.FullName,
    ModifiedDate: "",
    ModifiedBy: ""
  });

  // 2 Follow-ups per lead
  for (let f = 0; f < 2; f++) {
    flpCounter++;
    leadFollowups.push({
      FollowupID: `FLP-${flpCounter}`,
      LeadID: lId,
      FollowupDate: randomDate(2026, 2026),
      NextFollowupDate: randomDate(2026, 2026),
      DiscussionNotes: `Discussion regarding preliminary layouts, BOQ line items and timeline milestones. Client expressed interest.`,
      CreatedDate: lDate,
      CreatedBy: staff.FullName
    });
  }
}

// 8. Generate 180 Proposals
const proposals = [];
for (let i = 1; i <= 180; i++) {
  const propId = `PROP-${1000 + i}`;
  const isCust = (i % 5 !== 0);
  const cust = isCust ? customers[(i - 1) % customers.length] : null;
  const lead = !isCust ? leads[(i - 1) % leads.length] : null;
  const propDate = randomDate(2025, 2026);
  const pDateObj = new Date(propDate);
  const valDate = new Date(pDateObj.getTime() + 30 * 86400000).toISOString().substring(0, 10);
  const amt = randomInt(20, 280) * 100000;
  const status = randomChoice(PROPOSAL_STATUSES);

  proposals.push({
    ProposalID: propId,
    CustomerID: cust ? cust.CustomerID : "",
    ProjectName: cust ? `${cust.CustomerName} Interior Fitout Scope` : `${lead.CustomerName} Scope Document`,
    ProposalDate: propDate,
    Amount: amt,
    ScopeOfWork: "Comprehensive turnkey architectural execution: Civil demolition, masonry, electrical/HVAC conduits, false ceiling, premium woodwork, painting, and handover.",
    ValidityDate: valDate,
    Status: status,
    FollowUpDate: (status === "Sent" || status === "Revised") ? randomDate(2026, 2026) : "",
    Remarks: `Commercial proposal presented with 18% GST terms. Payment plan: 50% advance, 40% milestone billing, 10% retention on handover.`,
    CreatedDate: propDate,
    CreatedBy: "Admin",
    ModifiedDate: "",
    ModifiedBy: "",
    Attachments: "",
    LeadID: lead ? lead.LeadID : ""
  });
}

// 9. Generate 650 Transactions
const EXPENSE_CATEGORIES = [
  "Material - Marble & Stone", "Material - Woodwork & Veneers", "MEP & Electrical Materials",
  "Subcontractor / Associate Payout", "Site Labor & Carpentry Wages", "Office Rent & Facility",
  "Staff Salaries", "Travel, Site Logistics & Fuel", "Architectural Software & Licensing"
];
const PAYMENT_MODES = ["Bank Transfer (NEFT/RTGS)", "UPI / QR", "Cheque", "Credit Card"];
const BANK_ACCOUNTS = [
  "HDFC Bank - Current A/c *9821",
  "ICICI Bank - Current A/c *4410",
  "Kotak Mahindra Bank - Current A/c *1109"
];

const transactions = [];
for (let i = 1; i <= 650; i++) {
  const txnId = `TXN-${1000 + i}`;
  const isIncome = (i % 3 === 0); // 33% Income, 67% Expense
  const type = isIncome ? "Income" : "Expense";
  const proj = projects[(i - 1) % projects.length];
  const vendor = !isIncome ? vendors[(i - 1) % vendors.length] : null;
  const assoc = (!isIncome && i % 4 === 0) ? associates[(i - 1) % associates.length] : null;
  const category = isIncome ? "Client Milestone Payment" : randomChoice(EXPENSE_CATEGORIES);
  const baseAmt = isIncome ? randomInt(50000, 1500000) : randomInt(8000, 450000);
  const gstRate = 18;
  const gstAmount = Math.round((baseAmt * gstRate) / 100);
  const totalAmt = baseAmt + gstAmount;
  const tDate = randomDate(2025, 2026);
  const pMode = randomChoice(PAYMENT_MODES);
  const bankAcc = randomChoice(BANK_ACCOUNTS);

  transactions.push({
    TransactionID: txnId,
    ProjectID: proj.ProjectID,
    VendorID: vendor ? vendor.VendorID : "",
    TransactionDate: tDate,
    Type: type,
    Category: category,
    Amount: totalAmt,
    TaxableAmount: baseAmt,
    GSTType: "CGST + SGST (18%)",
    GSTRate: gstRate,
    CGST: Math.round(gstAmount / 2),
    SGST: Math.round(gstAmount / 2),
    IGST: 0,
    TotalGST: gstAmount,
    PaymentMode: pMode,
    BankAccount: bankAcc,
    ReferenceNumber: `${pMode.substring(0, 4).toUpperCase()}-${randomInt(100000, 999999)}`,
    Remarks: isIncome 
      ? `Receipt against project milestone from ${proj.ProjectName}.`
      : `Disbursement for ${category} against PO #${randomInt(100, 999)}.`,
    CreatedDate: tDate,
    CreatedBy: "Admin",
    ModifiedDate: "",
    ModifiedBy: "",
    AssociateName: assoc ? assoc.AssociateName : "",
    Attachments: ""
  });
}

// 10. Users, Roles, Masters & Setup
const users = STAFF_MEMBERS.map(s => ({
  UserID: s.UserID,
  FullName: s.FullName,
  Email: `${s.FullName.toLowerCase().replace(" ", ".")}@nexsolve.in`,
  Mobile: s.Mobile,
  RoleID: s.RoleID,
  Status: "Active",
  MustChangePassword: "No",
  CreatedDate: "2025-01-01",
  CreatedBy: "SYSTEM",
  ReportsTo: s.RoleID === "Super Admin" ? "" : "USR-101"
}));

const dropdowns = {
  ProjectType: PROJECT_TYPES,
  ProjectStatus: ["Planning & Design", "In Progress", "Under Review", "Completed", "On Hold", "Cancelled"],
  TaskPriority: ["Critical", "High", "Medium", "Low"],
  TaskStatus: ["Pending", "In Progress", "Under Review", "Completed", "Cancelled"],
  LeadSource: LEAD_SOURCES,
  LeadStatus: LEAD_STATUSES,
  ExpenseCategory: EXPENSE_CATEGORIES,
  PaymentMode: PAYMENT_MODES,
  CustomerType: ["Enterprise / Commercial", "HNI Residential", "Boutique Retail", "Government / Institutional"]
};

const companySetup = {
  CompanyID: "COMP-101",
  CompanyName: "NexSolve Architecture & Turnkey Solutions Pvt. Ltd.",
  Address: "Plot 42, Institutional Area, Sector 44, Gurugram, Haryana - 122003",
  OfficialEmail: "mehul.gandhi@nexsolve.in",
  ContactNumber: "+91 98112 23344",
  PANNumber: "AAACN1234F",
  GSTNumber: "06AAACN1234F1Z9",
  Website: "https://nexsolve.in",
  BankName: "HDFC Bank",
  AccountNumber: "50200012349821",
  IFSCCode: "HDFC0000123",
  Branch: "Sector 44 Gurugram",
  LogoUrl: ""
};

const fullBenchmarkData = {
  customers,
  vendors,
  associates,
  projects,
  milestones,
  tasks,
  siteVisits,
  leads,
  leadFollowups,
  proposals,
  transactions,
  users,
  dropdowns,
  companySetup
};

// Summary metrics
console.log("-----------------------------------------");
console.log(`✓ Customers:     ${customers.length} (Target: 100+)`);
console.log(`✓ Projects:      ${projects.length} (Target: 200+)`);
console.log(`✓ Milestones:    ${milestones.length}`);
console.log(`✓ Tasks:         ${tasks.length} (Target: 1000+)`);
console.log(`✓ Site Visits:   ${siteVisits.length} (Target: 1000+)`);
console.log(`✓ Proposals:     ${proposals.length} (Target: 150+)`);
console.log(`✓ Transactions:  ${transactions.length} (Target: 500+)`);
console.log(`✓ Leads:         ${leads.length}`);
console.log(`✓ Lead Followups:${leadFollowups.length}`);
console.log(`✓ Vendors:       ${vendors.length}`);
console.log(`✓ Associates:    ${associates.length}`);
console.log(`✓ Users:         ${users.length}`);
console.log("-----------------------------------------");

// Write out benchmark data directory with JSON & CSVs
const outputDir = path.join(__dirname, '..', 'benchmark_data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 1. Write complete JSON payload
const jsonPath = path.join(outputDir, 'nexmilestro_benchmark_full.json');
fs.writeFileSync(jsonPath, JSON.stringify(fullBenchmarkData, null, 2), 'utf8');
const jsonSizeMb = (fs.statSync(jsonPath).size / (1024 * 1024)).toFixed(2);
console.log(`✓ Saved complete benchmark JSON: ${jsonPath} (${jsonSizeMb} MB)`);

// 2. Write CSV files for each table
function arrayToCSV(arr) {
  if (!arr || arr.length === 0) return '';
  const headers = Object.keys(arr[0]);
  const rows = arr.map(obj => {
    return headers.map(header => {
      let val = obj[header] === undefined || obj[header] === null ? '' : String(obj[header]);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

Object.keys(fullBenchmarkData).forEach(key => {
  if (Array.isArray(fullBenchmarkData[key]) && fullBenchmarkData[key].length > 0) {
    const csvContent = arrayToCSV(fullBenchmarkData[key]);
    const csvPath = path.join(outputDir, `${key}.csv`);
    fs.writeFileSync(csvPath, csvContent, 'utf8');
    const sizeKb = (fs.statSync(csvPath).size / 1024).toFixed(1);
    console.log(`  - ${key}.csv (${fullBenchmarkData[key].length} rows, ${sizeKb} KB)`);
  }
});

console.log("=== BENCHMARK GENERATION COMPLETE ===");
