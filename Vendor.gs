/**
 * Vendor.gs
 * Server-side controller for managing Vendors.
 */

/**
 * Fetch all vendors
 */
function getVendors() {
  try {
    return readTable("Vendors");
  } catch (e) {
    throw new Error("Failed to fetch vendors: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a vendor record.
 */
function saveVendor(vendorData, fileData, userId) {
  try {
    const vendorId = vendorData.VendorID || "";
    checkUserPermission(userId, "Vendors", vendorId ? "edit" : "add");
    if (!vendorData.VendorName || !vendorData.VendorName.trim()) {
      return { success: false, message: "Vendor Name is required." };
    }
    if (!vendorData.VendorType) {
      return { success: false, message: "Vendor Type selection is required." };
    }

    if (vendorData.PANNumber && vendorData.PANNumber.trim() !== "") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(vendorData.PANNumber.toUpperCase())) {
        return { success: false, message: "Invalid PAN Card Number format (e.g. ABCDE1234F)." };
      }
      vendorData.PANNumber = vendorData.PANNumber.toUpperCase();
    }
    
    const savedId = writeTableRow("Vendors", "VendorID", vendorId, vendorData, userId);
    
    // Ensure Vendor Folder exists in Google Drive
    const vendorFolder = getVendorFolder(vendorData.VendorName, savedId);
    
    // Process attachments upload
    if (fileData) {
      const newUrls = saveUploadedFilesToFolder(fileData, vendorFolder);
      if (newUrls) {
        let existing = vendorData.Attachments ? String(vendorData.Attachments).trim() : "";
        let finalAttachments = existing ? existing + ", " + newUrls : newUrls;
        writeTableRow("Vendors", "VendorID", savedId, { Attachments: finalAttachments }, userId);
      }
    }
    
    return {
      success: true,
      vendorId: savedId,
      message: vendorId ? "Vendor profile updated successfully." : "Vendor profile created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a vendor by ID
 */
function deleteVendor(vendorId, userId) {
  try {
    checkUserPermission(userId, "Vendors", "delete");
    const success = deleteTableRow("Vendors", "VendorID", vendorId);
    if (success) {
      return { success: true, message: "Vendor deleted successfully." };
    } else {
      return { success: false, message: "Vendor not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
