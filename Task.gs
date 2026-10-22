/**
 * Task.gs
 * Server-side controller for managing Tasks.
 */

/**
 * Fetch all tasks
 */
function getTasks() {
  try {
    return readTable("Tasks");
  } catch (e) {
    throw new Error("Failed to fetch tasks: " + e.message);
  }
}

/**
 * Saves (inserts or updates) a task record.
 */
function saveTask(taskData, userId) {
  try {
    const taskId = taskData.TaskID || "";
    checkUserPermission(userId, "Tasks", taskId ? "edit" : "add");
    if (!taskData.TaskName || !taskData.TaskName.trim()) {
      return { success: false, message: "Task Name is required." };
    }
    
    // Verify assignment rules based on "Reports To" hierarchy
    if (taskData.AssignedTo && (!taskData.AssignedType || taskData.AssignedType === "Staff") && taskData.AssignedTo !== userId) {
      const users = readTable("Users");
      const currentUser = users.find(u => String(u.UserID || "").toLowerCase() === String(userId || "").toLowerCase() || String(u.FullName || "").toLowerCase() === String(userId || "").toLowerCase());
      const assignee = users.find(u => String(u.FullName || "").toLowerCase() === String(taskData.AssignedTo || "").toLowerCase() || String(u.UserID || "").toLowerCase() === String(taskData.AssignedTo || "").toLowerCase());
      
      if (assignee && currentUser && assignee.UserID !== currentUser.UserID && assignee.FullName !== currentUser.FullName) {
        const role = currentUser.RoleID || currentUser.roleId || "";
        const isAuthorized = 
          role === "Super Admin" || 
          role === "Admin" || 
          assignee.ReportsTo === currentUser.UserID ||
          assignee.ReportsTo === userId;
          
        if (!isAuthorized) {
          return { success: false, message: "Authorization Error: You can only assign tasks to yourself or users who report directly to you." };
        }
      }
    }
    
    // Parse Dates
    ["StartDate", "DueDate", "CompletionDate"].forEach(dateField => {
      if (taskData[dateField] && typeof taskData[dateField] === "string" && taskData[dateField].trim() !== "") {
        taskData[dateField] = new Date(taskData[dateField]);
      } else if (!taskData[dateField]) {
        taskData[dateField] = "";
      }
    });
    
    // If status is changed to Completed, set completion date automatically
    if (taskData.Status === "Completed" && !taskData.CompletionDate) {
      taskData.CompletionDate = new Date();
    } else if (taskData.Status !== "Completed") {
      taskData.CompletionDate = "";
    }

    let oldTask = null;
    if (taskId) {
      try {
        const tasks = readTable("Tasks");
        oldTask = tasks.find(t => t.TaskID === taskId);
      } catch(e) {}
    }

    const savedId = writeTableRow("Tasks", "TaskID", taskId, taskData, userId);
    
    // Check if we should notify
    if (!taskId) {
      if (taskData.AssignedTo) {
        sendSystemNotification("task_assigned", taskData);
      }
    } else if (oldTask && taskData.AssignedTo !== oldTask.AssignedTo) {
      if (taskData.AssignedTo) {
        sendSystemNotification("task_assigned", taskData);
      }
    }
    
    if (taskData.Status === "Completed") {
      if (!oldTask || oldTask.Status !== "Completed") {
        if (!taskData.CreatedBy && oldTask) {
          taskData.CreatedBy = oldTask.CreatedBy;
        } else if (!taskData.CreatedBy) {
          taskData.CreatedBy = userId;
        }
        sendSystemNotification("task_completed", taskData);
      }
    }
    
    return {
      success: true,
      taskId: savedId,
      message: taskId ? "Task updated successfully." : "Task created successfully."
    };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

/**
 * Deletes a task by ID
 */
function deleteTask(taskId, userId) {
  try {
    checkUserPermission(userId, "Tasks", "delete");
    const success = deleteTableRow("Tasks", "TaskID", taskId);
    if (success) {
      return { success: true, message: "Task deleted successfully." };
    } else {
      return { success: false, message: "Task not found." };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}
