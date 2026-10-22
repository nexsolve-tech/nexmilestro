/**
 * Associate.gs
 * Server-side controller for managing Associates.
 */

/**
 * Fetch all associates
 */
function getAssociates() {
  try {
    return readTable("Associates");
  } catch (e) {
    throw new Error("Failed to fetch associates: " + e.message);
  }
}

/**
 * Saves (inserts or updates) an associate record.
 */
function saveAssociate(assocData, userId) {
  try {
    const assocId = assocData.AssociateID || "";
    checkUserPermission(userId, "Associates", assocId ? "edit" : "add");
    if (!assocData.AssociateName || !assocData.AssociateName.trim()) {
      return { success: false, message: "Associate Name is required." };
    }
    
    const savedId = writeTableRow("Associates", "AssociateID", assocId, assocData, userId);
    
    return {
      success: true,
      associateId: savedId,
      message: assocId ? "Associate profile updated successfully." : "Associate profile created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes an associate by ID
 */
function deleteAssociate(assocId, userId) {
  try {
    checkUserPermission(userId, "Associates", "delete");
    const success = deleteTableRow("Associates", "AssociateID", assocId);
    if (success) {
      return { success: true, message: "Associate deleted successfully." };
    } else {
      return { success: false, message: "Associate not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
