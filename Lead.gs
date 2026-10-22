/**
 * Lead.gs
 * Server-side controller for managing Leads and Lead Follow-ups.
 */

/**
 * Fetch all leads
 */
function getLeads() {
  try {
    return readTable("Leads");
  } catch (e) {
    throw new Error("Failed to fetch leads: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a lead record.
 */
function saveLead(leadData, userId) {
  try {
    checkUserPermission(userId, "Leads", leadData.LeadID ? "edit" : "add");
    // 1. Mandatory Validations based on Lead specs
    if (!leadData.CustomerName || !leadData.CustomerName.trim()) {
      return { success: false, message: "Customer Name is mandatory." };
    }
    if (!leadData.Date) {
      return { success: false, message: "Inquiry Date is mandatory." };
    }
    if (!leadData.ProjectType) {
      return { success: false, message: "Project Type is mandatory." };
    }
    if (!leadData.Mobile || leadData.Mobile.replace(/\D/g, "").length !== 10) {
      return { success: false, message: "Customer Contact Number is mandatory and must be exactly 10 digits." };
    }
    if (!leadData.ProjectDetails || !leadData.ProjectDetails.trim()) {
      return { success: false, message: "Project Details are mandatory." };
    }
    if (!leadData.LeadType) {
      return { success: false, message: "Lead Type is mandatory." };
    }
    if (!leadData.Status) {
      return { success: false, message: "Lead Status is mandatory." };
    }
    if (!leadData.Source) {
      return { success: false, message: "Lead Source is mandatory." };
    }
    if (!leadData.AssignedTo) {
      return { success: false, message: "Lead By (Employee name) selection is mandatory." };
    }
    
    // Normalize mobile
    leadData.Mobile = leadData.Mobile.replace(/\D/g, "");
    
    // Parse Dates
    ["Date", "FollowUpDate"].forEach(dateField => {
      if (leadData[dateField] && typeof leadData[dateField] === "string" && leadData[dateField].trim() !== "") {
        leadData[dateField] = new Date(leadData[dateField]);
      } else if (!leadData[dateField]) {
        leadData[dateField] = "";
      }
    });

    const leadId = leadData.LeadID || "";
    let oldLead = null;
    if (leadId) {
      try {
        const leads = readTable("Leads");
        oldLead = leads.find(l => l.LeadID === leadId);
      } catch(e) {}
    }

    const savedId = writeTableRow("Leads", "LeadID", leadId, leadData, userId);
    
    // Check if we should notify the assignee
    if (!leadId) {
      if (leadData.AssignedTo) {
        sendSystemNotification("lead_assigned", leadData);
      }
    } else if (oldLead && leadData.AssignedTo !== oldLead.AssignedTo) {
      if (leadData.AssignedTo) {
        sendSystemNotification("lead_assigned", leadData);
      }
    }
    
    return {
      success: true,
      leadId: savedId,
      message: leadId ? "Lead updated successfully." : "Lead created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a lead by ID
 */
function deleteLead(leadId, userId) {
  try {
    checkUserPermission(userId, "Leads", "delete");
    const success = deleteTableRow("Leads", "LeadID", leadId);
    if (success) {
      // Also delete associated followups
      const flpSheet = getSheet("LeadFollowups");
      const lastRow = flpSheet.getLastRow();
      if (lastRow > 1) {
        const data = flpSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // LeadID is column 2
        for (let i = data.length - 1; i >= 0; i--) {
          if (String(data[i][0]) === leadId) {
            flpSheet.deleteRow(i + 2);
          }
        }
      }
      return { success: true, message: "Lead deleted successfully." };
    } else {
      return { success: false, message: "Lead not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Fetch all follow-up logs for a specific Lead ID
 */
function getLeadFollowups(leadId) {
  try {
    const allLogs = readTable("LeadFollowups");
    return allLogs.filter(log => log.LeadID === leadId);
  } catch (e) {
    throw new Error("Failed to fetch lead follow-ups: " + e.message);
  }
}

/**
 * Saves a new follow-up log and updates the parent Lead's FollowUpDate
 */
function saveLeadFollowup(followupData, userId) {
  try {
    checkUserPermission(userId, "Leads", "edit");
    if (!followupData.LeadID) {
      return { success: false, message: "Lead ID is required." };
    }
    if (!followupData.FollowupDate) {
      return { success: false, message: "Follow-up Date is required." };
    }
    if (!followupData.NextFollowupDate) {
      return { success: false, message: "Next Follow-up Date is required." };
    }
    
    // Parse Dates
    ["FollowupDate", "NextFollowupDate"].forEach(field => {
      if (followupData[field]) {
        followupData[field] = new Date(followupData[field]);
      }
    });
    
    // Save followup record
    const followupId = writeTableRow("LeadFollowups", "FollowupID", "", followupData, userId);
    
    // Sync the NextFollowupDate back to the parent Lead
    const leads = readTable("Leads");
    const leadRecord = leads.find(l => l.LeadID === followupData.LeadID);
    if (leadRecord) {
      leadRecord.FollowUpDate = followupData.NextFollowupDate;
      // Convert Date formats back for save
      if (leadRecord.Date) leadRecord.Date = new Date(leadRecord.Date);
      if (leadRecord.FollowUpDate) leadRecord.FollowUpDate = new Date(leadRecord.FollowUpDate);
      
      writeTableRow("Leads", "LeadID", leadRecord.LeadID, leadRecord, userId);
    }
    
    return {
      success: true,
      followupId: followupId,
      message: "Lead follow-up recorded successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Sends a follow-up email and automatically logs it as a follow-up in the DB
 */
function sendLeadEmail(emailData, userId) {
  try {
    checkUserPermission(userId, "Leads", "edit");
    if (!emailData.to || !emailData.subject || !emailData.body) {
      return { success: false, message: "Email recipient, subject, and body are required." };
    }
    
    // Send email using Google Apps Script MailApp
    MailApp.sendEmail({
      to: emailData.to,
      subject: emailData.subject,
      htmlBody: emailData.body.replace(/\n/g, "<br>")
    });
    
    // Record followup detail
    const followupRecord = {
      LeadID: emailData.LeadID,
      FollowupDate: new Date(),
      NextFollowupDate: emailData.NextFollowupDate ? new Date(emailData.NextFollowupDate) : new Date(Date.now() + 3*24*60*60*1000), // Default 3 days follow-up
      DiscussionNotes: `[Email Sent] Subject: ${emailData.subject}\n\nMessage:\n${emailData.body}`
    };
    
    saveLeadFollowup(followupRecord, userId);
    
    return { success: true, message: "Email sent and follow-up logged successfully." };
  } catch (e) {
    return { success: false, message: "Failed to send email: " + e.message };
  }
}

/**
 * Converts a won lead to a Customer record (if not already existing) and returns CustomerID
 */
function convertLeadToCustomer(leadId, userId) {
  try {
    checkUserPermission(userId, "Leads", "edit");
    checkUserPermission(userId, "Customers", "add");
    const leads = readTable("Leads");
    const lead = leads.find(l => l.LeadID === leadId);
    if (!lead) {
      return { success: false, message: "Lead not found." };
    }
    
    // Check if customer already exists (match by normalized mobile or email)
    const customers = readTable("Customers");
    const leadMobile = String(lead.Mobile || "").replace(/\D/g, "");
    
    let existingCust = customers.find(c => {
      const cMobile = String(c.Mobile || "").replace(/\D/g, "");
      return (cMobile && cMobile === leadMobile) || (lead.Email && c.Email && String(c.Email).toLowerCase() === String(lead.Email).toLowerCase());
    });
    
    if (existingCust) {
      return {
        success: true,
        customerId: existingCust.CustomerID,
        isNew: false,
        message: "Prospect already linked to existing customer '" + existingCust.CustomerName + "' (" + existingCust.CustomerID + ")."
      };
    }
    
    // Create new customer record with clean valid defaults
    const customerData = {
      CustomerName: lead.CustomerName || "New Client",
      Mobile: lead.Mobile || "0000000000",
      NormalizedMobile: leadMobile,
      AlternateMobile: "",
      Email: (lead.Email && String(lead.Email).trim()) ? String(lead.Email).trim() : (leadMobile ? leadMobile + "@client.com" : "client@example.com"),
      Address: lead.ProjectDetails || "Address Pending",
      City: "Ahmedabad",
      State: "Gujarat",
      Pincode: "",
      PANCardNumber: "",
      GSTNumber: "",
      CustomerType: "Residential",
      Notes: `Converted from Lead ID ${lead.LeadID} (${lead.ProjectType || 'Inquiry'}). Details: ${lead.ProjectDetails || 'N/A'}`,
      Status: "Active",
      CreatedBy: userId || lead.AssignedTo || "SYSTEM"
    };
    
    const nextCustId = writeTableRow("Customers", "CustomerID", "", customerData, userId);

    // Update Lead status to "Won"
    try {
      writeTableRow("Leads", "LeadID", lead.LeadID, { Status: "Won" }, userId);
    } catch(e) {}
    
    return {
      success: true,
      customerId: nextCustId,
      isNew: true,
      message: "Customer '" + lead.CustomerName + "' added successfully as Customer ID " + nextCustId + "!"
    };
  } catch (e) {
    return { success: false, message: "Conversion failed: " + e.message };
  }
}

/**
 * Marks a lead status as Won upon successful customer creation
 */
function markLeadAsWon(leadId, userId) {
  try {
    if (leadId) {
      writeTableRow("Leads", "LeadID", leadId, { Status: "Won" }, userId);
    }
    return { success: true, message: "Lead status updated to Won." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
