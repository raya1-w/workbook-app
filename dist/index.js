var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// db/index.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  chatFileInsertSchema: () => chatFileInsertSchema,
  chatFiles: () => chatFiles,
  chatFilesRelations: () => chatFilesRelations,
  chatMessageInsertSchema: () => chatMessageInsertSchema,
  chatMessages: () => chatMessages,
  chatMessagesRelations: () => chatMessagesRelations,
  chatRoomInsertSchema: () => chatRoomInsertSchema,
  chatRoomParticipantInsertSchema: () => chatRoomParticipantInsertSchema,
  chatRoomParticipants: () => chatRoomParticipants,
  chatRoomParticipantsRelations: () => chatRoomParticipantsRelations,
  chatRooms: () => chatRooms,
  chatRoomsRelations: () => chatRoomsRelations,
  notificationInsertSchema: () => notificationInsertSchema,
  notifications: () => notifications,
  notificationsRelations: () => notificationsRelations,
  projectFileInsertSchema: () => projectFileInsertSchema,
  projectFiles: () => projectFiles,
  projectFilesRelations: () => projectFilesRelations,
  projectInsertSchema: () => projectInsertSchema,
  projectMemberInsertSchema: () => projectMemberInsertSchema,
  projectMembers: () => projectMembers,
  projectMembersRelations: () => projectMembersRelations,
  projects: () => projects,
  projectsRelations: () => projectsRelations,
  recurringTypeEnum: () => recurringTypeEnum,
  taskInsertSchema: () => taskInsertSchema,
  taskPriorityEnum: () => taskPriorityEnum,
  taskStatusEnum: () => taskStatusEnum,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  userInsertSchema: () => userInsertSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { pgTable, text, serial, integer, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  profileImage: text("profile_image"),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var userInsertSchema = createInsertSchema(users, {
  username: (schema) => schema.min(3, "Username must be at least 3 characters"),
  email: (schema) => schema.email("Must provide a valid email"),
  password: (schema) => schema.min(6, "Password must be at least 6 characters")
});
var projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var projectInsertSchema = createInsertSchema(projects, {
  name: (schema) => schema.min(2, "Project name must be at least 2 characters")
});
var projectMembers = pgTable("project_members", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"),
  addedAt: timestamp("added_at").defaultNow().notNull()
});
var projectMemberInsertSchema = createInsertSchema(projectMembers);
var taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "completed"]);
var taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high"]);
var recurringTypeEnum = pgEnum("recurring_type", ["none", "daily", "weekly", "monthly"]);
var tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default("todo"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  dueDate: timestamp("due_date"),
  projectId: integer("project_id").references(() => projects.id),
  // Making projectId nullable for personal tasks
  assignedTo: integer("assigned_to").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  recurringType: recurringTypeEnum("recurring_type").notNull().default("none"),
  // Time tracking fields
  estimatedMinutes: integer("estimated_minutes"),
  totalTrackedMinutes: integer("total_tracked_minutes").default(0),
  currentlyTracking: boolean("currently_tracking").default(false),
  trackingStartedAt: timestamp("tracking_started_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var taskInsertSchema = createInsertSchema(tasks, {
  title: (schema) => schema.min(3, "Task title must be at least 3 characters"),
  dueDate: (schema) => schema.nullable(),
  estimatedMinutes: (schema) => schema.nullable(),
  totalTrackedMinutes: (schema) => schema.nullable().default(0),
  currentlyTracking: (schema) => schema.nullable().default(false),
  trackingStartedAt: (schema) => schema.nullable()
});
var chatRooms = pgTable("chat_rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  // Made optional for direct messages
  isDirectMessage: boolean("is_direct_message").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var chatRoomInsertSchema = createInsertSchema(chatRooms, {
  name: (schema) => schema.min(2, "Room name must be at least 2 characters")
});
var chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  attachment: text("attachment")
});
var chatMessageInsertSchema = createInsertSchema(chatMessages, {
  content: (schema) => schema.min(1, "Message cannot be empty")
});
var chatRoomParticipants = pgTable("chat_room_participants", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull()
});
var chatRoomParticipantInsertSchema = createInsertSchema(chatRoomParticipants);
var notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(),
  read: boolean("read").notNull().default(false),
  relatedId: integer("related_id"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var notificationInsertSchema = createInsertSchema(notifications);
var projectFiles = pgTable("project_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var projectFileInsertSchema = createInsertSchema(projectFiles, {
  fileName: (schema) => schema.min(1, "File name is required"),
  description: (schema) => schema.optional()
});
var chatFiles = pgTable("chat_files", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  filePath: text("file_path").notNull(),
  messageId: integer("message_id").references(() => chatMessages.id).notNull(),
  roomId: integer("room_id").references(() => chatRooms.id).notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var chatFileInsertSchema = createInsertSchema(chatFiles, {
  fileName: (schema) => schema.min(1, "File name is required")
});
var usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks, { relationName: "assignedTasks" }),
  createdTasks: many(tasks, { relationName: "createdTasks" }),
  projects: many(projectMembers),
  messages: many(chatMessages),
  chatRooms: many(chatRoomParticipants),
  createdProjects: many(projects, { relationName: "createdProjects" }),
  notifications: many(notifications),
  uploadedFiles: many(projectFiles, { relationName: "uploadedFiles" })
}));
var projectsRelations = relations(projects, ({ many, one }) => ({
  members: many(projectMembers),
  tasks: many(tasks),
  chatRooms: many(chatRooms),
  files: many(projectFiles),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
    relationName: "createdProjects"
  })
}));
var projectMembersRelations = relations(projectMembers, ({ one }) => ({
  project: one(projects, {
    fields: [projectMembers.projectId],
    references: [projects.id]
  }),
  user: one(users, {
    fields: [projectMembers.userId],
    references: [users.id]
  })
}));
var tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id]
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "assignedTasks"
  }),
  creator: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
    relationName: "createdTasks"
  })
}));
var chatRoomsRelations = relations(chatRooms, ({ one, many }) => ({
  project: one(projects, {
    fields: [chatRooms.projectId],
    references: [projects.id]
  }),
  creator: one(users, {
    fields: [chatRooms.createdBy],
    references: [users.id]
  }),
  messages: many(chatMessages),
  participants: many(chatRoomParticipants)
}));
var chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatMessages.roomId],
    references: [chatRooms.id]
  }),
  user: one(users, {
    fields: [chatMessages.userId],
    references: [users.id]
  })
}));
var notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id]
  })
}));
var projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, {
    fields: [projectFiles.projectId],
    references: [projects.id]
  }),
  uploader: one(users, {
    fields: [projectFiles.uploadedBy],
    references: [users.id],
    relationName: "uploadedFiles"
  })
}));
var chatRoomParticipantsRelations = relations(chatRoomParticipants, ({ one }) => ({
  room: one(chatRooms, {
    fields: [chatRoomParticipants.roomId],
    references: [chatRooms.id]
  }),
  user: one(users, {
    fields: [chatRoomParticipants.userId],
    references: [users.id]
  })
}));
var chatFilesRelations = relations(chatFiles, ({ one }) => ({
  message: one(chatMessages, {
    fields: [chatFiles.messageId],
    references: [chatMessages.id]
  }),
  room: one(chatRooms, {
    fields: [chatFiles.roomId],
    references: [chatRooms.id]
  }),
  uploader: one(users, {
    fields: [chatFiles.uploadedBy],
    references: [users.id]
  })
}));

// db/index.ts
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";
var MemoryStore = createMemoryStore(session);
var DatabaseStorage = class {
  sessionStore;
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 864e5
      // prune expired entries every 24h
    });
  }
  // User methods
  async getUser(id) {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }
  async getUserByUsername(username) {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }
  async getUserByEmail(email) {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }
  async getUserByGoogleId(googleId) {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }
  async createUser(user) {
    const created = await db.insert(users).values(user).returning();
    return created[0];
  }
  async updateUser(id, user) {
    const updated = await db.update(users).set({ ...user, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, id)).returning();
    return updated[0];
  }
  // Project methods
  async getProject(id) {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }
  async getUserProjects(userId) {
    const memberProjects = await db.select({
      project: projects,
      memberCount: sql`count(${projectMembers.userId})::int`
    }).from(projects).innerJoin(
      projectMembers,
      eq(projects.id, projectMembers.projectId)
    ).where(
      or(
        eq(projects.createdBy, userId),
        eq(projectMembers.userId, userId)
      )
    ).groupBy(projects.id).orderBy(desc(projects.createdAt));
    return memberProjects.map(({ project, memberCount }) => ({
      ...project,
      memberCount
    }));
  }
  async createProject(project) {
    const created = await db.insert(projects).values(project).returning();
    await db.insert(projectMembers).values({
      projectId: created[0].id,
      userId: created[0].createdBy,
      role: "admin"
    });
    return created[0];
  }
  async updateProject(id, project) {
    const updated = await db.update(projects).set({ ...project, updatedAt: /* @__PURE__ */ new Date() }).where(eq(projects.id, id)).returning();
    return updated[0];
  }
  async deleteProject(id) {
    await db.delete(projects).where(eq(projects.id, id));
  }
  // Project Members methods
  async getProjectMembers(projectId) {
    const members = await db.select({
      member: projectMembers,
      user: users
    }).from(projectMembers).innerJoin(users, eq(projectMembers.userId, users.id)).where(eq(projectMembers.projectId, projectId));
    return members.map(({ member, user }) => ({
      ...member,
      user
    }));
  }
  async isProjectMember(projectId, userId) {
    const member = await db.select().from(projectMembers).where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    ).limit(1);
    return member.length > 0;
  }
  async addProjectMember(member) {
    const created = await db.insert(projectMembers).values(member).returning();
    return created[0];
  }
  async removeProjectMember(projectId, userId) {
    await db.delete(projectMembers).where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId)
      )
    );
  }
  // Task methods
  async getTask(id) {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }
  async getProjectTasks(projectId) {
    const taskData = await db.select({
      task: tasks,
      assignee: users
    }).from(tasks).leftJoin(
      users,
      eq(tasks.assignedTo, users.id)
    ).where(eq(tasks.projectId, projectId)).orderBy(desc(tasks.updatedAt));
    return taskData.map(({ task, assignee }) => ({
      ...task,
      assignee: assignee || void 0
    }));
  }
  async getUserTasks(userId) {
    const taskData = await db.select({
      task: tasks,
      project: projects
    }).from(tasks).innerJoin(
      projects,
      eq(tasks.projectId, projects.id)
    ).where(eq(tasks.assignedTo, userId)).orderBy(desc(tasks.updatedAt));
    return taskData.map(({ task, project }) => ({
      ...task,
      project
    }));
  }
  async getPersonalTasks(userId) {
    return db.select().from(tasks).where(
      and(
        eq(tasks.createdBy, userId),
        sql`${tasks.projectId} IS NULL`
      )
    ).orderBy(desc(tasks.updatedAt));
  }
  async createTask(task) {
    const created = await db.insert(tasks).values(task).returning();
    return created[0];
  }
  async updateTask(id, task) {
    const updated = await db.update(tasks).set({ ...task, updatedAt: /* @__PURE__ */ new Date() }).where(eq(tasks.id, id)).returning();
    return updated[0];
  }
  async deleteTask(id) {
    await db.delete(tasks).where(eq(tasks.id, id));
  }
  // Chat Room methods
  async getChatRoom(id) {
    const result = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
    return result[0];
  }
  async getProjectChatRooms(projectId) {
    return db.select().from(chatRooms).where(eq(chatRooms.projectId, projectId)).orderBy(chatRooms.createdAt);
  }
  async createChatRoom(room) {
    const created = await db.insert(chatRooms).values(room).returning();
    return created[0];
  }
  // Chat Message methods
  async getChatMessages(roomId, limit = 50) {
    const messages = await db.select({
      message: chatMessages,
      user: users
    }).from(chatMessages).innerJoin(users, eq(chatMessages.userId, users.id)).where(eq(chatMessages.roomId, roomId)).orderBy(chatMessages.createdAt).limit(limit);
    return messages.map(({ message, user }) => ({
      ...message,
      user
    }));
  }
  async createChatMessage(message) {
    const created = await db.insert(chatMessages).values(message).returning();
    const user = await this.getUser(message.userId);
    return { ...created[0], user };
  }
  // Notification methods
  async getUserNotifications(userId) {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }
  async createNotification(notification) {
    const created = await db.insert(notifications).values(notification).returning();
    return created[0];
  }
  async markNotificationAsRead(id) {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }
  // Project Files methods
  async getProjectFile(id) {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }
  async getProjectFiles(projectId) {
    const files = await db.select({
      file: projectFiles,
      uploader: users
    }).from(projectFiles).innerJoin(users, eq(projectFiles.uploadedBy, users.id)).where(eq(projectFiles.projectId, projectId)).orderBy(desc(projectFiles.createdAt));
    return files.map(({ file, uploader }) => ({
      ...file,
      uploader
    }));
  }
  async createProjectFile(file) {
    const created = await db.insert(projectFiles).values(file).returning();
    return created[0];
  }
  async deleteProjectFile(id) {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }
  // Direct messaging methods
  async getUserDirectChats(userId) {
    const rooms = await db.select({
      room: chatRooms
    }).from(chatRoomParticipants).innerJoin(
      chatRooms,
      and(
        eq(chatRoomParticipants.roomId, chatRooms.id),
        eq(chatRooms.isDirectMessage, true)
      )
    ).where(eq(chatRoomParticipants.userId, userId)).orderBy(desc(chatRooms.createdAt));
    const result = [];
    for (const { room } of rooms) {
      const participants = await this.getChatRoomParticipants(room.id);
      const users2 = participants.map((p) => p.user);
      result.push({
        ...room,
        participants: users2
      });
    }
    return result;
  }
  async getDirectChatRoom(user1Id, user2Id) {
    const user1Rooms = await db.select({ roomId: chatRoomParticipants.roomId }).from(chatRoomParticipants).innerJoin(
      chatRooms,
      and(
        eq(chatRoomParticipants.roomId, chatRooms.id),
        eq(chatRooms.isDirectMessage, true)
      )
    ).where(eq(chatRoomParticipants.userId, user1Id));
    if (user1Rooms.length === 0) return void 0;
    const roomIds = user1Rooms.map((r) => r.roomId);
    const commonRooms = await db.select({ roomId: chatRoomParticipants.roomId }).from(chatRoomParticipants).where(
      and(
        eq(chatRoomParticipants.userId, user2Id),
        inArray(chatRoomParticipants.roomId, roomIds)
      )
    );
    if (commonRooms.length === 0) return void 0;
    const room = await this.getChatRoom(commonRooms[0].roomId);
    return room;
  }
  async createDirectChatRoom(userId1, userId2) {
    const existingRoom = await this.getDirectChatRoom(userId1, userId2);
    if (existingRoom) return existingRoom;
    const user1 = await this.getUser(userId1);
    const user2 = await this.getUser(userId2);
    if (!user1 || !user2) {
      throw new Error("One or both users do not exist");
    }
    const room = await this.createChatRoom({
      name: `${user1.username} & ${user2.username}`,
      createdBy: userId1,
      isDirectMessage: true
    });
    await this.addChatRoomParticipant({ roomId: room.id, userId: userId1 });
    await this.addChatRoomParticipant({ roomId: room.id, userId: userId2 });
    return room;
  }
  // Chat room participants methods
  async getChatRoomParticipants(roomId) {
    const participants = await db.select({
      participant: chatRoomParticipants,
      user: users
    }).from(chatRoomParticipants).innerJoin(users, eq(chatRoomParticipants.userId, users.id)).where(eq(chatRoomParticipants.roomId, roomId));
    return participants.map(({ participant, user }) => ({
      ...participant,
      user
    }));
  }
  async addChatRoomParticipant(participant) {
    const created = await db.insert(chatRoomParticipants).values(participant).returning();
    return created[0];
  }
  async removeChatRoomParticipant(roomId, userId) {
    await db.delete(chatRoomParticipants).where(
      and(
        eq(chatRoomParticipants.roomId, roomId),
        eq(chatRoomParticipants.userId, userId)
      )
    );
  }
  // Chat Files methods
  async getChatFile(id) {
    const result = await db.select().from(chatFiles).where(eq(chatFiles.id, id)).limit(1);
    return result[0];
  }
  async getChatRoomFiles(roomId) {
    const files = await db.select({
      file: chatFiles,
      uploader: users
    }).from(chatFiles).innerJoin(users, eq(chatFiles.uploadedBy, users.id)).where(eq(chatFiles.roomId, roomId)).orderBy(desc(chatFiles.createdAt));
    return files.map(({ file, uploader }) => ({
      ...file,
      uploader
    }));
  }
  async createChatFile(file) {
    const created = await db.insert(chatFiles).values(file).returning();
    return created[0];
  }
};
var storage = new DatabaseStorage();

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session2 from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
function setupAuth(app2) {
  if (!process.env.SESSION_SECRET) {
    console.warn("Warning: SESSION_SECRET is not defined. Using a default secret.");
  }
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || "default_insecure_secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 1e3 * 60 * 60 * 24 * 7
      // 1 week
    }
  };
  app2.set("trust proxy", 1);
  app2.use(session2(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const isEmail = username.includes("@");
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        if (!user || !await comparePasswords(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    })
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });
  app2.post("/api/register", async (req, res, next) => {
    try {
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "An error occurred during registration" });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        return res.status(200).json(user);
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    res.json(req.user);
  });
  app2.put("/api/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const { name, email, profileImage } = req.body;
      if (email && email !== req.user.email) {
        const existingEmail = await storage.getUserByEmail(email);
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }
      const updatedUser = await storage.updateUser(userId, {
        name,
        email,
        profileImage
      });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ message: "An error occurred while updating profile" });
    }
  });
  app2.put("/api/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isPasswordValid = await comparePasswords(currentPassword, user.password);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const hashedNewPassword = await hashPassword(newPassword);
      await storage.updateUser(userId, { password: hashedNewPassword });
      res.status(200).json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Password update error:", error);
      res.status(500).json({ message: "An error occurred while updating password" });
    }
  });
}

// server/routes.ts
import fs2 from "fs";

// server/file-uploads.ts
import multer from "multer";
import path from "path";
import fs from "fs";
var uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
var projectUploadsDir = path.join(uploadsDir, "projects");
if (!fs.existsSync(projectUploadsDir)) {
  fs.mkdirSync(projectUploadsDir, { recursive: true });
}
var projectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.params.projectId;
    const projectDir = path.join(projectUploadsDir, projectId);
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
var chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const roomId = req.params.roomId;
    const chatDir = path.join(uploadsDir, "chats", roomId);
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }
    cb(null, chatDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});
var fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // .docx
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    // .xlsx
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    // .pptx
    "text/plain",
    "text/csv",
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    // Archives
    "application/zip",
    "application/x-rar-compressed",
    // Others
    "application/json",
    "text/markdown"
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`));
  }
};
var projectUpload = multer({
  storage: projectStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB max file size
  }
});
var chatUpload = multer({
  storage: chatStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
    // 5MB max file size for chat attachments
  }
});
var getFileUrl = (filePath) => {
  const relativePath = path.relative(uploadsDir, filePath);
  return `/uploads/${relativePath.replace(/\\/g, "/")}`;
};

// server/routes.ts
async function safeCheckProjectMembership(projectId, userId) {
  if (projectId === null) return false;
  return storage.isProjectMember(projectId, userId);
}
async function registerRoutes(app2) {
  setupAuth(app2);
  const httpServer = createServer(app2);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = /* @__PURE__ */ new Map();
  wss.on("connection", (ws2) => {
    ws2.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth") {
          clients.set(ws2, data.payload.userId);
        } else if (data.type === "chat_message") {
          const userId = clients.get(ws2);
          if (!userId) return;
          const { roomId, content } = data.payload;
          const newMessage = await storage.createChatMessage({
            roomId,
            userId,
            content
          });
          const messageData = {
            type: "new_message",
            payload: newMessage
          };
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(messageData));
            }
          });
        } else if (data.type === "task_update") {
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: "task_updated",
                payload: data.payload
              }));
            }
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });
    ws2.on("close", () => {
      clients.delete(ws2);
    });
  });
  app2.get("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projects2 = await storage.getUserProjects(req.user.id);
      res.json(projects2);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Error fetching projects" });
    }
  });
  app2.post("/api/projects", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const project = await storage.createProject({
        ...req.body,
        createdBy: req.user.id
      });
      await storage.createChatRoom({
        name: "General",
        projectId: project.id,
        createdBy: req.user.id
      });
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Error creating project" });
    }
  });
  app2.get("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view this project" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Error fetching project" });
    }
  });
  app2.put("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this project" });
      }
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Error updating project" });
    }
  });
  app2.delete("/api/projects/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this project" });
      }
      await storage.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Error deleting project" });
    }
  });
  app2.get("/api/projects/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view this project" });
      }
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Error fetching project members" });
    }
  });
  app2.post("/api/projects/:id/members", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to add members to this project" });
      }
      const { username, role } = req.body;
      const userToAdd = await storage.getUserByUsername(username);
      if (!userToAdd) {
        return res.status(404).json({ message: "User not found" });
      }
      const isMember = await storage.isProjectMember(projectId, userToAdd.id);
      if (isMember) {
        return res.status(400).json({ message: "User is already a member of this project" });
      }
      const member = await storage.addProjectMember({
        projectId,
        userId: userToAdd.id,
        role: role || "member"
      });
      await storage.createNotification({
        userId: userToAdd.id,
        content: `You have been added to project "${project.name}"`,
        type: "project_invitation",
        relatedId: projectId
      });
      res.status(201).json(member);
    } catch (error) {
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Error adding project member" });
    }
  });
  app2.delete("/api/projects/:projectId/members/:userId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      if (project.createdBy !== req.user.id && userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to remove members from this project" });
      }
      await storage.removeProjectMember(projectId, userId);
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Error removing project member" });
    }
  });
  app2.get("/api/projects/:id/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view tasks for this project" });
      }
      const tasks2 = await storage.getProjectTasks(projectId);
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Error fetching tasks" });
    }
  });
  app2.post("/api/projects/:id/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to create tasks for this project" });
      }
      const task = await storage.createTask({
        ...req.body,
        projectId,
        createdBy: req.user.id
      });
      if (task.assignedTo && task.assignedTo !== req.user.id) {
        await storage.createNotification({
          userId: task.assignedTo,
          content: `You have been assigned a new task: ${task.title}`,
          type: "task_assignment",
          relatedId: task.id
        });
      }
      res.status(201).json(task);
      const taskData = {
        type: "task_created",
        payload: task
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Error creating task" });
    }
  });
  app2.put("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      const isMember = await safeCheckProjectMembership(task.projectId, req.user.id);
      if (!isMember && task.projectId !== null) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }
      const previousAssignee = task.assignedTo;
      const updatedTask = await storage.updateTask(taskId, req.body);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (updatedTask.assignedTo && updatedTask.assignedTo !== previousAssignee && updatedTask.assignedTo !== req.user.id) {
        await storage.createNotification({
          userId: updatedTask.assignedTo,
          content: `You have been assigned a task: ${updatedTask.title}`,
          type: "task_assignment",
          relatedId: updatedTask.id
        });
      }
      res.json(updatedTask);
      const taskData = {
        type: "task_updated",
        payload: updatedTask
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Error updating task" });
    }
  });
  app2.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.createdBy !== req.user.id) {
        if (task.projectId !== null) {
          const project = await storage.getProject(task.projectId);
          if (!project || project.createdBy !== req.user.id) {
            return res.status(403).json({ message: "Not authorized to delete this task" });
          }
        } else {
          return res.status(403).json({ message: "Not authorized to delete this task" });
        }
      }
      await storage.deleteTask(taskId);
      res.status(204).send();
      const taskData = {
        type: "task_deleted",
        payload: { taskId }
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Error deleting task" });
    }
  });
  app2.get("/api/projects/:id/chat-rooms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view chat rooms for this project" });
      }
      const chatRooms2 = await storage.getProjectChatRooms(projectId);
      res.json(chatRooms2);
    } catch (error) {
      console.error("Error fetching chat rooms:", error);
      res.status(500).json({ message: "Error fetching chat rooms" });
    }
  });
  app2.post("/api/projects/:id/chat-rooms", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.id);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to create chat rooms for this project" });
      }
      const chatRoom = await storage.createChatRoom({
        ...req.body,
        projectId,
        createdBy: req.user.id
      });
      res.status(201).json(chatRoom);
    } catch (error) {
      console.error("Error creating chat room:", error);
      res.status(500).json({ message: "Error creating chat room" });
    }
  });
  app2.get("/api/direct-messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const userId = req.user.id;
      const directChats = await storage.getUserDirectChats(userId);
      res.json(directChats);
    } catch (error) {
      console.error("Error fetching direct chats:", error);
      res.status(500).json({ message: "Error fetching direct chats" });
    }
  });
  app2.post("/api/direct-messages/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const { recipientId } = req.body;
    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" });
    }
    try {
      const room = await storage.createDirectChatRoom(userId, parseInt(recipientId));
      res.status(201).json(room);
    } catch (error) {
      console.error("Error creating direct message room:", error);
      res.status(500).json({ message: "Failed to create direct message room" });
    }
  });
  app2.get("/api/direct-messages/:roomId/participants", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { roomId } = req.params;
    try {
      const participants = await storage.getChatRoomParticipants(parseInt(roomId));
      res.json(participants);
    } catch (error) {
      console.error("Error fetching chat room participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });
  app2.get("/api/chat-rooms/:roomId/participants", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const roomId = parseInt(req.params.roomId);
    try {
      const chatRoom = await storage.getChatRoom(roomId);
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }
      if (chatRoom.projectId) {
        const isMember = await storage.isProjectMember(chatRoom.projectId, userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to view participants for this chat room" });
        }
      } else if (chatRoom.isDirectMessage) {
        const currentParticipants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = currentParticipants.some((p) => p.user.id === userId);
        if (!isParticipant) {
          return res.status(403).json({ message: "Not authorized to view participants for this chat room" });
        }
      }
      const participants = await storage.getChatRoomParticipants(roomId);
      res.json(participants);
    } catch (error) {
      console.error("Error fetching chat room participants:", error);
      res.status(500).json({ message: "Failed to fetch participants" });
    }
  });
  app2.post("/api/chat-rooms/:roomId/participants", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const roomId = parseInt(req.params.roomId);
    const { participantId } = req.body;
    if (!participantId) {
      return res.status(400).json({ message: "Participant ID is required" });
    }
    try {
      const chatRoom = await storage.getChatRoom(roomId);
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }
      if (chatRoom.isDirectMessage) {
        const participants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = participants.some((p) => p.user.id === userId);
        if (!isParticipant) {
          return res.status(403).json({ message: "Not authorized to add participants to this chat" });
        }
      } else if (chatRoom.projectId) {
        const isMember = await storage.isProjectMember(chatRoom.projectId, userId);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to add participants to this chat room" });
        }
        const isParticipantProjectMember = await storage.isProjectMember(chatRoom.projectId, parseInt(participantId));
        if (!isParticipantProjectMember) {
          return res.status(400).json({ message: "Cannot add non-project member to project chat room" });
        }
      }
      const participant = await storage.addChatRoomParticipant({
        roomId,
        userId: parseInt(participantId)
      });
      res.status(201).json(participant);
    } catch (error) {
      console.error("Error adding participant to chat room:", error);
      res.status(500).json({ message: "Failed to add participant to chat room" });
    }
  });
  app2.get("/api/direct-messages/:roomId/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { roomId } = req.params;
    try {
      const files = await storage.getChatRoomFiles(parseInt(roomId));
      res.json(files);
    } catch (error) {
      console.error("Error fetching chat room files:", error);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });
  app2.post("/api/direct-messages/:roomId/files", chatUpload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    const { roomId } = req.params;
    const { messageId } = req.body;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    try {
      const chatRoom = await storage.getChatRoom(parseInt(roomId));
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }
      const participants = await storage.getChatRoomParticipants(parseInt(roomId));
      const isParticipant = participants.some((p) => p.user.id === userId);
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized to upload files to this chat" });
      }
      const chatFile = await storage.createChatFile({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        messageId: parseInt(messageId),
        roomId: parseInt(roomId),
        uploadedBy: userId
      });
      res.status(201).json({
        ...chatFile,
        url: getFileUrl(req.file.path)
      });
    } catch (error) {
      console.error("Error uploading chat file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });
  app2.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const username = req.query.username;
    if (!username) {
      return res.status(400).json({ message: "Username parameter is required" });
    }
    try {
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password, ...userData } = user;
      res.json(userData);
    } catch (error) {
      console.error("Error searching for user:", error);
      res.status(500).json({ message: "Failed to search for user" });
    }
  });
  app2.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const userId = req.user.id;
    try {
      const projects2 = await storage.getUserProjects(userId);
      const projectMembers2 = [];
      for (const project of projects2) {
        const members = await storage.getProjectMembers(project.id);
        projectMembers2.push(...members.map((member) => member.user));
      }
      const uniqueUsers = Array.from(
        new Map(projectMembers2.map((user) => [user.id, user])).values()
      ).filter((user) => user.id !== userId);
      res.json(uniqueUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
  app2.get("/api/chat-rooms/:id/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const roomId = parseInt(req.params.id);
      const chatRoom = await storage.getChatRoom(roomId);
      if (!chatRoom) {
        return res.status(404).json({ message: "Chat room not found" });
      }
      if (chatRoom.projectId && !chatRoom.isDirectMessage) {
        const isMember = await storage.isProjectMember(chatRoom.projectId, req.user.id);
        if (!isMember) {
          return res.status(403).json({ message: "Not authorized to view messages for this chat room" });
        }
      } else if (chatRoom.isDirectMessage) {
        const participants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = participants.some((p) => p.user.id === req.user.id);
        if (!isParticipant) {
          return res.status(403).json({ message: "Not authorized to view messages for this chat room" });
        }
      }
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      const messages = await storage.getChatMessages(roomId, limit);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ message: "Error fetching chat messages" });
    }
  });
  app2.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const notifications2 = await storage.getUserNotifications(req.user.id);
      res.json(notifications2);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Error fetching notifications" });
    }
  });
  app2.post("/api/tasks/:id/track/start", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.assignedTo !== req.user.id && task.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to track time for this task" });
      }
      if (task.currentlyTracking) {
        return res.status(400).json({ message: "Task is already being tracked" });
      }
      const updatedTask = await storage.updateTask(taskId, {
        currentlyTracking: true,
        trackingStartedAt: /* @__PURE__ */ new Date()
      });
      res.json(updatedTask);
      const taskData = {
        type: "task_tracking_started",
        payload: updatedTask
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error("Error starting time tracking:", error);
      res.status(500).json({ message: "Error starting time tracking" });
    }
  });
  app2.post("/api/tasks/:id/track/stop", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.assignedTo !== req.user.id && task.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to track time for this task" });
      }
      if (!task.currentlyTracking || !task.trackingStartedAt) {
        return res.status(400).json({ message: "Task is not being tracked" });
      }
      const startTime = new Date(task.trackingStartedAt);
      const endTime = /* @__PURE__ */ new Date();
      const minutesSpent = Math.round((endTime.getTime() - startTime.getTime()) / 6e4);
      const totalTrackedMinutes = (task.totalTrackedMinutes || 0) + minutesSpent;
      const updatedTask = await storage.updateTask(taskId, {
        currentlyTracking: false,
        trackingStartedAt: null,
        totalTrackedMinutes
      });
      res.json(updatedTask);
      const taskData = {
        type: "task_tracking_stopped",
        payload: updatedTask
      };
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error("Error stopping time tracking:", error);
      res.status(500).json({ message: "Error stopping time tracking" });
    }
  });
  app2.put("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Error marking notification as read" });
    }
  });
  app2.get("/api/user/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const tasks2 = await storage.getUserTasks(req.user.id);
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      res.status(500).json({ message: "Error fetching user tasks" });
    }
  });
  app2.get("/api/personal-tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const tasks2 = await storage.getPersonalTasks(req.user.id);
      res.json(tasks2);
    } catch (error) {
      console.error("Error fetching personal tasks:", error);
      res.status(500).json({ message: "Error fetching personal tasks" });
    }
  });
  app2.post("/api/personal-tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskData = { ...req.body };
      if (taskData.dueDate) {
        try {
          const dueDate = new Date(taskData.dueDate);
          if (!isNaN(dueDate.getTime())) {
            taskData.dueDate = dueDate;
          } else {
            taskData.dueDate = null;
          }
        } catch (e) {
          taskData.dueDate = null;
        }
      }
      const task = await storage.createTask({
        ...taskData,
        projectId: null,
        // Personal tasks have no project
        createdBy: req.user.id,
        assignedTo: req.user.id
        // Personal tasks are assigned to the creator
      });
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating personal task:", error);
      res.status(500).json({ message: "Error creating personal task" });
    }
  });
  app2.put("/api/personal-tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.projectId !== null || task.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }
      const taskData = { ...req.body };
      if (taskData.dueDate) {
        try {
          const dueDate = new Date(taskData.dueDate);
          if (!isNaN(dueDate.getTime())) {
            taskData.dueDate = dueDate;
          } else {
            taskData.dueDate = null;
          }
        } catch (e) {
          taskData.dueDate = null;
        }
      }
      const updatedTask = await storage.updateTask(taskId, taskData);
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating personal task:", error);
      res.status(500).json({ message: "Error updating personal task" });
    }
  });
  app2.delete("/api/personal-tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      if (task.projectId !== null || task.createdBy !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this task" });
      }
      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting personal task:", error);
      res.status(500).json({ message: "Error deleting personal task" });
    }
  });
  app2.post("/api/projects/:projectId/files", projectUpload.single("file"), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.projectId);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to upload files to this project" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const projectFile = await storage.createProjectFile({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        projectId,
        uploadedBy: req.user.id,
        description: req.body.description || null
      });
      const fileUrl = getFileUrl(req.file.path);
      const projectMembers2 = await storage.getProjectMembers(projectId);
      const project = await storage.getProject(projectId);
      const notifications2 = projectMembers2.filter((member) => member.userId !== req.user.id).map((member) => storage.createNotification({
        userId: member.userId,
        content: `New file "${req.file.originalname}" uploaded to project "${project.name}"`,
        type: "file_upload",
        relatedId: projectFile.id
      }));
      await Promise.all(notifications2);
      res.status(201).json({
        ...projectFile,
        url: fileUrl
      });
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Error uploading file" });
    }
  });
  app2.get("/api/projects/:projectId/files", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.projectId);
      const isMember = await storage.isProjectMember(projectId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "Not authorized to view files for this project" });
      }
      const files = await storage.getProjectFiles(projectId);
      const filesWithUrls = files.map((file) => ({
        ...file,
        url: getFileUrl(file.filePath)
      }));
      res.json(filesWithUrls);
    } catch (error) {
      console.error("Error fetching project files:", error);
      res.status(500).json({ message: "Error fetching project files" });
    }
  });
  app2.delete("/api/projects/:projectId/files/:fileId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getProjectFile(fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      if (file.projectId !== projectId) {
        return res.status(400).json({ message: "File does not belong to this project" });
      }
      const project = await storage.getProject(projectId);
      const member = (await storage.getProjectMembers(projectId)).find((m) => m.userId === req.user.id);
      if (!member) {
        return res.status(403).json({ message: "Not authorized to delete files from this project" });
      }
      const isAdmin = member.role === "admin";
      const isUploader = file.uploadedBy === req.user.id;
      const isCreator = project.createdBy === req.user.id;
      if (!isAdmin && !isUploader && !isCreator) {
        return res.status(403).json({ message: "Not authorized to delete this file" });
      }
      if (file.filePath) {
        try {
          fs2.unlinkSync(file.filePath);
        } catch (err) {
          console.error("Error deleting file from disk:", err);
        }
      }
      await storage.deleteProjectFile(fileId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ message: "Error deleting file" });
    }
  });
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path3 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path2 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@db": path2.resolve(import.meta.dirname, "db"),
      "@": path2.resolve(import.meta.dirname, "client", "src"),
      "@shared": path2.resolve(import.meta.dirname, "shared"),
      "@assets": path2.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path2.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path2.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path3.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path3.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path3.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import cors from "cors";
import path4 from "path";
var app = express2();
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
var uploadsDir2 = path4.join(process.cwd(), "uploads");
app.use("/uploads", express2.static(uploadsDir2));
app.use((req, res, next) => {
  const start = Date.now();
  const path5 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path5.startsWith("/api")) {
      let logLine = `${req.method} ${path5} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`Error: ${message}`, err);
    res.status(status).json({ message });
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
