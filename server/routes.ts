import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { projectUpload, chatUpload, getFileUrl } from "./file-uploads";

// Utility function to safely check project membership
async function safeCheckProjectMembership(projectId: number | null, userId: number): Promise<boolean> {
  if (projectId === null) return false;
  return storage.isProjectMember(projectId, userId);
}

interface WebSocketMessage {
  type: string;
  payload: any;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Active WebSocket connections with user IDs
  const clients = new Map<WebSocket, number>();

  wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString()) as WebSocketMessage;
        
        if (data.type === 'auth') {
          // Store user ID with the WebSocket connection
          clients.set(ws, data.payload.userId);
        } 
        else if (data.type === 'chat_message') {
          const userId = clients.get(ws);
          if (!userId) return;
          
          const { roomId, content } = data.payload;
          
          // Save the message to the database
          const newMessage = await storage.createChatMessage({
            roomId,
            userId,
            content,
          });
          
          // Broadcast to all clients in the room
          const messageData = {
            type: 'new_message',
            payload: newMessage
          };
          
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify(messageData));
            }
          });
        }
        else if (data.type === 'task_update') {
          // Broadcast task updates to all connected clients
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'task_updated',
                payload: data.payload
              }));
            }
          });
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Projects API
  app.get('/api/projects', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projects = await storage.getUserProjects(req.user!.id);
      res.json(projects);
    } catch (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ message: 'Error fetching projects' });
    }
  });
  
  app.post('/api/projects', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const project = await storage.createProject({
        ...req.body,
        createdBy: req.user!.id
      });
      
      // Create a default chat room for the project
      await storage.createChatRoom({
        name: 'General',
        projectId: project.id,
        createdBy: req.user!.id
      });
      
      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ message: 'Error creating project' });
    }
  });
  
  app.get('/api/projects/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view this project' });
      }
      
      res.json(project);
    } catch (error) {
      console.error('Error fetching project:', error);
      res.status(500).json({ message: 'Error fetching project' });
    }
  });
  
  app.put('/api/projects/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Only the creator can update the project
      if (project.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to update this project' });
      }
      
      const updatedProject = await storage.updateProject(projectId, req.body);
      res.json(updatedProject);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ message: 'Error updating project' });
    }
  });
  
  app.delete('/api/projects/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Only the creator can delete the project
      if (project.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to delete this project' });
      }
      
      await storage.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ message: 'Error deleting project' });
    }
  });
  
  // Project Members API
  app.get('/api/projects/:id/members', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view this project' });
      }
      
      const members = await storage.getProjectMembers(projectId);
      res.json(members);
    } catch (error) {
      console.error('Error fetching project members:', error);
      res.status(500).json({ message: 'Error fetching project members' });
    }
  });
  
  app.post('/api/projects/:id/members', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Only the creator can add members
      if (project.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to add members to this project' });
      }
      
      const { username, role } = req.body;
      const userToAdd = await storage.getUserByUsername(username);
      
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is already a member
      const isMember = await storage.isProjectMember(projectId, userToAdd.id);
      if (isMember) {
        return res.status(400).json({ message: 'User is already a member of this project' });
      }
      
      const member = await storage.addProjectMember({
        projectId,
        userId: userToAdd.id,
        role: role || 'member'
      });
      
      // Create notification for the added user
      await storage.createNotification({
        userId: userToAdd.id,
        content: `You have been added to project "${project.name}"`,
        type: 'project_invitation',
        relatedId: projectId
      });
      
      res.status(201).json(member);
    } catch (error) {
      console.error('Error adding project member:', error);
      res.status(500).json({ message: 'Error adding project member' });
    }
  });
  
  app.delete('/api/projects/:projectId/members/:userId', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.projectId);
      const userId = parseInt(req.params.userId);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
      
      // Only the creator can remove members, or users can remove themselves
      if (project.createdBy !== req.user!.id && userId !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to remove members from this project' });
      }
      
      await storage.removeProjectMember(projectId, userId);
      res.status(204).send();
    } catch (error) {
      console.error('Error removing project member:', error);
      res.status(500).json({ message: 'Error removing project member' });
    }
  });
  
  // Tasks API
  app.get('/api/projects/:id/tasks', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view tasks for this project' });
      }
      
      const tasks = await storage.getProjectTasks(projectId);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ message: 'Error fetching tasks' });
    }
  });
  
  app.post('/api/projects/:id/tasks', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to create tasks for this project' });
      }
      
      const task = await storage.createTask({
        ...req.body,
        projectId,
        createdBy: req.user!.id
      });
      
      // If the task is assigned to someone, create a notification
      if (task.assignedTo && task.assignedTo !== req.user!.id) {
        await storage.createNotification({
          userId: task.assignedTo,
          content: `You have been assigned a new task: ${task.title}`,
          type: 'task_assignment',
          relatedId: task.id
        });
      }
      
      res.status(201).json(task);
      
      // Broadcast task creation to all connected WebSocket clients
      const taskData = {
        type: 'task_created',
        payload: task
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ message: 'Error creating task' });
    }
  });
  
  app.put('/api/tasks/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is a member of the project (if task has a project)
      const isMember = await safeCheckProjectMembership(task.projectId, req.user!.id);
      if (!isMember && task.projectId !== null) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      
      const previousAssignee = task.assignedTo;
      const updatedTask = await storage.updateTask(taskId, req.body);
      
      if (!updatedTask) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // If assignment changed, create a notification
      if (updatedTask.assignedTo && 
          updatedTask.assignedTo !== previousAssignee && 
          updatedTask.assignedTo !== req.user!.id) {
        await storage.createNotification({
          userId: updatedTask.assignedTo,
          content: `You have been assigned a task: ${updatedTask.title}`,
          type: 'task_assignment',
          relatedId: updatedTask.id
        });
      }
      
      res.json(updatedTask);
      
      // Broadcast task update to all connected WebSocket clients
      const taskData = {
        type: 'task_updated',
        payload: updatedTask
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ message: 'Error updating task' });
    }
  });
  
  app.delete('/api/tasks/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Only the creator or project admin can delete tasks
      if (task.createdBy !== req.user!.id) {
        // If this is a project task, check if user is project admin
        if (task.projectId !== null) {
          const project = await storage.getProject(task.projectId);
          if (!project || project.createdBy !== req.user!.id) {
            return res.status(403).json({ message: 'Not authorized to delete this task' });
          }
        } else {
          // For personal tasks, only the creator can delete
          return res.status(403).json({ message: 'Not authorized to delete this task' });
        }
      }
      
      await storage.deleteTask(taskId);
      res.status(204).send();
      
      // Broadcast task deletion to all connected WebSocket clients
      const taskData = {
        type: 'task_deleted',
        payload: { taskId }
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ message: 'Error deleting task' });
    }
  });
  
  // Chat Rooms API
  app.get('/api/projects/:id/chat-rooms', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view chat rooms for this project' });
      }
      
      const chatRooms = await storage.getProjectChatRooms(projectId);
      res.json(chatRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      res.status(500).json({ message: 'Error fetching chat rooms' });
    }
  });
  
  app.post('/api/projects/:id/chat-rooms', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to create chat rooms for this project' });
      }
      
      const chatRoom = await storage.createChatRoom({
        ...req.body,
        projectId,
        createdBy: req.user!.id
      });
      
      res.status(201).json(chatRoom);
    } catch (error) {
      console.error('Error creating chat room:', error);
      res.status(500).json({ message: 'Error creating chat room' });
    }
  });
  
  // Direct Messaging API
  app.get('/api/direct-messages', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const userId = req.user!.id;
      const directChats = await storage.getUserDirectChats(userId);
      res.json(directChats);
    } catch (error) {
      console.error('Error fetching direct chats:', error);
      res.status(500).json({ message: 'Error fetching direct chats' });
    }
  });
  
  app.post('/api/direct-messages/create', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const { recipientId } = req.body;
    
    if (!recipientId) {
      return res.status(400).json({ message: 'Recipient ID is required' });
    }
    
    try {
      const room = await storage.createDirectChatRoom(userId, parseInt(recipientId));
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating direct message room:', error);
      res.status(500).json({ message: 'Failed to create direct message room' });
    }
  });
  
  app.get('/api/direct-messages/:roomId/participants', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { roomId } = req.params;
    
    try {
      const participants = await storage.getChatRoomParticipants(parseInt(roomId));
      res.json(participants);
    } catch (error) {
      console.error('Error fetching chat room participants:', error);
      res.status(500).json({ message: 'Failed to fetch participants' });
    }
  });
  
  // Get chat room participants (generic route for all chat rooms)
  app.get('/api/chat-rooms/:roomId/participants', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const roomId = parseInt(req.params.roomId);
    
    try {
      // Verify the chat room exists
      const chatRoom = await storage.getChatRoom(roomId);
      
      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      
      // Check authorization
      if (chatRoom.projectId) {
        // For project chat rooms, check if user is a project member
        const isMember = await storage.isProjectMember(chatRoom.projectId, userId);
        
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to view participants for this chat room' });
        }
      } else if (chatRoom.isDirectMessage) {
        // For direct messages, check if user is a participant
        const currentParticipants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = currentParticipants.some(p => p.user.id === userId);
        
        if (!isParticipant) {
          return res.status(403).json({ message: 'Not authorized to view participants for this chat room' });
        }
      }
      
      // Get participants
      const participants = await storage.getChatRoomParticipants(roomId);
      res.json(participants);
    } catch (error) {
      console.error('Error fetching chat room participants:', error);
      res.status(500).json({ message: 'Failed to fetch participants' });
    }
  });
  
  // Add participant to chat room
  app.post('/api/chat-rooms/:roomId/participants', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const roomId = parseInt(req.params.roomId);
    const { participantId } = req.body;
    
    if (!participantId) {
      return res.status(400).json({ message: 'Participant ID is required' });
    }
    
    try {
      // Get chat room details
      const chatRoom = await storage.getChatRoom(roomId);
      
      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      
      // Check authorization
      if (chatRoom.isDirectMessage) {
        // For direct messages, only participants can add others
        const participants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = participants.some(p => p.user.id === userId);
        
        if (!isParticipant) {
          return res.status(403).json({ message: 'Not authorized to add participants to this chat' });
        }
      } else if (chatRoom.projectId) {
        // For project chat rooms, only project members can add participants
        const isMember = await storage.isProjectMember(chatRoom.projectId, userId);
        
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to add participants to this chat room' });
        }
        
        // Make sure the user being added is also a project member
        const isParticipantProjectMember = await storage.isProjectMember(chatRoom.projectId, parseInt(participantId));
        
        if (!isParticipantProjectMember) {
          return res.status(400).json({ message: 'Cannot add non-project member to project chat room' });
        }
      }
      
      // Add participant to chat room
      const participant = await storage.addChatRoomParticipant({
        roomId,
        userId: parseInt(participantId)
      });
      
      res.status(201).json(participant);
    } catch (error) {
      console.error('Error adding participant to chat room:', error);
      res.status(500).json({ message: 'Failed to add participant to chat room' });
    }
  });
  
  app.get('/api/direct-messages/:roomId/files', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const { roomId } = req.params;
    
    try {
      const files = await storage.getChatRoomFiles(parseInt(roomId));
      res.json(files);
    } catch (error) {
      console.error('Error fetching chat room files:', error);
      res.status(500).json({ message: 'Failed to fetch files' });
    }
  });
  
  app.post('/api/direct-messages/:roomId/files', chatUpload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    const { roomId } = req.params;
    const { messageId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    try {
      const chatRoom = await storage.getChatRoom(parseInt(roomId));
      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      
      // Check if user is a participant in this direct message
      const participants = await storage.getChatRoomParticipants(parseInt(roomId));
      const isParticipant = participants.some(p => p.user.id === userId);
      
      if (!isParticipant) {
        return res.status(403).json({ message: 'Not authorized to upload files to this chat' });
      }
      
      // Create a chat file record
      const chatFile = await storage.createChatFile({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        messageId: parseInt(messageId),
        roomId: parseInt(roomId),
        uploadedBy: userId,
      });
      
      // Return file info with URL
      res.status(201).json({
        ...chatFile,
        url: getFileUrl(req.file.path),
      });
    } catch (error) {
      console.error('Error uploading chat file:', error);
      res.status(500).json({ message: 'Failed to upload file' });
    }
  });
  
  // Search users by username - this needs to be BEFORE the more general /api/users route!
  app.get('/api/users/search', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const username = req.query.username as string;
    
    if (!username) {
      return res.status(400).json({ message: 'Username parameter is required' });
    }
    
    try {
      const user = await storage.getUserByUsername(username);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Don't return password
      const { password, ...userData } = user;
      
      res.json(userData);
    } catch (error) {
      console.error('Error searching for user:', error);
      res.status(500).json({ message: 'Failed to search for user' });
    }
  });
  
  // Get all users for direct messaging (exclude current user)
  app.get('/api/users', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userId = req.user!.id;
    
    try {
      // Get all users from projects the current user is a member of
      const projects = await storage.getUserProjects(userId);
      const projectMembers = [];
      
      for (const project of projects) {
        const members = await storage.getProjectMembers(project.id);
        projectMembers.push(...members.map(member => member.user));
      }
      
      // Remove duplicates and current user
      const uniqueUsers = Array.from(
        new Map(projectMembers.map(user => [user.id, user]))
          .values()
      ).filter(user => user.id !== userId);
      
      res.json(uniqueUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // Chat Messages API
  app.get('/api/chat-rooms/:id/messages', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const roomId = parseInt(req.params.id);
      const chatRoom = await storage.getChatRoom(roomId);
      
      if (!chatRoom) {
        return res.status(404).json({ message: 'Chat room not found' });
      }
      
      // If it's a project chat room, check membership
      if (chatRoom.projectId && !chatRoom.isDirectMessage) {
        const isMember = await storage.isProjectMember(chatRoom.projectId, req.user!.id);
        if (!isMember) {
          return res.status(403).json({ message: 'Not authorized to view messages for this chat room' });
        }
      } else if (chatRoom.isDirectMessage) {
        // For direct messages, check if user is a participant
        const participants = await storage.getChatRoomParticipants(roomId);
        const isParticipant = participants.some(p => p.user.id === req.user!.id);
        if (!isParticipant) {
          return res.status(403).json({ message: 'Not authorized to view messages for this chat room' });
        }
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const messages = await storage.getChatMessages(roomId, limit);
      res.json(messages);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      res.status(500).json({ message: 'Error fetching chat messages' });
    }
  });
  
  // Notifications API
  app.get('/api/notifications', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const notifications = await storage.getUserNotifications(req.user!.id);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ message: 'Error fetching notifications' });
    }
  });
  
  // Time Tracking API
  app.post('/api/tasks/:id/track/start', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is assigned to the task or created it
      if (task.assignedTo !== req.user!.id && task.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to track time for this task' });
      }
      
      // Check if task is already being tracked
      if (task.currentlyTracking) {
        return res.status(400).json({ message: 'Task is already being tracked' });
      }
      
      // Update task with tracking info
      const updatedTask = await storage.updateTask(taskId, {
        currentlyTracking: true,
        trackingStartedAt: new Date(),
      });
      
      res.json(updatedTask);
      
      // Broadcast task update to all connected WebSocket clients
      const taskData = {
        type: 'task_tracking_started',
        payload: updatedTask
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error('Error starting time tracking:', error);
      res.status(500).json({ message: 'Error starting time tracking' });
    }
  });
  
  app.post('/api/tasks/:id/track/stop', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Check if user is assigned to the task or created it
      if (task.assignedTo !== req.user!.id && task.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to track time for this task' });
      }
      
      // Check if task is being tracked
      if (!task.currentlyTracking || !task.trackingStartedAt) {
        return res.status(400).json({ message: 'Task is not being tracked' });
      }
      
      // Calculate minutes spent
      const startTime = new Date(task.trackingStartedAt);
      const endTime = new Date();
      const minutesSpent = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      // Update total tracked minutes
      const totalTrackedMinutes = (task.totalTrackedMinutes || 0) + minutesSpent;
      
      // Update task with tracking info
      const updatedTask = await storage.updateTask(taskId, {
        currentlyTracking: false,
        trackingStartedAt: null,
        totalTrackedMinutes,
      });
      
      res.json(updatedTask);
      
      // Broadcast task update to all connected WebSocket clients
      const taskData = {
        type: 'task_tracking_stopped',
        payload: updatedTask
      };
      
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(taskData));
        }
      });
    } catch (error) {
      console.error('Error stopping time tracking:', error);
      res.status(500).json({ message: 'Error stopping time tracking' });
    }
  });
  
  app.put('/api/notifications/:id/read', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const notificationId = parseInt(req.params.id);
      await storage.markNotificationAsRead(notificationId);
      res.status(204).send();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ message: 'Error marking notification as read' });
    }
  });
  
  // User Tasks API
  app.get('/api/user/tasks', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const tasks = await storage.getUserTasks(req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching user tasks:', error);
      res.status(500).json({ message: 'Error fetching user tasks' });
    }
  });
  
  // Personal Tasks API (not associated with projects)
  app.get('/api/personal-tasks', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const tasks = await storage.getPersonalTasks(req.user!.id);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching personal tasks:', error);
      res.status(500).json({ message: 'Error fetching personal tasks' });
    }
  });
  
  app.post('/api/personal-tasks', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      // Format date properly if it exists
      const taskData = { ...req.body };
      
      // Handle date formatting - ensure it's a valid Date object
      if (taskData.dueDate) {
        try {
          // If it's already a valid date string, leave it as is
          // Otherwise, make sure it's in a proper format
          const dueDate = new Date(taskData.dueDate);
          if (!isNaN(dueDate.getTime())) {
            taskData.dueDate = dueDate;
          } else {
            taskData.dueDate = null;
          }
        } catch (e) {
          // If date parsing fails, set to null
          taskData.dueDate = null;
        }
      }
      
      const task = await storage.createTask({
        ...taskData,
        projectId: null, // Personal tasks have no project
        createdBy: req.user!.id,
        assignedTo: req.user!.id // Personal tasks are assigned to the creator
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error creating personal task:', error);
      res.status(500).json({ message: 'Error creating personal task' });
    }
  });
  
  // Update a personal task
  app.put('/api/personal-tasks/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Verify this is a personal task and belongs to the user
      if (task.projectId !== null || task.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to update this task' });
      }
      
      // Format date properly if it exists
      const taskData = { ...req.body };
      
      // Handle date formatting - ensure it's a valid Date object
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
      console.error('Error updating personal task:', error);
      res.status(500).json({ message: 'Error updating personal task' });
    }
  });
  
  // Delete a personal task
  app.delete('/api/personal-tasks/:id', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }
      
      // Verify this is a personal task and belongs to the user
      if (task.projectId !== null || task.createdBy !== req.user!.id) {
        return res.status(403).json({ message: 'Not authorized to delete this task' });
      }
      
      await storage.deleteTask(taskId);
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting personal task:', error);
      res.status(500).json({ message: 'Error deleting personal task' });
    }
  });
  
  // File Uploads API
  app.post('/api/projects/:projectId/files', projectUpload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project exists and user is a member
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to upload files to this project' });
      }
      
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      
      // Create file record in database
      const projectFile = await storage.createProjectFile({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        filePath: req.file.path,
        projectId,
        uploadedBy: req.user!.id,
        description: req.body.description || null,
      });
      
      // Generate URL for the file
      const fileUrl = getFileUrl(req.file.path);
      
      // Create a notification for project members
      const projectMembers = await storage.getProjectMembers(projectId);
      const project = await storage.getProject(projectId);
      
      // Create notifications for all project members except the uploader
      const notifications = projectMembers
        .filter(member => member.userId !== req.user!.id)
        .map(member => storage.createNotification({
          userId: member.userId,
          content: `New file "${req.file!.originalname}" uploaded to project "${project!.name}"`,
          type: 'file_upload',
          relatedId: projectFile.id,
        }));
      
      await Promise.all(notifications);
      
      res.status(201).json({
        ...projectFile,
        url: fileUrl,
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      res.status(500).json({ message: 'Error uploading file' });
    }
  });
  
  app.get('/api/projects/:projectId/files', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Verify project exists and user is a member
      const isMember = await storage.isProjectMember(projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view files for this project' });
      }
      
      // Get files for this project
      const files = await storage.getProjectFiles(projectId);
      
      // Add URL to each file
      const filesWithUrls = files.map(file => ({
        ...file,
        url: getFileUrl(file.filePath),
      }));
      
      res.json(filesWithUrls);
    } catch (error) {
      console.error('Error fetching project files:', error);
      res.status(500).json({ message: 'Error fetching project files' });
    }
  });
  
  app.delete('/api/projects/:projectId/files/:fileId', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const projectId = parseInt(req.params.projectId);
      const fileId = parseInt(req.params.fileId);
      
      // Get the file record
      const file = await storage.getProjectFile(fileId);
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Verify the file belongs to the specified project
      if (file.projectId !== projectId) {
        return res.status(400).json({ message: 'File does not belong to this project' });
      }
      
      // Verify user is a project member with admin role or the file uploader
      const project = await storage.getProject(projectId);
      const member = (await storage.getProjectMembers(projectId))
        .find(m => m.userId === req.user!.id);
        
      if (!member) {
        return res.status(403).json({ message: 'Not authorized to delete files from this project' });
      }
      
      const isAdmin = member.role === 'admin';
      const isUploader = file.uploadedBy === req.user!.id;
      const isCreator = project!.createdBy === req.user!.id;
      
      if (!isAdmin && !isUploader && !isCreator) {
        return res.status(403).json({ message: 'Not authorized to delete this file' });
      }
      
      // Delete the file from storage
      if (file.filePath) {
        try {
          fs.unlinkSync(file.filePath);
        } catch (err) {
          console.error('Error deleting file from disk:', err);
          // Continue even if physical file deletion fails
        }
      }
      
      // Delete the file record from database
      await storage.deleteProjectFile(fileId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(500).json({ message: 'Error deleting file' });
    }
  });
  
  return httpServer;
}
