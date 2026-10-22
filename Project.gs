/**
 * Project.gs
 * Server-side controller for managing Projects.
 */

/**
 * Fetch all projects
 */
function getProjects() {
  try {
    return readTable("Projects");
  } catch (e) {
    throw new Error("Failed to fetch projects: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a project record.
 */
function saveProject(projectData, fileData, userId) {
  try {
    const projectId = projectData.ProjectID || "";
    checkUserPermission(userId, "Projects", projectId ? "edit" : "add");
    if (!projectData.ProjectName || !projectData.ProjectName.trim()) {
      return { success: false, message: "Project Name is required." };
    }
    if (!projectData.CustomerID) {
      return { success: false, message: "Customer selection is required." };
    }
    
    // Parse numeric value if present
    if (projectData.ProjectValue) {
      projectData.ProjectValue = parseFloat(projectData.ProjectValue) || 0;
    } else {
      projectData.ProjectValue = 0;
    }
    
    // Format Date values if sent as strings (e.g. from input type="date")
    ["StartDate", "ExpectedCompletionDate", "ActualCompletionDate"].forEach(dateField => {
      if (projectData[dateField] && typeof projectData[dateField] === "string" && projectData[dateField].trim() !== "") {
        projectData[dateField] = new Date(projectData[dateField]);
      } else if (!projectData[dateField]) {
        projectData[dateField] = ""; // Clear if empty
      }
    });

    const savedId = writeTableRow("Projects", "ProjectID", projectId, projectData, userId);
    
    // Ensure Project Folder exists in Google Drive under Customer's Project Documents subfolder
    let custName = "";
    if (projectData.CustomerID) {
      try {
        const custs = readTable("Customers");
        const cust = custs.find(c => c.CustomerID === projectData.CustomerID);
        if (cust) custName = cust.CustomerName;
      } catch (e) {}
    }
    const projectFolder = getProjectFolder(projectData.ProjectName, savedId, projectData.CustomerID, custName);
    
    // Process attachments upload
    if (fileData) {
      const newUrls = saveUploadedFilesToFolder(fileData, projectFolder);
      if (newUrls) {
        let existing = projectData.Attachments ? String(projectData.Attachments).trim() : "";
        let finalAttachments = existing ? existing + ", " + newUrls : newUrls;
        writeTableRow("Projects", "ProjectID", savedId, { Attachments: finalAttachments }, userId);
      }
    }
    
    return {
      success: true,
      projectId: savedId,
      message: projectId ? "Project updated successfully." : "Project created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a project by ID
 */
function deleteProject(projectId, userId) {
  try {
    checkUserPermission(userId, "Projects", "delete");
    const success = deleteTableRow("Projects", "ProjectID", projectId);
    if (success) {
      return { success: true, message: "Project deleted successfully." };
    } else {
      return { success: false, message: "Project not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
/**
 * Single aggregated backend endpoint for Projects view.
 * Combines Projects, Customers, Milestones, Associates, Vendors, Users, and Dropdowns in ONE single network call.
 */
function getProjectsAggregatedData() {
  try {
    const projects = readTable("Projects");
    const customers = readTable("Customers");
    const milestones = readTable("Milestones");
    const associates = readTable("Associates");
    const vendors = readTable("Vendors");
    const users = readTable("Users");
    const dropdowns = getDropdownValues();

    return {
      success: true,
      projects: projects || [],
      customers: customers || [],
      milestones: milestones || [],
      associates: associates || [],
      vendors: vendors || [],
      users: users || [],
      dropdowns: dropdowns || {}
    };
  } catch(e) {
    return {
      success: false,
      message: e.message,
      projects: [], customers: [], milestones: [], associates: [], vendors: [], users: [], dropdowns: {}
    };
  }
}
