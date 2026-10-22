/**
 * User.gs
 * Server-side controller for managing Users.
 */

/**
 * Fetch all users
 */
function getUsers() {
  try {
    const users = readTable("Users");
    // Remove password hash before sending to client for security
    return users.map(user => {
      delete user.PasswordHash;
      return user;
    });
  } catch (e) {
    throw new Error("Failed to fetch users: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a user record.
 */
function saveUser(userData, userId) {
  try {
    const targetUserId = userData.UserID || "";
    const action = targetUserId ? "edit" : "add";
    checkUserPermission(userId, "Users", action);
    if (!userData.FullName || !userData.FullName.trim()) {
      return { success: false, message: "Full Name is required." };
    }
    if (!userData.Email || !userData.Email.trim()) {
      return { success: false, message: "Email is required." };
    }
    
    // Check if Email already exists for a different user
    const users = readTable("Users");
    const emailExists = users.some(u => 
      u.Email.toLowerCase() === userData.Email.toLowerCase() && u.UserID !== targetUserId
    );
    if (emailExists) {
      return { success: false, message: "A user with this Email already exists." };
    }

    // Check Active License/User limit if setting status to Active
    if (userData.Status === "Active") {
      const existingUser = users.find(u => u.UserID === targetUserId);
      const isActivating = !existingUser || existingUser.Status !== "Active";
      if (isActivating) {
        const settings = getLicenseSettings();
        if (settings.currentUsers >= settings.maxUsers) {
          return { success: false, message: "Active user limit (" + settings.maxUsers + ") reached! Please contact the Super Admin to upgrade your user license limit." };
        }
      }
    }

    // Hash password if provided
    if (userData.Password && userData.Password.trim()) {
      userData.PasswordHash = hashPassword(userData.Password.trim());
    }
    delete userData.Password; // Don't save plain password
    
    // If it's a new user and password is not provided
    if (!targetUserId && !userData.PasswordHash) {
      return { success: false, message: "Password is required for new users." };
    }

    const savedId = writeTableRow("Users", "UserID", targetUserId, userData, userId);
    
    return {
      success: true,
      userId: savedId,
      message: targetUserId ? "User updated successfully." : "User created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a user by ID
 */
function deleteUser(targetUserId, currentUserId) {
  try {
    checkUserPermission(currentUserId, "Users", "delete");
    const success = deleteTableRow("Users", "UserID", targetUserId);
    if (success) {
      return { success: true, message: "User deleted successfully." };
    } else {
      return { success: false, message: "User not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Gets license settings and current active user count from Central License Client.
 */
function getLicenseSettings(overrideKey) {
  const props = PropertiesService.getScriptProperties();
  const key = (overrideKey || props.getProperty("LICENSE_KEY") || "").trim();
  
  let licenseInfo = { valid: true, maxUsers: 10, plan: "Standard" };
  try {
    if (typeof validateClientLicense === "function") {
      licenseInfo = validateClientLicense(key);
    }
  } catch (e) {}

  const maxUsers = (licenseInfo && licenseInfo.maxUsers) ? parseInt(licenseInfo.maxUsers, 10) : 10;
  
  let activeUsersCount = 0;
  try {
    const users = readTable("Users");
    activeUsersCount = users.filter(u => String(u.Status || "").trim().toLowerCase() === "active").length;
  } catch (e) {
    activeUsersCount = 0;
  }
  
  return {
    valid: licenseInfo ? licenseInfo.valid : true,
    maxUsers: maxUsers,
    currentUsers: activeUsersCount,
    licenseKey: key || "LIC-BUYER1-2026",
    plan: (licenseInfo && licenseInfo.plan) || "Standard"
  };
}

/**
 * Saves licensing settings from the Super Admin.
 */
function saveLicenseSettings(maxUsers, licenseKey, userId) {
  try {
    const users = readTable("Users");
    const user = users.find(u => u.UserID === userId);
    if (!user || user.RoleID !== "Super Admin") {
      return { success: false, message: "Access Denied: Only a Super Admin can configure licensing settings." };
    }
    
    PropertiesService.getScriptProperties().setProperty("LICENSE_LIMIT", String(maxUsers));
    PropertiesService.getScriptProperties().setProperty("LICENSE_KEY", licenseKey);
    
    return { success: true, message: "Licensing parameters saved successfully." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Fetches all permissions for a given RoleID.
 */
function getRolePermissions(roleId) {
  try {
    const perms = readTable("RolePermissions");
    return perms.filter(p => p.RoleID === roleId);
  } catch (e) {
    throw new Error("Failed to fetch role permissions: " + e.message);
  }
}

/**
 * Saves modified permissions for a given RoleID.
 */
function saveRolePermissions(roleId, permissionsList, currentUserId) {
  try {
    checkUserPermission(currentUserId, "Users", "edit");
    
    if (roleId === "Super Admin") {
      return { success: false, message: "Security Warning: Super Admin permissions cannot be modified." };
    }
    
    const sheet = getSheet("RolePermissions");
    const headers = SHEET_HEADERS["RolePermissions"];
    const lastRow = sheet.getLastRow();
    
    if (lastRow > 1) {
      const dataRange = sheet.getRange(2, 1, lastRow - 1, headers.length);
      const values = dataRange.getValues();
      
      permissionsList.forEach(update => {
        for (let i = 0; i < values.length; i++) {
          const rowRoleId = values[i][1];
          const rowMod = values[i][2];
          if (rowRoleId === roleId && rowMod === update.Module) {
            sheet.getRange(i + 2, 4).setValue(update.CanView === true || update.CanView === "true");
            sheet.getRange(i + 2, 5).setValue(update.CanAdd === true || update.CanAdd === "true");
            sheet.getRange(i + 2, 6).setValue(update.CanEdit === true || update.CanEdit === "true");
            sheet.getRange(i + 2, 7).setValue(update.CanDelete === true || update.CanDelete === "true");
          }
        }
      });
    }
    
    return { success: true, message: "Permissions for role '" + roleId + "' saved successfully." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Fetches all user permissions overrides for a given UserID.
 */
function getUserPermissions(targetUserId) {
  try {
    const perms = readTable("UserPermissions");
    return perms.filter(p => p.UserID === targetUserId);
  } catch (e) {
    return [];
  }
}

/**
 * Saves modified permission overrides for a given UserID.
 * If isOverridden is false, deletes any overrides.
 */
function saveUserPermissions(targetUserId, permissionsList, isOverridden, currentUserId) {
  try {
    checkUserPermission(currentUserId, "Users", "edit");
    
    const users = readTable("Users");
    const targetUser = users.find(u => u.UserID === targetUserId);
    if (!targetUser) {
      return { success: false, message: "User not found." };
    }
    if (targetUser.RoleID === "Super Admin") {
      return { success: false, message: "Security Warning: Super Admin permissions cannot be modified." };
    }
    
    const sheet = getSheet("UserPermissions");
    const headers = SHEET_HEADERS["UserPermissions"];
    const lastRow = sheet.getLastRow();
    
    // Delete existing rows for this targetUserId
    if (lastRow > 1) {
      for (let i = lastRow; i >= 2; i--) {
        const rowUserId = sheet.getRange(i, 2).getValue();
        if (rowUserId === targetUserId) {
          sheet.deleteRow(i);
        }
      }
    }
    
    // If overriding is active, write new rows
    if (isOverridden && permissionsList && permissionsList.length > 0) {
      permissionsList.forEach(update => {
        const nextId = generateNextId("UserPermissions");
        const newRow = [
          nextId,
          targetUserId,
          update.Module,
          update.CanView === true || update.CanView === "true",
          update.CanAdd === true || update.CanAdd === "true",
          update.CanEdit === true || update.CanEdit === "true",
          update.CanDelete === true || update.CanDelete === "true"
        ];
        sheet.appendRow(newRow);
      });
    }
    
    return { success: true, message: "User permission overrides updated successfully." };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Gets a list of active assignees that the current user can assign tasks/visits to.
 */
function getAssigneeOptions(currentUserId) {
  try {
    const users = readTable("Users");
    const isActive = (u) => String(u.Status || "").trim().toLowerCase() === "active";
    const activeUsers = users.filter(isActive);

    if (!currentUserId) {
      return activeUsers.map(u => ({
        UserID: u.UserID,
        FullName: u.FullName,
        RoleID: u.RoleID
      }));
    }

    const currentUser = users.find(u => u.UserID === currentUserId);
    if (!currentUser || currentUser.RoleID === "Super Admin" || currentUser.RoleID === "Admin") {
      return activeUsers.map(u => ({
        UserID: u.UserID,
        FullName: u.FullName,
        RoleID: u.RoleID
      }));
    }
    
    const assignees = activeUsers.filter(u => u.UserID === currentUserId || u.ReportsTo === currentUserId);
    return assignees.map(u => ({
      UserID: u.UserID,
      FullName: u.FullName,
      RoleID: u.RoleID
    }));
  } catch (e) {
    throw new Error("Failed to load assignee options: " + e.message);
  }
}

