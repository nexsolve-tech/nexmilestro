/**
 * Proposal.gs
 * Server-side controller for managing Proposals.
 */

/**
 * Fetch all proposals
 */
function getProposals() {
  try {
    return readTable("Proposals");
  } catch (e) {
    throw new Error("Failed to fetch proposals: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a proposal record with optional attachment files.
 */
function saveProposal(proposalData, fileData, userId) {
  try {
    if (typeof fileData === 'string' && !userId) {
      userId = fileData;
      fileData = null;
    }

    const proposalId = proposalData.ProposalID || "";
    checkUserPermission(userId, "Proposals", proposalId ? "edit" : "add");
    if (!proposalData.CustomerID && !proposalData.LeadID) {
      return { success: false, message: "Please select either an Existing Client or a Lead for this proposal." };
    }
    if (!proposalData.ProjectName || !proposalData.ProjectName.trim()) {
      return { success: false, message: "Project Name/Description is required." };
    }
    
    if (proposalData.Amount) {
      proposalData.Amount = parseFloat(proposalData.Amount) || 0;
    } else {
      proposalData.Amount = 0;
    }
    
    ["ProposalDate", "ValidityDate", "FollowUpDate"].forEach(dateField => {
      if (proposalData[dateField] && typeof proposalData[dateField] === "string" && proposalData[dateField].trim() !== "") {
        proposalData[dateField] = new Date(proposalData[dateField]);
      } else if (!proposalData[dateField]) {
        proposalData[dateField] = "";
      }
    });

    const savedId = writeTableRow("Proposals", "ProposalID", proposalId, proposalData, userId);
    
    // Process attachment uploads
    if (fileData) {
      const proposalFolder = getFolderOrCreate("StudioSpace_Proposals");
      const newUrls = saveUploadedFilesToFolder(fileData, proposalFolder);
      if (newUrls) {
        let existing = proposalData.Attachments ? String(proposalData.Attachments).trim() : "";
        let finalAttachments = existing ? existing + ", " + newUrls : newUrls;
        writeTableRow("Proposals", "ProposalID", savedId, { Attachments: finalAttachments }, userId);
      }
    }

    return {
      success: true,
      proposalId: savedId,
      message: proposalId ? "Proposal updated successfully." : "Proposal created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a proposal by ID
 */
function deleteProposal(proposalId, userId) {
  try {
    checkUserPermission(userId, "Proposals", "delete");
    const success = deleteTableRow("Proposals", "ProposalID", proposalId);
    if (success) {
      return { success: true, message: "Proposal deleted successfully." };
    } else {
      return { success: false, message: "Proposal not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
