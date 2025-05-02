import { db } from "@db";
import { 
  users, User, UserInsert, 
  projects, Project, ProjectInsert, 
  projectMembers, ProjectMember, ProjectMemberInsert,
  tasks, Task, TaskInsert,
  chatRooms, ChatRoom, ChatRoomInsert,
  chatMessages, ChatMessage, ChatMessageInsert,
  notifications, Notification, NotificationInsert,
  projectFiles, ProjectFile, ProjectFileInsert,
} from "@shared/schema";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import session from "express-session";
import { pool } from "@db";

// Using memory store instead of PostgreSQL for sessions to avoid setup issues
import createMemoryStore from "memorystore";
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: UserInsert): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;

  // Projects
  getProject(id: number): Promise<Project | undefined>;
  getUserProjects(userId: number): Promise<(Project & { memberCount: number })[]>;
  createProject(project: ProjectInsert): Promise<Project>;
  updateProject(id: number, project: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<void>;

  // Project Members
  getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]>;
  isProjectMember(projectId: number, userId: number): Promise<boolean>;
  addProjectMember(member: ProjectMemberInsert): Promise<ProjectMember>;
  removeProjectMember(projectId: number, userId: number): Promise<void>;
  
  // Tasks
  getTask(id: number): Promise<Task | undefined>;
  getProjectTasks(projectId: number): Promise<(Task & { assignee?: User })[]>;
  getUserTasks(userId: number): Promise<(Task & { project: Project })[]>;
  getPersonalTasks(userId: number): Promise<Task[]>;
  createTask(task: TaskInsert): Promise<Task>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<void>;
  
  // Chat Rooms
  getChatRoom(id: number): Promise<ChatRoom | undefined>;
  getProjectChatRooms(projectId: number): Promise<ChatRoom[]>;
  createChatRoom(room: ChatRoomInsert): Promise<ChatRoom>;
  
  // Chat Messages
  getChatMessages(roomId: number, limit?: number): Promise<(ChatMessage & { user: User })[]>;
  createChatMessage(message: ChatMessageInsert): Promise<ChatMessage & { user: User }>;
  
  // Notifications
  getUserNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: NotificationInsert): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  
  // Project Files
  getProjectFile(id: number): Promise<ProjectFile | undefined>;
  getProjectFiles(projectId: number): Promise<(ProjectFile & { uploader: User })[]>;
  createProjectFile(file: ProjectFileInsert): Promise<ProjectFile>;
  deleteProjectFile(id: number): Promise<void>;
  
  // Session Store
  sessionStore: session.Store;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0];
  }

  async createUser(user: UserInsert): Promise<User> {
    const created = await db.insert(users).values(user).returning();
    return created[0];
  }

  async updateUser(id: number, user: Partial<User>): Promise<User | undefined> {
    const updated = await db.update(users)
      .set({...user, updatedAt: new Date()})
      .where(eq(users.id, id))
      .returning();
    return updated[0];
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getUserProjects(userId: number): Promise<(Project & { memberCount: number })[]> {
    const memberProjects = await db
      .select({
        project: projects,
        memberCount: sql<number>`count(${projectMembers.userId})::int`,
      })
      .from(projects)
      .innerJoin(
        projectMembers,
        eq(projects.id, projectMembers.projectId)
      )
      .where(
        or(
          eq(projects.createdBy, userId),
          eq(projectMembers.userId, userId)
        )
      )
      .groupBy(projects.id)
      .orderBy(desc(projects.createdAt));

    return memberProjects.map(({ project, memberCount }) => ({
      ...project,
      memberCount,
    }));
  }

  async createProject(project: ProjectInsert): Promise<Project> {
    const created = await db.insert(projects).values(project).returning();
    
    // Add creator as a member with role 'admin'
    await db.insert(projectMembers).values({
      projectId: created[0].id,
      userId: created[0].createdBy,
      role: 'admin'
    });
    
    return created[0];
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project | undefined> {
    const updated = await db.update(projects)
      .set({...project, updatedAt: new Date()})
      .where(eq(projects.id, id))
      .returning();
    return updated[0];
  }

  async deleteProject(id: number): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Project Members methods
  async getProjectMembers(projectId: number): Promise<(ProjectMember & { user: User })[]> {
    const members = await db
      .select({
        member: projectMembers,
        user: users,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, projectId));

    return members.map(({ member, user }) => ({
      ...member,
      user,
    }));
  }

  async isProjectMember(projectId: number, userId: number): Promise<boolean> {
    const member = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      )
      .limit(1);
    
    return member.length > 0;
  }

  async addProjectMember(member: ProjectMemberInsert): Promise<ProjectMember> {
    const created = await db.insert(projectMembers).values(member).returning();
    return created[0];
  }

  async removeProjectMember(projectId: number, userId: number): Promise<void> {
    await db.delete(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.userId, userId)
        )
      );
  }

  // Task methods
  async getTask(id: number): Promise<Task | undefined> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
    return result[0];
  }

  async getProjectTasks(projectId: number): Promise<(Task & { assignee?: User })[]> {
    const taskData = await db
      .select({
        task: tasks,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(
        users,
        eq(tasks.assignedTo, users.id)
      )
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.updatedAt));

    return taskData.map(({ task, assignee }) => ({
      ...task,
      assignee: assignee || undefined,
    }));
  }

  async getUserTasks(userId: number): Promise<(Task & { project: Project })[]> {
    const taskData = await db
      .select({
        task: tasks,
        project: projects,
      })
      .from(tasks)
      .innerJoin(
        projects,
        eq(tasks.projectId, projects.id)
      )
      .where(eq(tasks.assignedTo, userId))
      .orderBy(desc(tasks.updatedAt));

    return taskData.map(({ task, project }) => ({
      ...task,
      project,
    }));
  }
  
  async getPersonalTasks(userId: number): Promise<Task[]> {
    // Get tasks where projectId is null and created by the user
    // These are personal tasks not associated with any project
    return db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.createdBy, userId),
          sql`${tasks.projectId} IS NULL`
        )
      )
      .orderBy(desc(tasks.updatedAt));
  }

  async createTask(task: TaskInsert): Promise<Task> {
    const created = await db.insert(tasks).values(task).returning();
    return created[0];
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task | undefined> {
    const updated = await db.update(tasks)
      .set({...task, updatedAt: new Date()})
      .where(eq(tasks.id, id))
      .returning();
    return updated[0];
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Chat Room methods
  async getChatRoom(id: number): Promise<ChatRoom | undefined> {
    const result = await db.select().from(chatRooms).where(eq(chatRooms.id, id)).limit(1);
    return result[0];
  }

  async getProjectChatRooms(projectId: number): Promise<ChatRoom[]> {
    return db
      .select()
      .from(chatRooms)
      .where(eq(chatRooms.projectId, projectId))
      .orderBy(chatRooms.createdAt);
  }

  async createChatRoom(room: ChatRoomInsert): Promise<ChatRoom> {
    const created = await db.insert(chatRooms).values(room).returning();
    return created[0];
  }

  // Chat Message methods
  async getChatMessages(roomId: number, limit: number = 50): Promise<(ChatMessage & { user: User })[]> {
    const messages = await db
      .select({
        message: chatMessages,
        user: users,
      })
      .from(chatMessages)
      .innerJoin(users, eq(chatMessages.userId, users.id))
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(chatMessages.createdAt)
      .limit(limit);

    return messages.map(({ message, user }) => ({
      ...message,
      user,
    }));
  }

  async createChatMessage(message: ChatMessageInsert): Promise<ChatMessage & { user: User }> {
    const created = await db.insert(chatMessages).values(message).returning();
    const user = await this.getUser(message.userId);
    return { ...created[0], user: user! };
  }

  // Notification methods
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notification: NotificationInsert): Promise<Notification> {
    const created = await db.insert(notifications).values(notification).returning();
    return created[0];
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }
  
  // Project Files methods
  async getProjectFile(id: number): Promise<ProjectFile | undefined> {
    const result = await db.select().from(projectFiles).where(eq(projectFiles.id, id)).limit(1);
    return result[0];
  }
  
  async getProjectFiles(projectId: number): Promise<(ProjectFile & { uploader: User })[]> {
    const files = await db
      .select({
        file: projectFiles,
        uploader: users,
      })
      .from(projectFiles)
      .innerJoin(users, eq(projectFiles.uploadedBy, users.id))
      .where(eq(projectFiles.projectId, projectId))
      .orderBy(desc(projectFiles.createdAt));
    
    return files.map(({ file, uploader }) => ({
      ...file,
      uploader,
    }));
  }
  
  async createProjectFile(file: ProjectFileInsert): Promise<ProjectFile> {
    const created = await db.insert(projectFiles).values(file).returning();
    return created[0];
  }
  
  async deleteProjectFile(id: number): Promise<void> {
    await db.delete(projectFiles).where(eq(projectFiles.id, id));
  }
}

// Export an instance of the storage
export const storage = new DatabaseStorage();
