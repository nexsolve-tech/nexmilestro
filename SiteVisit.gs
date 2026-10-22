/**
 * SiteVisit.gs
 * Server-side controller for managing Site Visits.
 */

/**
 * Fetch all site visits
 */
function getSiteVisits() {
  try {
    return readTable("SiteVisits");
  } catch (e) {
    throw new Error("Failed to fetch site visits: " + e.message);
  }
}

function saveSiteVisit(visitData, fileData, userId) {
  try {
    const visitId = visitData.VisitID || "";
    checkUserPermission(userId, "SiteVisits", visitId ? "edit" : "add");
    if (!visitData.ProjectID && !visitData.LeadID) {
      return { success: false, message: "Please select either a Project or a Lead for this site visit." };
    }
    if (!visitData.VisitDate) {
      return { success: false, message: "Visit Date is required." };
    }
    if (!visitData.Purpose || !visitData.Purpose.trim()) {
      return { success: false, message: "Purpose of Visit is required." };
    }
    
    // Default values
    if (!visitData.AssignedTo) {
      visitData.AssignedTo = userId;
    }
    if (!visitData.Status) {
      visitData.Status = "Completed";
    }
    
    // Verify assignment rules based on "Reports To" hierarchy
    if ((!visitData.AssignedType || visitData.AssignedType === "Staff") && visitData.AssignedTo && visitData.AssignedTo !== userId) {
      const users = readTable("Users");
      const currentUser = users.find(u => String(u.UserID || "").toLowerCase() === String(userId || "").toLowerCase() || String(u.FullName || "").toLowerCase() === String(userId || "").toLowerCase());
      const assignee = users.find(u => String(u.UserID || "").toLowerCase() === String(visitData.AssignedTo || "").toLowerCase() || String(u.FullName || "").toLowerCase() === String(visitData.AssignedTo || "").toLowerCase());
      
      if (assignee && currentUser) {
        const role = currentUser.RoleID || currentUser.roleId || "";
        const isAuthorized = 
          role === "Super Admin" || 
          role === "Admin" || 
          assignee.ReportsTo === currentUser.UserID ||
          assignee.ReportsTo === userId;
          
        if (!isAuthorized) {
          return { success: false, message: "Authorization Error: You can only assign visits to yourself or users who report directly to you." };
        }
      }
    }
    
    // Parse Dates
    ["VisitDate", "NextFollowupDate"].forEach(dateField => {
      if (visitData[dateField] && typeof visitData[dateField] === "string" && visitData[dateField].trim() !== "") {
        visitData[dateField] = new Date(visitData[dateField]);
      } else if (!visitData[dateField]) {
        visitData[dateField] = "";
      }
    });

    let oldVisit = null;
    if (visitId) {
      try {
        const visits = readTable("SiteVisits");
        oldVisit = visits.find(v => v.VisitID === visitId);
      } catch(e) {}
    }

    // Handle file upload if provided
    if (fileData) {
      const fileList = Array.isArray(fileData) ? fileData : [fileData];
      
      let targetFolder = null;
      if (visitData.ProjectID) {
        try {
          const projects = readTable("Projects");
          const proj = projects.find(p => p.ProjectID === visitData.ProjectID);
          if (proj) {
            targetFolder = getProjectFolder(proj.ProjectName, proj.ProjectID);
          }
        } catch (err) {
          console.error("Failed to load project folder for site visit:", err);
        }
      }
      if (!targetFolder) {
        targetFolder = getFolderOrCreate("StudioSpace_SiteVisits");
      }
      
      let uploadedUrls = [];
      fileList.forEach(f => {
        if (f.base64 && f.filename) {
          const decodedBytes = Utilities.base64Decode(f.base64);
          const blob = Utilities.newBlob(decodedBytes, f.mimeType, f.filename);
          const file = targetFolder.createFile(blob);
          file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          uploadedUrls.push(file.getUrl());
        }
      });
      
      if (uploadedUrls.length > 0) {
        let existingPhotos = visitData.Photos ? String(visitData.Photos).trim() : "";
        let newPhotos = uploadedUrls.join(", ");
        if (existingPhotos) {
          visitData.Photos = existingPhotos + ", " + newPhotos;
        } else {
          visitData.Photos = newPhotos;
        }
      }
    }

    const savedId = writeTableRow("SiteVisits", "VisitID", visitId, visitData, userId);
    
    // Check if we should notify
    if (!visitId) {
      if (visitData.AssignedTo) {
        sendSystemNotification("visit_assigned", visitData);
      }
    } else if (oldVisit && visitData.AssignedTo !== oldVisit.AssignedTo) {
      if (visitData.AssignedTo) {
        sendSystemNotification("visit_assigned", visitData);
      }
    }
    
    if (visitData.Status === "Completed") {
      if (!oldVisit || oldVisit.Status !== "Completed") {
        if (!visitData.CreatedBy && oldVisit) {
          visitData.CreatedBy = oldVisit.CreatedBy;
        } else if (!visitData.CreatedBy) {
          visitData.CreatedBy = userId;
        }
        sendSystemNotification("visit_completed", visitData);
      }
    }
    
    return {
      success: true,
      visitId: savedId,
      message: visitId ? "Site visit updated successfully." : "Site visit logged successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}


/**
 * Deletes a site visit by ID
 */
function deleteSiteVisit(visitId, userId) {
  try {
    checkUserPermission(userId, "SiteVisits", "delete");
    const success = deleteTableRow("SiteVisits", "VisitID", visitId);
    if (success) {
      return { success: true, message: "Site visit deleted successfully." };
    } else {
      return { success: false, message: "Site visit not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
