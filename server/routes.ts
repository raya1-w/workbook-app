import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import path from "path";
import { projectUpload, chatUpload, getFileUrl } from "./file-uploads";

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
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(task.projectId, req.user!.id);
      if (!isMember) {
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
        const project = await storage.getProject(task.projectId);
        if (!project || project.createdBy !== req.user!.id) {
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
      
      // Check if user is a member of the project
      const isMember = await storage.isProjectMember(chatRoom.projectId, req.user!.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not authorized to view messages for this chat room' });
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
  
  return httpServer;
}
