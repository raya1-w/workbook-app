import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  profileImage: text("profile_image"),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const userInsertSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters"),
});

export type UserInsert = z.infer<typeof userInsertSchema>;
export type User = typeof users.$inferSelect;

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectInsertSchema = createInsertSchema(projects, {
  name: (schema) => schema.min(2, "Project name must be at least 2 characters"),
});

export type ProjectInsert = z.infer<typeof projectInsertSchema>;
export type Project = typeof projects.$inferSelect;

// Project Members
export const projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const projectMemberInsertSchema = createInsertSchema(projectMembers);
export type ProjectMemberInsert = z.infer<typeof projectMemberInsertSchema>;
export type ProjectMember = typeof projectMembers.$inferSelect;

// Status enum for tasks
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "completed"]);

// Priority enum for tasks
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);

// Recurring type enum for tasks
export const recurringTypeEnum = pgEnum("recurring_type", ["none", "daily", "weekly", "monthly"]);

// Tasks
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  projectId: integer("project_id").references(() => projects.id), // Making projectId nullable for personal tasks
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  recurringType: recurringTypeEnum("recurring_type").notNull().default("none"),
  // Time tracking fields
  estimatedMinutes: integer("estimated_minutes"),
  totalTrackedMinutes: integer("total_tracked_minutes").default(0),
  currentlyTracking: boolean("currently_tracking").default(false),
  trackingStartedAt: timestamp("tracking_started_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const taskInsertSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(3, "Task title must be at least 3 characters"),
  dueDate: (schema) => schema.nullable(),
  estimatedMinutes: (schema) => schema.nullable(),
  totalTrackedMinutes: (schema) => schema.nullable().default(0),
  currentlyTracking: (schema) => schema.nullable().default(false),
  trackingStartedAt: (schema) => schema.nullable(),
});

export type TaskInsert = z.infer<typeof taskInsertSchema>;
export type Task = typeof tasks.$inferSelect;

// Chat Rooms
export const chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projects.id),  // Made optional for direct messages
  isDirectMessage: boolean("is_direct_message").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatRoomInsertSchema = createInsertSchema(chatRooms, {
  name: (schema) => schema.min(2, "Room name must be at least 2 characters"),
});

export type ChatRoomInsert = z.infer<typeof chatRoomInsertSchema>;
export type ChatRoom = typeof chatRooms.$inferSelect;

// Chat Messages
export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  attachment: text("attachment"),
});

export const chatMessageInsertSchema = createInsertSchema(chatMessages, {
  content: (schema) => schema.min(1, "Message cannot be empty"),
});

export type ChatMessageInsert = z.infer<typeof chatMessageInsertSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// Chat Room Participants (for direct messages)
export const chatRoomParticipants = pgTable("chat_room_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const chatRoomParticipantInsertSchema = createInsertSchema(chatRoomParticipants);
export type ChatRoomParticipantInsert = z.infer<typeof chatRoomParticipantInsertSchema>;
export type ChatRoomParticipant = typeof chatRoomParticipants.$inferSelect;

// Notifications
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  read: boolean("read").notNull().default(false),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationInsertSchema = createInsertSchema(notifications);
export type NotificationInsert = z.infer<typeof notificationInsertSchema>;
export type Notification = typeof notifications.$inferSelect;

// Project Files
export const projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const projectFileInsertSchema = createInsertSchema(projectFiles, {
  fileName: (schema) => schema.min(1, "File name is required"),
  description: (schema) => schema.optional(),
});

export type ProjectFileInsert = z.infer<typeof projectFileInsertSchema>;
export type ProjectFile = typeof projectFiles.$inferSelect;

// Chat Files
export const chatFiles = pgTable("chat_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  messageId: integer("message_id").references(() => chatMessages.id).notNull(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatFileInsertSchema = createInsertSchema(chatFiles, {
  fileName: (schema) => schema.min(1, "File name is required"),
});

export type ChatFileInsert = z.infer<typeof chatFileInsertSchema>;
export type ChatFile = typeof chatFiles.$inferSelect;

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  projects: many(projectMembers),
  messages: many(chatMessages),
  chatRooms: many(chatRoomParticipants),
  createdProjects: many(projects, { relationName: "createdProjects" }),
  notifications: many(notifications),
  uploadedFiles: many(projectFiles, { relationName: "uploadedFiles" }),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  members: many(projectMembers),
  tasks: many(tasks),
  chatRooms: many(chatRooms),
  files: many(projectFiles),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
    relationName: "createdProjects",
  }),
}));

export const projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks",
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "createdTasks",
  }),
}));

export const chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatRooms.projectId],
    references: [projects.id],
  }),
  creator: one(users, {
    fields: [chatRooms.createdBy],
    references: [users.id],
  }),
  messages: many(chatMessages),
  participants: many(chatRoomParticipants),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatMessages.roomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id],
  }),
  uploader: one(users, {
    fields: [projectFiles.uploadedBy],
    references: [users.id],
    relationName: "uploadedFiles",
  }),
}));

export const chatRoomParticipantsRelations = relations(chatRoomParticipants, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatRoomParticipants.roomId],
    references: [chatRooms.id],
  }),
  user: one(users, {
    fields: [chatRoomParticipants.userId],
    references: [users.id],
  }),
}));

export const chatFilesRelations = relations(chatFiles, ({ one }) => ({
  message: one(chatMessages, {
    fields: [chatFiles.messageId],
    references: [chatMessages.id],
  }),
  room: one(chatRooms, {
    fields: [chatFiles.roomId],
    references: [chatRooms.id],
  }),
  uploader: one(users, {
    fields: [chatFiles.uploadedBy],
    references: [users.id],
  }),
}));
