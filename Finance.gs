/**
 * Finance.gs
 * Server-side controller for managing Transactions, Income, Expenses, and Financial Analytics.
 */

/**
 * Fetch all transactions
 */
function getTransactions() {
  try {
    return readTable("Transactions");
  } catch (e) {
    throw new Error("Failed to fetch transactions: " + e.message);
  }
}

/**
 * Fetches all transactions, projects, vendors, and calculates financial summary KPIs.
 */
function getFinanceData() {
  try {
    const rawTransactions = readTable("Transactions");
    const projects = readTable("Projects");
    const vendors = readTable("Vendors");

    // Maps for fast ID-to-Name resolution
    const projectMap = {};
    projects.forEach(p => {
      if (p && p.ProjectID) {
        projectMap[p.ProjectID] = p.ProjectName || p.ProjectID;
      }
    });

    const vendorMap = {};
    vendors.forEach(v => {
      if (v && v.VendorID) {
        vendorMap[v.VendorID] = v.VendorName || v.VendorID;
      }
    });

    let totalIncome = 0;
    let totalExpenses = 0;

    const transactions = rawTransactions.map(txn => {
      const amt = parseFloat(txn.Amount) || 0;
      const type = (txn.Type || "").trim();

      if (type.toLowerCase() === "income") {
        totalIncome += amt;
      } else if (type.toLowerCase() === "expense") {
        totalExpenses += amt;
      }

      return {
        ...txn,
        ProjectName: projectMap[txn.ProjectID] || txn.ProjectID || "N/A",
        VendorName: vendorMap[txn.VendorID] || txn.VendorID || ""
      };
    });

    // Sort transactions by TransactionDate descending
    transactions.sort((a, b) => new Date(b.TransactionDate || 0) - new Date(a.TransactionDate || 0));

    return {
      success: true,
      transactions: transactions,
      projects: projects.map(p => ({ ProjectID: p.ProjectID, ProjectName: p.ProjectName })),
      vendors: vendors.map(v => ({ VendorID: v.VendorID, VendorName: v.VendorName })),
      kpi: {
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        netBalance: totalIncome - totalExpenses
      }
    };
  } catch (e) {
    return {
      success: false,
      message: "Failed to load finance data: " + e.message,
      transactions: [],
      projects: [],
      vendors: [],
      kpi: { totalIncome: 0, totalExpenses: 0, netBalance: 0 }
    };
  }
}

/**
 * Aggregated server-side fetcher for Finance module (transactions, projects, vendors, associates, siteVisits, dropdowns)
 */
function getFinanceAggregatedData() {
  try {
    let rawTransactions = [];
    try { rawTransactions = readTable("Transactions"); } catch(e) {}

    let projects = [];
    try { projects = readTable("Projects"); } catch(e) {}

    let vendors = [];
    try { vendors = readTable("Vendors"); } catch(e) {}

    let associates = [];
    try {
      associates = readTable("Associates");
    } catch(e) {}

    let siteVisits = [];
    try {
      siteVisits = readTable("SiteVisits");
    } catch(e) {}

    let customers = [];
    try { customers = readTable("Customers"); } catch(e) {}

    let dropdowns = {};
    try {
      dropdowns = getDropdownValues();
    } catch(e) {}

    // Fallbacks if Masters keys are empty
    if (!dropdowns["TransactionType"] || dropdowns["TransactionType"].length === 0) {
      dropdowns["TransactionType"] = ["Income", "Expense"];
    }
    if (!dropdowns["IncomeCategory"] || dropdowns["IncomeCategory"].length === 0) {
      dropdowns["IncomeCategory"] = [
        "Client Payment",
        "Advance Payment",
        "Site Visit Charges",
        "Design Fee",
        "Consultancy Fee",
        "Refund / Cash-in",
        "Other Income"
      ];
    }
    if (!dropdowns["ExpenseCategory"] || dropdowns["ExpenseCategory"].length === 0) {
      dropdowns["ExpenseCategory"] = [
        "Material Purchase",
        "Labor Wages",
        "Subcontractor / Labor",
        "Tools & Equipment",
        "Office Rent",
        "Travel & Fuel",
        "Site Expense",
        "Transport & Logistics",
        "Design & Consultation",
        "Other Expense"
      ];
    }
    if (!dropdowns["TransactionCategory"] || dropdowns["TransactionCategory"].length === 0) {
      dropdowns["TransactionCategory"] = dropdowns["IncomeCategory"].concat(dropdowns["ExpenseCategory"]);
    }
    if (!dropdowns["PaymentMode"] || dropdowns["PaymentMode"].length === 0) {
      dropdowns["PaymentMode"] = ["Bank Transfer", "UPI", "Cheque", "Cash", "Credit Card"];
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
  } catch (e) {
    return {
      success: false,
      message: "Failed to load finance aggregated data: " + e.message,
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
 * Saves (inserts or updates) a financial transaction record with optional file attachments.
 */
function saveTransaction(txnData, fileData, userId) {
  try {
    // Handle parameter signature variations: saveTransaction(txnData, userId) vs saveTransaction(txnData, fileData, userId)
    if (typeof fileData === 'string' && !userId) {
      userId = fileData;
      fileData = null;
    }

    const txnId = txnData.TransactionID || "";
    checkUserPermission(userId, "Finance", txnId ? "edit" : "add");

    if (!txnData.Type) {
      return { success: false, message: "Transaction Type (Income/Expense) is required." };
    }
    if (txnData.Amount === undefined || txnData.Amount === null || isNaN(parseFloat(txnData.Amount)) || parseFloat(txnData.Amount) <= 0) {
      return { success: false, message: "Please enter a valid Amount greater than 0." };
    }
    if (!txnData.TransactionDate) {
      return { success: false, message: "Transaction Date is required." };
    }

    // Format fields & GST breakdown
    txnData.TaxableAmount = txnData.TaxableAmount !== undefined && txnData.TaxableAmount !== "" ? parseFloat(txnData.TaxableAmount) : parseFloat(txnData.Amount);
    txnData.GSTType = txnData.GSTType || "None";
    txnData.GSTRate = parseFloat(txnData.GSTRate) || 0;
    txnData.CGST = parseFloat(txnData.CGST) || 0;
    txnData.SGST = parseFloat(txnData.SGST) || 0;
    txnData.IGST = parseFloat(txnData.IGST) || 0;
    txnData.TotalGST = txnData.TotalGST !== undefined && txnData.TotalGST !== "" ? parseFloat(txnData.TotalGST) : (txnData.CGST + txnData.SGST + txnData.IGST);
    txnData.Amount = parseFloat(txnData.Amount) || (txnData.TaxableAmount + txnData.TotalGST);
    txnData.TransactionDate = new Date(txnData.TransactionDate);

    // Save or update transaction row in sheet
    const savedId = writeTableRow("Transactions", "TransactionID", txnId, txnData, userId);

    // Process file attachments if provided
    if (fileData && fileData.length > 0) {
      const financeFolder = getFolderOrCreate("StudioSpace_Finance");
      
      // Adapt fileData objects for saveUploadedFilesToFolder (supports base64 and filename keys)
      const adaptedFiles = fileData.map(f => ({
        base64: f.base64Data || f.base64,
        mimeType: f.mimeType,
        filename: f.fileName || f.filename
      }));

      const newUrls = saveUploadedFilesToFolder(adaptedFiles, financeFolder);
      if (newUrls) {
        let existing = txnData.Attachments ? String(txnData.Attachments).trim() : "";
        let finalAttachments = existing ? (existing + ", " + newUrls) : newUrls;
        writeTableRow("Transactions", "TransactionID", savedId, { Attachments: finalAttachments }, userId);
      }
    }

    return {
      success: true,
      transactionId: savedId,
      message: txnId ? "Transaction updated successfully." : "Transaction booked successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a transaction by ID.
 */
function deleteTransaction(txnId, userId) {
  try {
    checkUserPermission(userId, "Finance", "delete");
    const success = deleteTableRow("Transactions", "TransactionID", txnId);
    if (success) {
      return { success: true, message: "Transaction deleted successfully." };
    } else {
      return { success: false, message: "Transaction record not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
