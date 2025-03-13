/**
 * models.js
 * 
 * This file defines the data models for the Nowa application.
 * It provides factory functions to create consistent objects for each entity.
 * These models represent the database schema and are used for data manipulation.
 */

/**
 * Creates a User object
 * Represents a user in the application with authentication details
 * 
 * @param {Object} params - User parameters
 * @returns {Object} User object
 */
function createUser({
    userId,
    name,
    email,
    password = null,
    googleId = null,
    authProvider = 'email',
    emailVerified = false,
    status = 'active',
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      user_id: userId,           // Unique user identifier
      name: name,                // User's display name
      email: email,              // User's email address
      password: password,        // Hashed password (for email login)
      google_id: googleId,       // Google login identifier
      auth_provider: authProvider, // Authentication method: 'email' or 'google'
      email_verified: emailVerified, // Whether email is verified
      status: status,            // User status
      created_at: createdAt,     // Creation timestamp
      updated_at: updatedAt      // Last update timestamp
    };
  }
  
/**
 * Creates a Goal object
 * Represents a long-term objective that may contain multiple tasks
 * 
 * @param {Object} params - Goal parameters
 * @returns {Object} Goal object
 */
function createGoal({
    goalId,
    userId,
    title,
    description = '',
    category = null,
    progress = 0,
    status = 'active',
    startDate = null,
    endDate = null,
    finishDate = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      goal_id: goalId,         // Unique goal identifier
      user_id: userId,         // Associated user ID
      title: title,            // Goal title
      description: description, // Goal description
      category: category,      // Free-form tags (comma-separated)
      progress: progress,      // Goal progress (0 to 1)
      status: status,          // Goal status: 'active', 'completed', 'cancelled'
      start_date: startDate,   // Goal start date (optional)
      end_date: endDate,       // Planned end date (optional)
      finish_date: finishDate, // Actual completion date (optional)
      created_at: createdAt,   // Creation timestamp
      updated_at: updatedAt    // Last update timestamp
    };
  }
  
/**
 * Creates a Task object
 * Represents an actionable item that can be part of a goal
 * 
 * @param {Object} params - Task parameters
 * @returns {Object} Task object
 */
function createTask({
    taskId,
    userId,
    taskListId,
    goalId = null,
    title,
    description = '',
    dueDate = null,
    priority = 'medium',
    status = 'pending',
    attachments = null,
    lastFeedbackId = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      task_id: taskId,           // Unique task identifier
      user_id: userId,           // User who owns the task
      task_list_id: taskListId,  // Task list this task belongs to
      goal_id: goalId,           // Associated goal ID (a task can be linked to one goal)
      title: title,              // Task title
      description: description,  // Task description (optional)
      due_date: dueDate,         // Task due date (optional)
      priority: priority,        // Priority: 'low', 'medium', 'high'
      status: status,            // Task status: 'pending', 'completed', 'cancelled'
      attachments: attachments,  // Attachments field, stores image URLs (comma-separated or JSON)
      last_feedback_id: lastFeedbackId, // Latest feedback record ID (links to TaskFeedback)
      created_at: createdAt,     // Creation timestamp
      updated_at: updatedAt      // Last update timestamp
    };
  }
  
/**
 * Creates a TaskList object
 * Represents a collection of related tasks
 * 
 * @param {Object} params - TaskList parameters
 * @returns {Object} TaskList object
 */
function createTaskList({
    taskListId,
    userId,
    name,
    description = '',
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      task_list_id: taskListId,  // Unique task list identifier
      user_id: userId,           // Associated user ID
      name: name,                // Task list name
      description: description,  // List description (optional)
      created_at: createdAt,     // Creation timestamp
      updated_at: updatedAt      // Last update timestamp
    };
  }
  
/**
 * Creates a TaskFeedback object
 * Represents feedback or notes attached to a task
 * 
 * @param {Object} params - TaskFeedback parameters
 * @returns {Object} TaskFeedback object
 */
function createTaskFeedback({
    feedbackId,
    taskId,
    userId,
    content,
    feedbackType = 'text',
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      feedback_id: feedbackId,    // Unique feedback identifier
      task_id: taskId,            // Associated task ID
      user_id: userId,            // User who submitted the feedback
      content: content,           // Feedback content (message-style record)
      feedback_type: feedbackType, // Feedback type, e.g., 'text' (future: 'voice', etc.)
      created_at: createdAt,      // Creation timestamp
      updated_at: updatedAt       // Last update timestamp
    };
  }
  
/**
 * Creates a UserProfile object
 * Represents additional user preferences and settings
 * 
 * @param {Object} params - UserProfile parameters
 * @returns {Object} UserProfile object
 */
function createUserProfile({
    profileId,
    userId,
    planPreferences = '',
    extraInfo = null,
    createdAt = new Date(),
    updatedAt = new Date()
  }) {
    return {
      profile_id: profileId,      // Unique profile identifier
      user_id: userId,            // Associated user ID
      plan_preferences: planPreferences, // User's planning preferences
      extra_info: extraInfo,      // Additional extension info (stored as structured JSON)
      created_at: createdAt,      // Creation timestamp
      updated_at: updatedAt       // Last update timestamp
    };
  }
  
// Export all factory functions
module.exports = {
    createUser,
    createGoal,
    createTask,
    createTaskList,
    createTaskFeedback,
    createUserProfile
  };
  