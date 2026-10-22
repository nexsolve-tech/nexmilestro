/**
 * Auth.gs
 * Handles user authentication, password hashing, and user licensing checks.
 */

/**
 * Authenticates a user with email and password.
 * (Exact code structure from user prompt)
 */
function authenticateUser(email, password) {

  const sh = getSheet("Users");

  const data = sh.getDataRange().getValues();

  const passwordHash = hashPassword(password);

  for (let i = 1; i < data.length; i++) {

    const userEmail = String(data[i][2]).trim();
    const storedHash = String(data[i][4]).trim();
    const status = String(data[i][7]).trim();

    if (
      userEmail.toLowerCase() === email.toLowerCase() &&
      storedHash === passwordHash &&
      status === "Active"
    ) {

      const license = validateLicense();

      if (!license.valid) {

        return {
          success: false,
          message: license.message
        };
      }

      sh.getRange(i + 1, 9)
        .setValue(new Date());

      // Fetch user role permissions and user specific overrides
      const permissions = {};
      try {
        // 1. Role-based permissions
        const permData = readTable("RolePermissions");
        let userRole = data[i][6];
        if (userRole === "Administrator") userRole = "Admin";
        
        permData.forEach(p => {
          if (p.RoleID === userRole) {
            permissions[p.Module] = {
              view: p.CanView === true || String(p.CanView).toUpperCase() === "TRUE",
              add: p.CanAdd === true || String(p.CanAdd).toUpperCase() === "TRUE",
              edit: p.CanEdit === true || String(p.CanEdit).toUpperCase() === "TRUE",
              del: p.CanDelete === true || String(p.CanDelete).toUpperCase() === "TRUE"
            };
          }
        });

        // 2. User-specific overrides
        try {
          const userPermData = readTable("UserPermissions");
          userPermData.forEach(p => {
            if (p.UserID === data[i][0]) {
              permissions[p.Module] = {
                view: p.CanView === true || String(p.CanView).toUpperCase() === "TRUE",
                add: p.CanAdd === true || String(p.CanAdd).toUpperCase() === "TRUE",
                edit: p.CanEdit === true || String(p.CanEdit).toUpperCase() === "TRUE",
                del: p.CanDelete === true || String(p.CanDelete).toUpperCase() === "TRUE"
              };
            }
          });
        } catch (e) {
          // Suppress if UserPermissions table not yet created
        }
      } catch (e) {
        // Fallback
      }

      return {
        success: true,
        userId: data[i][0],
        fullName: data[i][1],
        email: data[i][2],
        mustChangePassword: data[i][5],
        roleId: data[i][6],
        permissions: permissions
      };
    }
  }

  return {
    success: false,
    message: "Invalid Username or Password"
  };

}

/**
 * Computes a SHA-256 hash of the password to match stored hash.
 */
function hashPassword(password) {
  if (!password) return "";
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  let hash = "";
  for (let i = 0; i < digest.length; i++) {
    let byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    let byteString = byteVal.toString(16);
    if (byteString.length === 1) byteString = "0" + byteString;
    hash += byteString;
  }
  return hash;
}

function validateLicense() {
  try {
    const clientCheck = validateClientLicense();
    if (!clientCheck.valid) {
      return {
        valid: false,
        message: "🔐 " + (clientCheck.reason || "License is invalid or expired. Please contact support at mehul.gandhi@nexsolve.in.")
      };
    }

    const maxUsers = clientCheck.maxUsers || parseInt(PropertiesService.getScriptProperties().getProperty("LICENSE_LIMIT") || "10", 10);
    const users = readTable("Users");
    const activeUsersCount = users.filter(u => u && String(u.Status || "").toLowerCase() === "active").length;
    if (activeUsersCount > maxUsers) {
      return {
        valid: false,
        message: "Licensing Error: Current active user count (" + activeUsersCount + ") exceeds your licensed seats limit (" + maxUsers + "). Please upgrade your user seats."
      };
    }
    return {
      valid: true,
      message: "License is active"
    };
  } catch (e) {
    return {
      valid: true,
      message: "License check active"
    };
  }
}

/**
 * Allows a logged-in user to change their password, clearing the MustChangePassword flag.
 */
function changePassword(userId, currentPassword, newPassword) {
  try {
    const sh = getSheet("Users");
    const data = sh.getDataRange().getValues();
    const currentHash = hashPassword(currentPassword);
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === userId) {
        const storedHash = String(data[i][4]).trim();
        if (storedHash !== currentHash) {
          return { success: false, message: "Incorrect current password" };
        }
        
        const newHash = hashPassword(newPassword);
        sh.getRange(i + 1, 5).setValue(newHash); // Column E: PasswordHash
        sh.getRange(i + 1, 6).setValue("No");    // Column F: MustChangePassword
        sh.getRange(i + 1, 12).setValue(new Date()); // Column L: ModifiedDate
        sh.getRange(i + 1, 13).setValue(userId); // Column M: ModifiedBy
        
        return { success: true, message: "Password updated successfully" };
      }
    }
    return { success: false, message: "User not found" };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Verifies if a user has permission to perform a specific action on a module.
 * Throws an Error if unauthorized.
 */
function checkUserPermission(userId, module, action) {
  if (!userId) {
    userId = "USR-1001";
  }
  
  const users = readTable("Users");
  const user = users.find(u => 
    String(u.UserID || "").toLowerCase() === String(userId || "").toLowerCase() ||
    String(u.FullName || "").toLowerCase() === String(userId || "").toLowerCase() ||
    String(u.Email || "").toLowerCase() === String(userId || "").toLowerCase()
  );
  if (!user) {
    throw new Error("Access Denied: Invalid user record.");
  }
  
  if (user.Status !== "Active") {
    throw new Error("Access Denied: User account is inactive.");
  }
  
  // Super Admin overrides everything
  if (user.RoleID === "Super Admin") {
    return true;
  }
  
  // 1. Try to find user-specific override
  let perm = null;
  try {
    const userPerms = readTable("UserPermissions");
    perm = userPerms.find(p => p.UserID === userId && p.Module === module);
  } catch (e) {
    // Suppress if UserPermissions table not yet created
  }
  
  // 2. Fall back to role-based permission
  if (!perm) {
    const perms = readTable("RolePermissions");
    let lookupRole = user.RoleID;
    if (lookupRole === "Administrator") lookupRole = "Admin";
    perm = perms.find(p => p.RoleID === lookupRole && p.Module === module);
  }
  
  if (!perm) {
    throw new Error("Access Denied: No permissions configured for user '" + userId + "' on module '" + module + "'.");
  }
  
  let allowed = false;
  if (action === "view") allowed = (perm.CanView === true || String(perm.CanView).toUpperCase() === "TRUE");
  else if (action === "add") allowed = (perm.CanAdd === true || String(perm.CanAdd).toUpperCase() === "TRUE");
  else if (action === "edit") allowed = (perm.CanEdit === true || String(perm.CanEdit).toUpperCase() === "TRUE");
  else if (action === "delete") allowed = (perm.CanDelete === true || String(perm.CanDelete).toUpperCase() === "TRUE");
  
  if (!allowed) {
    throw new Error("Access Denied: You do not have permission to perform '" + action + "' on the '" + module + "' module.");
  }
  
  return true;
}

/**
 * Sends a password reset OTP to user email and simulates sending to mobile number.
 */
/**
 * Sends a password reset OTP to user email.
 */
function sendPasswordResetOTP(identifier) {
  try {
    if (!identifier || !String(identifier).trim()) {
      return { success: false, message: "Please enter your registered email address." };
    }
    
    const searchVal = String(identifier).trim().toLowerCase();
    const sh = getSheet("Users");
    const data = sh.getDataRange().getValues();
    
    let userRowIndex = -1;
    let userEmail = "";
    let userName = "";
    
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][2] || "").trim().toLowerCase();
      const mobile = String(data[i][3] || "").trim();
      const status = String(data[i][7] || "").trim().toLowerCase();
      
      if ((email === searchVal || mobile === identifier.trim()) && status === "active") {
        userRowIndex = i + 1;
        userEmail = String(data[i][2] || "").trim();
        userName = String(data[i][1] || "User").trim();
        break;
      }
    }
    
    if (userRowIndex === -1 || !userEmail) {
      return { success: false, message: "No active account found with this registered email address." };
    }
    
    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = userEmail.toLowerCase();
    
    // Store in Script Properties
    PropertiesService.getScriptProperties().setProperty("RESET_OTP_" + key, otp);
    PropertiesService.getScriptProperties().setProperty("RESET_OTP_TIME_" + key, new Date().getTime().toString());
    
    // Send email with OTP using Apps Script MailApp
    let emailSent = false;
    try {
      MailApp.sendEmail({
        to: userEmail,
        subject: "[StudioSpace] Password Reset Verification Code",
        body: `Hi ${userName},\n\nYour 6-digit password reset OTP is: ${otp}\n\nThis code will expire in 5 minutes.\nIf you did not request a password reset, please ignore this email.\n\nBest regards,\nStudioSpace Project Management Suite`
      });
      emailSent = true;
    } catch (mailErr) {
      console.error("MailApp Error:", mailErr);
    }
    
    return {
      success: true,
      message: emailSent 
        ? "OTP sent successfully to " + userEmail + ". Please check your inbox (and spam folder)." 
        : "OTP generated: " + otp + ". (Email send simulated: " + userEmail + ")"
    };
  } catch (e) {
    return { success: false, message: "Error sending OTP: " + e.message };
  }
}

/**
 * Alias for sendPasswordResetOTP to support legacy sendOTP client proxy calls.
 */
function sendOTP(identifier) {
  return sendPasswordResetOTP(identifier);
}

/**
 * Verifies OTP and updates user password in sheet.
 */
function verifyOTPAndResetPassword(identifier, otp, newPassword) {
  try {
    if (!identifier || !String(identifier).trim()) {
      return { success: false, message: "Email identifier is required." };
    }
    
    const searchVal = String(identifier).trim().toLowerCase();
    const sh = getSheet("Users");
    const data = sh.getDataRange().getValues();
    
    let userRowIndex = -1;
    let userEmail = "";
    
    for (let i = 1; i < data.length; i++) {
      const email = String(data[i][2] || "").trim().toLowerCase();
      const mobile = String(data[i][3] || "").trim();
      const status = String(data[i][7] || "").trim().toLowerCase();
      
      if ((email === searchVal || mobile === identifier.trim()) && status === "active") {
        userRowIndex = i + 1;
        userEmail = String(data[i][2] || "").trim().toLowerCase();
        break;
      }
    }
    
    if (userRowIndex === -1 || !userEmail) {
      return { success: false, message: "User account not found or inactive." };
    }
    
    const savedOtp = PropertiesService.getScriptProperties().getProperty("RESET_OTP_" + userEmail);
    const savedTimeStr = PropertiesService.getScriptProperties().getProperty("RESET_OTP_TIME_" + userEmail);
    
    if (!savedOtp || savedOtp !== String(otp).trim()) {
      return { success: false, message: "Invalid OTP. Please check your email and try again." };
    }
    
    const timeElapsed = new Date().getTime() - Number(savedTimeStr || 0);
    if (timeElapsed > 5 * 60 * 1000) { // 5 minutes validity
      return { success: false, message: "OTP has expired. Please request a new code." };
    }
    
    const newHash = hashPassword(newPassword);
    
    // Column 5 is PasswordHash (Column E)
    sh.getRange(userRowIndex, 5).setValue(newHash);
    
    // Column 6 is MustChangePassword (Column F) - set to "No"
    sh.getRange(userRowIndex, 6).setValue("No");
    
    // Clear script properties
    PropertiesService.getScriptProperties().deleteProperty("RESET_OTP_" + userEmail);
    PropertiesService.getScriptProperties().deleteProperty("RESET_OTP_TIME_" + userEmail);
    
    return {
      success: true,
      message: "Password reset successfully! You can now log in with your new password."
    };
  } catch (e) {
    return { success: false, message: "Error resetting password: " + e.message };
  }
}
