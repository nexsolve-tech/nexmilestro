/**
 * Customer.gs
 * Server-side controller for managing Customers.
 */

/**
 * Fetch all customers
 */
function getCustomers() {
  try {
    return readTable("Customers");
  } catch (e) {
    throw new Error("Failed to fetch customers: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a customer record.
 */
function saveCustomer(customerData, fileData, userId) {
  try {
    const customerId = customerData.CustomerID || "";
    checkUserPermission(userId, "Customers", customerId ? "edit" : "add");

    // 1. Validation Specs matching the user's requirements
    if (!customerData.CustomerName || !customerData.CustomerName.trim()) {
      return { success: false, message: "Customer Name is mandatory." };
    }
    if (!customerData.CustomerType) {
      return { success: false, message: "Customer Type is mandatory." };
    }
    if (!customerData.Mobile || customerData.Mobile.replace(/\D/g, "").length !== 10) {
      return { success: false, message: "Contact Number is mandatory and must be exactly 10 digits." };
    }
    if (customerData.AlternateMobile && customerData.AlternateMobile.replace(/\D/g, "").length !== 10) {
      return { success: false, message: "Alternate Contact Number must be exactly 10 digits if provided." };
    }
    if (!customerData.Email || !customerData.Email.trim()) {
      return { success: false, message: "Email Address is mandatory." };
    }
    if (!customerData.Address || !customerData.Address.trim()) {
      return { success: false, message: "Address is mandatory." };
    }
    if (!customerData.City || !customerData.City.trim()) {
      return { success: false, message: "City selection is mandatory." };
    }
    if (!customerData.State || !customerData.State.trim()) {
      return { success: false, message: "State selection is mandatory." };
    }
    if (!customerData.CreatedBy || !customerData.CreatedBy.trim()) {
      return { success: false, message: "Created By selection is mandatory." };
    }
    
    // Validate optional PAN format if provided
    if (customerData.PANCardNumber && customerData.PANCardNumber.trim() !== "") {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(customerData.PANCardNumber.toUpperCase())) {
        return { success: false, message: "Invalid PAN Card Number format (e.g. ABCDE1234F)." };
      }
      customerData.PANCardNumber = customerData.PANCardNumber.toUpperCase();
    }
    
    // Normalize Mobile
    customerData.NormalizedMobile = customerData.Mobile.replace(/\D/g, "");
    if (customerData.AlternateMobile) {
      customerData.AlternateMobile = customerData.AlternateMobile.replace(/\D/g, "");
    }
    
    // Write to table
    const savedId = writeTableRow("Customers", "CustomerID", customerId, customerData, userId);
    
    // Ensure Customer Folder hierarchy exists in Google Drive and save files to Customer Documents subfolder
    const customerFolder = getCustomerFolder(customerData.CustomerName, savedId, "Customer Documents");
    
    // Process attachments upload
    if (fileData) {
      const newUrls = saveUploadedFilesToFolder(fileData, customerFolder);
      if (newUrls) {
        let existing = customerData.Attachments ? String(customerData.Attachments).trim() : "";
        let finalAttachments = existing ? existing + ", " + newUrls : newUrls;
        writeTableRow("Customers", "CustomerID", savedId, { Attachments: finalAttachments }, userId);
      }
    }
    
    return {
      success: true,
      customerId: savedId,
      message: customerId ? "Customer updated successfully." : "Customer created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a customer by ID
 */
function deleteCustomer(customerId, userId) {
  try {
    checkUserPermission(userId, "Customers", "delete");
    const success = deleteTableRow("Customers", "CustomerID", customerId);
    if (success) {
      return { success: true, message: "Customer deleted successfully." };
    } else {
      return { success: false, message: "Customer not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
