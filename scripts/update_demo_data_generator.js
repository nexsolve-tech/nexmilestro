const fs = require('fs');
const path = require('path');

const tplPath = path.join(__dirname, '..', 'Index_Template.html');
let content = fs.readFileSync(tplPath, 'utf8');

const startMarker = '    function generateEnterpriseDemoData() {';
const endMarker = '    window.generateEnterpriseDemoData = generateEnterpriseDemoData;';

const sIdx = content.indexOf(startMarker);
const eIdx = content.indexOf(endMarker);

if (sIdx === -1 || eIdx === -1) {
  console.error("Could not find start or end markers in Index_Template.html");
  process.exit(1);
}

const newGeneratorCode = `    function generateEnterpriseDemoData() {
      var CITIES = ["Gurugram", "New Delhi", "Noida", "Mumbai", "Bengaluru", "Pune", "Hyderabad", "Ahmedabad", "Chandigarh", "Jaipur"];
      var STATES = ["Haryana", "Delhi", "Uttar Pradesh", "Maharashtra", "Karnataka", "Maharashtra", "Telangana", "Gujarat", "Punjab", "Rajasthan"];
      var FIRST_NAMES = ["Rajeev", "Amit", "Vikram", "Sunil", "Rohan", "Ananya", "Pooja", "Sanjay", "Deepak", "Neha", "Karan", "Gaurav", "Naveen", "Rahul", "Meera", "Aditya", "Shweta", "Manish", "Divya", "Tarun", "Ashish", "Sneha", "Alok", "Priya", "Vivek", "Kavita", "Siddharth", "Nidhi", "Harish", "Ritu"];
      var LAST_NAMES = ["Singhal", "Sharma", "Verma", "Mehta", "Patel", "Kapoor", "Gupta", "Malhotra", "Joshi", "Bansal", "Chopra", "Reddy", "Nair", "Saxena", "Bhatia", "Trivedi", "Agrawal", "Shah", "Iyer", "Rao", "Khanna", "Deshmukh", "Chawla", "Bhardwaj", "Kulkarni", "Mittal", "Sarin", "Dewan", "Goyal", "Seth"];
      var CORP_PREFIXES = ["DLF", "Oberoi", "Godrej", "Tata", "Lodha", "Prestige", "Sobha", "Brigade", "Hiranandani", "K Raheja", "Mahindra", "Reliance", "Adani", "Piramal", "Embassy", "Salarpuria", "Phoenix", "Shapoorji", "L&T", "GMR"];
      var CORP_SUFFIXES = ["Properties Ltd", "Realty & Infrastructure", "Developments Pvt Ltd", "Living Spaces", "Commercial Towers", "Projects Corp", "Asset Holdings", "Estates Pvt Ltd", "Builders & Turnkey", "Infrastructure Corp"];
      var PROJECT_TYPES = ["Luxury Residential", "Corporate Office Fitout", "Turnkey Villa Execution", "Retail Flagship Showroom", "Commercial Kitchen / Food", "Hospitality / Boutique Hotel"];
      var PROJECT_STATUSES = ["Planning & Design", "In Progress", "In Progress", "In Progress", "Under Review", "Completed", "On Hold"];
      var TASK_PRIORITIES = ["Critical", "High", "Medium", "Medium", "Low"];
      var TASK_STATUSES = ["Pending", "In Progress", "In Progress", "Under Review", "Completed", "Completed"];
      var VISIT_STATUSES = ["Completed", "Completed", "Completed", "Scheduled"];
      var PROPOSAL_STATUSES = ["Draft", "Sent", "Approved", "Approved", "Revised", "Rejected"];
      var LEAD_SOURCES = ["Client Referral", "Website Lead", "Architect Referral", "Exhibition", "Direct Inquiry", "LinkedIn"];
      var LEAD_STATUSES = ["New Inquiry", "Discussion", "Qualified", "Site Visit Scheduled", "Proposal Sent", "Won", "Lost"];

      var STAFF = [
        { UserID: "USR-101", FullName: "Mehul Gandhi", RoleID: "Super Admin", Mobile: "9811223344" },
        { UserID: "USR-102", FullName: "Dhwani Gandhi", RoleID: "Project Manager", Mobile: "9822334455" },
        { UserID: "USR-103", FullName: "Karan Mehta", RoleID: "Site Engineer", Mobile: "9833445566" },
        { UserID: "USR-104", FullName: "Ananya Sen", RoleID: "Sales Executive", Mobile: "9844556677" },
        { UserID: "USR-105", FullName: "Rajesh Kulkarni", RoleID: "Finance Officer", Mobile: "9855667788" },
        { UserID: "USR-106", FullName: "Siddharth Verma", RoleID: "Project Manager", Mobile: "9866778899" },
        { UserID: "USR-107", FullName: "Pooja Sharma", RoleID: "Site Engineer", Mobile: "9877889900" },
        { UserID: "USR-108", FullName: "Vikram Saxena", RoleID: "Site Engineer", Mobile: "9888990011" }
      ];

      function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
      function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
      function pad2(n) { return String(n).length < 2 ? "0" + n : String(n); }
      function randDate(y1, y2) { return rand(y1, y2) + "-" + pad2(rand(1, 12)) + "-" + pad2(rand(1, 28)); }
      function genPAN() {
        var p = "";
        var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (var i = 0; i < 5; i++) p += pick(letters);
        for (var i = 0; i < 4; i++) p += rand(0, 9);
        p += pick(letters);
        return p;
      }

      // 1. Customers (125)
      var customers = [];
      for (var i = 1; i <= 125; i++) {
        var cId = "CUST-" + (1000 + i);
        var cityIdx = (i - 1) % CITIES.length;
        var city = CITIES[cityIdx];
        var state = STATES[cityIdx];
        var pan = genPAN();
        var gst = pad2((cityIdx % 35) + 1) + pan + "1Z" + pick("123456789ABCDEF");
        var fn = pick(FIRST_NAMES);
        var ln = pick(LAST_NAMES);
        var contact = fn + " " + ln;
        var isCorp = (i % 3 !== 0);
        var cName = isCorp ? (pick(CORP_PREFIXES) + " " + pick(CORP_SUFFIXES)) : (contact + " Residence");
        var mobile = "98" + rand(10000000, 99999999);
        customers.push({
          CustomerID: cId, CustomerName: cName, CompanyName: cName, ContactPerson: contact,
          Designation: isCorp ? pick(["Director", "VP Infrastructure", "Procurement Head"]) : "Owner",
          Mobile: mobile, NormalizedMobile: mobile, AlternateMobile: "97" + rand(10000000, 99999999),
          Email: isCorp ? ("contact@" + cName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15) + ".in") : (fn.toLowerCase() + "." + ln.toLowerCase() + "@gmail.com"),
          Address: rand(1, 400) + ", Sector " + rand(1, 95) + ", " + city,
          City: city, State: state, Pincode: String(rand(110001, 800000)),
          PANCardNumber: pan, GSTNumber: gst,
          CustomerType: isCorp ? "Enterprise / Commercial" : "HNI Residential",
          Industry: isCorp ? pick(["Commercial Real Estate", "Corporate Office", "Hospitality", "Retail"]) : "Residential Luxury",
          Notes: "Active account managed by StudioSpace.", Status: i > 120 ? "Inactive" : "Active",
          CreatedDate: randDate(2025, 2026), CreatedBy: "Admin", ModifiedDate: randDate(2026, 2026), ModifiedBy: "Admin", Attachments: ""
        });
      }

      // 2. Vendors (55)
      var VENDOR_CATS = ["Modular Woodwork & Veneers", "Italian Marble & Granite", "Sanitaryware & Bath Fittings", "Lighting & Automation", "HVAC & Ducting", "Civil, Masonry & POP", "Glazing & Aluminum Facades", "Upholstery, Curtains & Rugs", "Hardware & Architectural Fittings"];
      var vendors = [];
      for (var i = 1; i <= 55; i++) {
        var vId = "VNDR-" + (1000 + i);
        var cat = VENDOR_CATS[(i - 1) % VENDOR_CATS.length];
        var vName = pick(LAST_NAMES) + " " + cat.split(" ")[0] + " & Co.";
        var pan = genPAN();
        vendors.push({
          VendorID: vId, VendorName: vName, ContactPerson: pick(FIRST_NAMES) + " " + pick(LAST_NAMES),
          Mobile: "99" + rand(10000000, 99999999), Email: "sales@" + vName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 12) + ".in",
          Address: "Plot " + rand(1, 150) + ", Industrial Area, " + pick(CITIES), GSTNumber: pad2((i % 35) + 1) + pan + "1Z" + pick("123456789ABCDEF"),
          VendorType: cat, Status: "Active", Notes: "Approved vendor on 30-day payment terms.",
          CreatedDate: randDate(2025, 2026), CreatedBy: "Admin", ModifiedDate: "", ModifiedBy: "", Attachments: ""
        });
      }

      // 3. Associates (35)
      var ASSOC_SPECS = ["Photorealistic 3D Rendering & Elevation", "MEP & Electrical Consultant", "Structural Engineer", "Acoustics & Home Cinema Specialist", "Landscape & Terrace Garden Architect", "Automation & IoT System Integrator"];
      var associates = [];
      for (var i = 1; i <= 35; i++) {
        var aId = "ASSOC-" + (100 + i);
        var spec = ASSOC_SPECS[(i - 1) % ASSOC_SPECS.length];
        var aName = "Studio " + pick(LAST_NAMES) + " Design Partners";
        associates.push({
          AssociateID: aId, AssociateName: aName, ContactPerson: pick(FIRST_NAMES) + " " + pick(LAST_NAMES),
          Mobile: "98" + rand(10000000, 99999999), Email: "contact@" + aName.toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 15) + ".in",
          Address: rand(1, 50) + ", Commercial Hub, " + pick(CITIES), GSTNumber: pad2((i % 35) + 1) + genPAN() + "1Z" + pick("123456789ABCDEF"),
          Status: "Active", Notes: "Specialized in " + spec + ". Rate basis: Lumpsum milestone contract.",
          CreatedDate: randDate(2025, 2026), CreatedBy: "Admin", ModifiedDate: "", ModifiedBy: ""
        });
      }

      // 4. Projects (225) & Milestones (~670)
      var projects = [];
      var milestones = [];
      var msCounter = 1000;
      var MS_TITLES = [
        "Site Survey, Demolition & Architectural Floor Plans",
        "MEP Piping, Electrical Conduiting & HVAC First Fix",
        "Flooring, False Ceiling Grid & POP Skimming",
        "Modular Millwork, Veneers & Kitchen Installation",
        "Surface Painting, Lighting Fixtures & Final Handover"
      ];
      for (var i = 1; i <= 225; i++) {
        var pId = "PROJ-" + (1000 + i);
        var cust = customers[(i - 1) % customers.length];
        var pType = pick(PROJECT_TYPES);
        var status = pick(PROJECT_STATUSES);
        var budget = rand(18, 250) * 100000;
        var sDate = randDate(2025, 2026);
        var eDate = randDate(2026, 2027);
        var mgr = pick(STAFF.filter(function(s) { return s.RoleID.indexOf("Manager") !== -1 || s.RoleID.indexOf("Admin") !== -1; }));
        var pName = cust.CustomerName.split(" ")[0] + " - " + pType.split(" ")[0] + " Phase " + (((i - 1) % 3) + 1);

        projects.push({
          ProjectID: pId, ProjectName: pName, CustomerID: cust.CustomerID,
          InquiryID: "LEAD-" + (1000 + ((i % 150) + 1)), ProjectType: pType,
          Location: cust.City + ", " + cust.State, StartDate: sDate, ExpectedCompletionDate: eDate,
          ActualCompletionDate: status === "Completed" ? eDate : "", ProjectValue: budget,
          Status: status, Notes: "Turnkey architectural execution. Lead PM: " + mgr.FullName,
          CreatedDate: sDate, CreatedBy: "Admin", ModifiedDate: randDate(2026, 2026), ModifiedBy: "Admin", Attachments: "",
          WhatsAppGroupLink: "https://chat.whatsapp.com/sample-" + pId.toLowerCase()
        });

        var numMs = rand(2, 4);
        for (var m = 0; m < numMs; m++) {
          msCounter++;
          var msId = "MS-" + msCounter;
          var msStatus = (status === "Completed") ? "Completed" : (m === 0 ? "Completed" : (m === 1 ? "In Progress" : "Pending"));
          var msWeight = Math.round(100 / numMs);
          var msBudget = Math.round((budget * msWeight) / 100);
          var msActual = (msStatus === "Completed") ? Math.round(msBudget * 0.98) : 0;
          var assoc = pick(associates);
          milestones.push({
            MilestoneID: msId, ProjectID: pId, MilestoneName: MS_TITLES[m % MS_TITLES.length],
            DueDate: randDate(2026, 2026), CompletionDate: msStatus === "Completed" ? randDate(2026, 2026) : "",
            Status: msStatus, Remarks: "Weightage: " + msWeight + "%. Budget: ₹" + msBudget + ". Actual: ₹" + msActual,
            CreatedDate: sDate, CreatedBy: "Admin", ModifiedDate: "", ModifiedBy: "",
            AssociateName: assoc.AssociateName, AssociateCost: Math.round(msBudget * 0.15), AssociateType: "Lumpsum"
          });
        }
      }

      // 5. Tasks (1,250)
      var tasks = [];
      var TASK_TPLS = [
        "Inspect marble slab vein continuity on floor", "Review detailed reflected ceiling plan (RCP)",
        "Coordinate plumbing pressure test with MEP team", "Verify veneer grain matching for master wardrobe",
        "Site laser levelling for false ceiling channel", "Approve electrical switchboard cutout schedule",
        "Finalize kitchen island stone bullnosing details", "Test smart automation lighting dimmer circuits",
        "Conduct acoustic baffle installation audit", "Audit HVAC plenum clearance above false ceiling",
        "Verify door frame plumb lines and shutter clearances", "Prepare client walkthrough defect snag list",
        "Inspect waterproofing flood test in terrace/bathrooms", "Review shop drawings submitted by millwork vendor",
        "Verify paint finish swatch shade under warm lighting"
      ];
      for (var i = 1; i <= 1250; i++) {
        var tId = "TASK-" + (1000 + i);
        var proj = projects[(i - 1) % projects.length];
        var staff = pick(STAFF);
        var status = pick(TASK_STATUSES);
        var prio = pick(TASK_PRIORITIES);
        var sDate = randDate(2026, 2026);
        var dDate = randDate(2026, 2026);
        var tpl = TASK_TPLS[(i - 1) % TASK_TPLS.length];

        tasks.push({
          TaskID: tId, ProjectID: proj.ProjectID, TaskName: tpl + " (#" + i + ")",
          Description: "Ensure strict architectural standards. Project: " + proj.ProjectName,
          AssignedType: "Staff", AssignedTo: staff.FullName, StartDate: sDate, DueDate: dDate,
          Priority: prio, Status: status, CompletionDate: status === "Completed" ? dDate : "",
          Remarks: status === "Completed" ? "Completed and verified on site." : "Work scheduled.",
          CreatedDate: sDate, CreatedBy: "Admin", ModifiedDate: randDate(2026, 2026), ModifiedBy: "Admin"
        });
      }

      // 6. Site Visits (1,050)
      var siteVisits = [];
      var VISIT_PURPOSES = [
        "Routine Quality Audit & Snag Inspection", "Initial Laser Measurement & Layout Verification",
        "Pre-Cast Slab & MEP Conduiting Inspection", "Client Walkthrough & Finishes Sign-off",
        "Joinery & Millwork Dry-Fit Inspection", "False Ceiling Plenum & Lighting Audit",
        "Material Delivery Physical Verification"
      ];
      for (var i = 1; i <= 1050; i++) {
        var vId = "VISIT-" + (1000 + i);
        var isProj = (i % 6 !== 0);
        var proj = isProj ? projects[(i - 1) % projects.length] : null;
        var lId = isProj ? "" : ("LEAD-" + (1000 + ((i % 150) + 1)));
        var staff = pick(STAFF);
        var status = pick(VISIT_STATUSES);
        var vDate = randDate(2026, 2026);
        var fDate = randDate(2026, 2026);
        var isBillable = (i % 4 === 0) ? "Yes" : "No";
        var billAmt = (isBillable === "Yes") ? pick([1500, 2000, 2500, 3500, 5000]) : 0;

        siteVisits.push({
          VisitID: vId, ProjectID: proj ? proj.ProjectID : "", VisitDate: vDate,
          Purpose: pick(VISIT_PURPOSES), Remarks: "Site log recorded by " + staff.FullName + ". Quality standards maintained.",
          NextFollowupDate: status === "Scheduled" ? fDate : (rand(0, 1) ? fDate : ""),
          Photos: (i % 3 === 0) ? ("https://drive.google.com/sample_visit_" + vId.toLowerCase() + ".jpg") : "",
          CreatedDate: vDate, CreatedBy: staff.FullName, ModifiedDate: "", ModifiedBy: "",
          AssignedTo: staff.FullName, Status: status, AssignedType: "Staff", IsBillable: isBillable, BillingAmount: billAmt, LeadID: lId
        });
      }

      // 7. Leads (160) & Followups (320)
      var leads = [];
      var leadFollowups = [];
      var flpCounter = 100;
      for (var i = 1; i <= 160; i++) {
        var lId = "LEAD-" + (1000 + i);
        var fn = pick(FIRST_NAMES);
        var ln = pick(LAST_NAMES);
        var contact = fn + " " + ln;
        var pType = pick(PROJECT_TYPES);
        var status = pick(LEAD_STATUSES);
        var lDate = randDate(2025, 2026);
        var staff = pick(STAFF);

        leads.push({
          LeadID: lId, Date: lDate, CustomerName: contact + " - " + pType.split(" ")[0] + " Scope",
          ProjectType: pType, Mobile: "98" + rand(10000000, 99999999), Email: fn.toLowerCase() + "." + ln.toLowerCase() + "@outlook.com",
          ProjectDetails: "Turnkey interior requirement for " + rand(2500, 10000) + " sqft space in " + pick(CITIES),
          Attachments: "", LeadType: (i % 3 === 0) ? "Commercial" : "Luxury Residential", Status: status,
          Source: pick(LEAD_SOURCES), AssignedTo: staff.FullName, Remarks: "Active client consultation pipeline.",
          FollowUpDate: (status !== "Won" && status !== "Lost") ? randDate(2026, 2026) : "",
          LossReason: status === "Lost" ? "Client opted for modular vendor due to budget." : "",
          CreatedDate: lDate, CreatedBy: staff.FullName, ModifiedDate: "", ModifiedBy: ""
        });

        for (var f = 0; f < 2; f++) {
          flpCounter++;
          leadFollowups.push({
            FollowupID: "FLP-" + flpCounter, LeadID: lId, FollowupDate: randDate(2026, 2026), NextFollowupDate: randDate(2026, 2026),
            DiscussionNotes: "Discussion regarding space planning, moodboards and material specifications.",
            CreatedDate: lDate, CreatedBy: staff.FullName
          });
        }
      }

      // 8. Proposals (180)
      var proposals = [];
      for (var i = 1; i <= 180; i++) {
        var prId = "PROP-" + (1000 + i);
        var isCust = (i % 5 !== 0);
        var cust = isCust ? customers[(i - 1) % customers.length] : null;
        var lead = !isCust ? leads[(i - 1) % leads.length] : null;
        var pDate = randDate(2025, 2026);
        var status = pick(PROPOSAL_STATUSES);
        var amt = rand(20, 280) * 100000;

        proposals.push({
          ProposalID: prId, CustomerID: cust ? cust.CustomerID : "",
          ProjectName: cust ? (cust.CustomerName + " Interior Fitout Scope") : (lead.CustomerName + " Scope Document"),
          ProposalDate: pDate, Amount: amt, ScopeOfWork: "Turnkey architectural execution: Civil demolition, masonry, electrical/HVAC conduits, false ceiling, premium woodwork, painting, and handover.",
          ValidityDate: randDate(2026, 2026), Status: status, FollowUpDate: (status === "Sent" || status === "Revised") ? randDate(2026, 2026) : "",
          Remarks: "Commercial proposal with 18% GST terms. 50% advance, 40% milestone billing, 10% retention.",
          CreatedDate: pDate, CreatedBy: "Admin", ModifiedDate: "", ModifiedBy: "", Attachments: "", LeadID: lead ? lead.LeadID : ""
        });
      }

      // 9. Transactions (650)
      var transactions = [];
      var EXPENSE_CATS = ["Material - Marble & Stone", "Material - Woodwork & Veneers", "MEP & Electrical Materials", "Subcontractor / Associate Payout", "Site Labor & Carpentry Wages", "Office Rent & Facility", "Staff Salaries", "Travel, Site Logistics & Fuel"];
      var MODES = ["Bank Transfer (NEFT/RTGS)", "UPI / QR", "Cheque", "Credit Card"];
      var BANKS = ["HDFC Bank - Current A/c *9821", "ICICI Bank - Current A/c *4410", "Kotak Mahindra Bank - Current A/c *1109"];

      for (var i = 1; i <= 650; i++) {
        var txId = "TXN-" + (1000 + i);
        var isInc = (i % 3 === 0);
        var type = isInc ? "Income" : "Expense";
        var proj = projects[(i - 1) % projects.length];
        var vendor = !isInc ? vendors[(i - 1) % vendors.length] : null;
        var assoc = (!isInc && i % 4 === 0) ? associates[(i - 1) % associates.length] : null;
        var cat = isInc ? "Client Milestone Payment" : pick(EXPENSE_CATS);
        var baseAmt = isInc ? rand(50000, 1500000) : rand(8000, 450000);
        var gstRate = 18;
        var gstAmt = Math.round((baseAmt * gstRate) / 100);
        var total = baseAmt + gstAmt;
        var tDate = randDate(2025, 2026);
        var mode = pick(MODES);

        transactions.push({
          TransactionID: txId, ProjectID: proj.ProjectID, VendorID: vendor ? vendor.VendorID : "",
          TransactionDate: tDate, Type: type, Category: cat, Amount: total, TaxableAmount: baseAmt,
          GSTType: "CGST + SGST (18%)", GSTRate: gstRate, CGST: Math.round(gstAmt / 2), SGST: Math.round(gstAmt / 2), IGST: 0, TotalGST: gstAmt,
          PaymentMode: mode, BankAccount: pick(BANKS), ReferenceNumber: mode.substring(0, 4).toUpperCase() + "-" + rand(100000, 999999),
          Remarks: isInc ? ("Receipt from " + proj.ProjectID) : ("Payment for " + cat),
          CreatedDate: tDate, CreatedBy: "Admin", ModifiedDate: "", ModifiedBy: "", AssociateName: assoc ? assoc.AssociateName : "", Attachments: ""
        });
      }

      // 10. Users (8)
      var users = STAFF.map(function(s) {
        return {
          UserID: s.UserID, FullName: s.FullName, Email: s.FullName.toLowerCase().replace(" ", ".") + "@nexsolve.in",
          Mobile: s.Mobile, RoleID: s.RoleID, Status: "Active", MustChangePassword: "No",
          CreatedDate: "2025-01-01", CreatedBy: "SYSTEM", ReportsTo: s.RoleID === "Super Admin" ? "" : "USR-101"
        };
      });

      var dropdowns = {
        ProjectType: PROJECT_TYPES,
        ProjectStatus: ["Planning & Design", "In Progress", "Under Review", "Completed", "On Hold", "Cancelled"],
        TaskPriority: ["Critical", "High", "Medium", "Low"],
        TaskStatus: ["Pending", "In Progress", "Under Review", "Completed", "Cancelled"],
        LeadSource: LEAD_SOURCES,
        LeadStatus: LEAD_STATUSES,
        ExpenseCategory: EXPENSE_CATS,
        PaymentMode: MODES,
        CustomerType: ["Enterprise / Commercial", "HNI Residential", "Boutique Retail", "Government / Institutional"]
      };

      var companySetup = {
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

      return {
        customers: customers,
        vendors: vendors,
        associates: associates,
        projects: projects,
        milestones: milestones,
        tasks: tasks,
        siteVisits: siteVisits,
        leads: leads,
        leadFollowups: leadFollowups,
        proposals: proposals,
        transactions: transactions,
        users: users,
        dropdowns: dropdowns,
        companySetup: companySetup
      };
    }
`;

content = content.substring(0, sIdx) + newGeneratorCode + '\n' + content.substring(eIdx);
fs.writeFileSync(tplPath, content, 'utf8');
console.log("✓ Successfully replaced generateEnterpriseDemoData in Index_Template.html");
