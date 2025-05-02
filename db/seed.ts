import { db } from "./index";
import * as schema from "@shared/schema";
import { hashPassword } from "../server/auth";

async function seed() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if we already have users
    const existingUsers = await db.select().from(schema.users);
    if (existingUsers.length > 0) {
      console.log("Database already has users, skipping seeding to avoid duplicates.");
      console.log(`Found ${existingUsers.length} existing users.`);
      return;
    }

    // Create test users
    const hashedPassword = await hashPassword("password123");
    
    const userGalahad = await db.insert(schema.users).values({
      username: "galahad",
      email: "galahad@camelot.com",
      password: hashedPassword,
      name: "Sir Galahad",
      profileImage: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const userMorgan = await db.insert(schema.users).values({
      username: "morgan",
      email: "morgan@example.com",
      password: hashedPassword,
      name: "Morgan",
      profileImage: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?ixlib=rb-1.2.1&auto=format&fit=crop&w=50&q=80",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const userAria = await db.insert(schema.users).values({
      username: "aria",
      email: "aria@example.com",
      password: hashedPassword,
      name: "Aria",
      profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=50&q=80",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const userMerlin = await db.insert(schema.users).values({
      username: "merlin",
      email: "merlin@example.com",
      password: hashedPassword,
      name: "Merlin",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    console.log("👥 Created test users");

    // Create a project
    const fantasyProject = await db.insert(schema.projects).values({
      name: "Fantasy Project",
      description: "A collaborative project for fantasy game development",
      createdBy: userGalahad[0].id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    // Add members to the project
    await db.insert(schema.projectMembers).values([
      {
        projectId: fantasyProject[0].id,
        userId: userGalahad[0].id,
        role: "admin",
        addedAt: new Date(),
      },
      {
        projectId: fantasyProject[0].id,
        userId: userMorgan[0].id,
        role: "member",
        addedAt: new Date(),
      },
      {
        projectId: fantasyProject[0].id,
        userId: userAria[0].id,
        role: "member",
        addedAt: new Date(),
      },
      {
        projectId: fantasyProject[0].id,
        userId: userMerlin[0].id,
        role: "member",
        addedAt: new Date(),
      },
    ]);

    console.log("📁 Created project with members");

    // Create tasks
    const tasks = [
      {
        title: "Create wizard character",
        description: "Design the main protagonist for the new project",
        status: "todo" as const,
        priority: "high" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userAria[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Sketch dungeon map",
        description: "Create layout for the first level",
        status: "todo" as const,
        priority: "medium" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userMorgan[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Create spell animations",
        description: "Design fire and ice spell effects",
        status: "todo" as const,
        priority: "medium" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userGalahad[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Enemy behavior scripts",
        description: "Program AI for dragon boss fight",
        status: "in_progress" as const,
        priority: "high" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userMorgan[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Quest dialogue writing",
        description: "Write NPC interactions for main story",
        status: "in_progress" as const,
        priority: "medium" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userMerlin[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "Character concept art",
        description: "Create initial sketches for main heroes",
        status: "completed" as const,
        priority: "high" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userAria[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        title: "World map design",
        description: "Create overworld map with key locations",
        status: "completed" as const,
        priority: "medium" as const,
        projectId: fantasyProject[0].id,
        assignedTo: userGalahad[0].id,
        createdBy: userGalahad[0].id,
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    await db.insert(schema.tasks).values(tasks);
    console.log("✅ Created tasks");

    // Create chat room
    const chatRoom = await db.insert(schema.chatRooms).values({
      name: "Fantasy Project Team",
      projectId: fantasyProject[0].id,
      createdBy: userGalahad[0].id,
      createdAt: new Date(),
    }).returning();

    // Add chat messages
    const messages = [
      {
        content: "I've started working on the dragon boss AI, but I need more information on how it should behave in the second phase.",
        roomId: chatRoom[0].id,
        userId: userMorgan[0].id,
        createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        content: "In the second phase, the dragon should start using area-of-effect attacks and summon minions. I'll send you the detailed design document.",
        roomId: chatRoom[0].id,
        userId: userGalahad[0].id,
        createdAt: new Date(Date.now() - 25 * 60 * 1000), // 25 minutes ago
      },
      {
        content: "I've finished the concept art for the main characters. Here's the link to view them:",
        roomId: chatRoom[0].id,
        userId: userAria[0].id,
        createdAt: new Date(Date.now() - 20 * 60 * 1000), // 20 minutes ago
        attachment: "character_concepts_v1.zip",
      },
      {
        content: "These look amazing, Aria! I'm working on the dialogue for these characters. Can we schedule a quick call to discuss their personalities in more detail?",
        roomId: chatRoom[0].id,
        userId: userMerlin[0].id,
        createdAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      },
    ];

    await db.insert(schema.chatMessages).values(messages);
    console.log("💬 Created chat room and messages");

    // Create notifications
    const notifications = [
      {
        userId: userMorgan[0].id,
        content: "You have been assigned a new task: Enemy behavior scripts",
        type: "task_assignment",
        relatedId: 4, // Task ID
        read: false,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
      },
      {
        userId: userAria[0].id,
        content: "Your task 'Character concept art' has been marked as completed",
        type: "task_status",
        relatedId: 6, // Task ID
        read: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: userMerlin[0].id,
        content: "You have been added to project 'Fantasy Project'",
        type: "project_invitation",
        relatedId: fantasyProject[0].id,
        read: false,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      },
    ];

    await db.insert(schema.notifications).values(notifications);
    console.log("🔔 Created notifications");

    console.log("✅ Database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  }
}

seed();
