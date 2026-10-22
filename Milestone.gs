/**
 * Milestone.gs
 * Server-side controller for managing Project Milestones.
 */

/**
 * Fetch all milestones.
 */
function getMilestones() {
  try {
    return readTable("Milestones");
  } catch (e) {
    throw new Error("Failed to fetch milestones: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a milestone record.
 */
function saveMilestone(msData, userId) {
  try {
    const msId = msData.MilestoneID || "";
    const action = msId ? "edit" : "add";
    checkUserPermission(userId, "Projects", action);

    if (!msData.ProjectID) {
      return { success: false, message: "Project selection is required." };
    }
    if (!msData.MilestoneName || !msData.MilestoneName.trim()) {
      return { success: false, message: "Milestone Name is required." };
    }
    if (!msData.Status) {
      msData.Status = "Pending";
    }

    ["DueDate", "CompletionDate"].forEach(dateField => {
      if (msData[dateField] && typeof msData[dateField] === "string" && msData[dateField].trim() !== "") {
        msData[dateField] = new Date(msData[dateField]);
      } else if (!msData[dateField]) {
        msData[dateField] = "";
      }
    });

    if (msData.Status === "Completed" && !msData.CompletionDate) {
      msData.CompletionDate = new Date();
    } else if (msData.Status !== "Completed") {
      msData.CompletionDate = "";
    }

    const savedId = writeTableRow("Milestones", "MilestoneID", msId, msData, userId);
    
    return {
      success: true,
      milestoneId: savedId,
      message: msId ? "Milestone updated successfully." : "Milestone created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a milestone by ID.
 */
function deleteMilestone(milestoneId, userId) {
  try {
    checkUserPermission(userId, "Projects", "delete");
    const success = deleteTableRow("Milestones", "MilestoneID", milestoneId);
    if (success) {
      return { success: true, message: "Milestone deleted successfully." };
    } else {
      return { success: false, message: "Milestone not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
