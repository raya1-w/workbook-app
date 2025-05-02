import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MessageItem } from "./message-item";
import { useWebSocket } from "@/lib/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PaperclipIcon, ImageIcon, SendIcon, PlusIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ChatInterfaceProps {
  roomId: number;
  projectId: number;
}

export function ChatInterface({ roomId, projectId }: ChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [isProject, setIsProject] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { sendMessage, lastMessage } = useWebSocket();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch room details
  const { data: room, isLoading: loadingRoom } = useQuery({
    queryKey: ['/api/chat-rooms', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/${roomId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat room');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch messages
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['/api/chat-rooms', roomId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/${roomId}/messages`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch project details
  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ['/api/projects', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      
      return response.json();
    },
    enabled: !!projectId,
  });
  
  // Fetch project members
  const { data: members, isLoading: loadingMembers } = useQuery({
    queryKey: ['/api/projects', projectId, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project members');
      }
      
      return response.json();
    },
    enabled: !!projectId,
  });
  
  // Check if current user is project creator
  useEffect(() => {
    if (project && user) {
      setIsProject(project.createdBy === user.id ? project : null);
    }
  }, [project, user]);
  
  // Listen for new messages via WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'new_message') {
      const newMessage = lastMessage.payload as ChatMessage & { user: any };
      
      if (newMessage.roomId === roomId) {
        queryClient.setQueryData(
          ['/api/chat-rooms', roomId, 'messages'],
          (oldMessages: any[] = []) => [...oldMessages, newMessage]
        );
      }
    }
  }, [lastMessage, roomId, queryClient]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSendMessage = () => {
    if (!message.trim() || !user) return;
    
    // Send message via WebSocket
    sendMessage('chat_message', {
      roomId,
      content: message.trim(),
    });
    
    setMessage("");
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const createTaskMutation = useMutation({
    mutationFn: async (taskName: string) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          title: taskName,
          status: 'todo',
          priority: 'medium',
          projectId: projectId,
          createdBy: user!.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create task');
      }
      
      return response.json();
    },
    onSuccess: (task) => {
      toast({
        title: "Task created",
        description: `Task "${task.title}" created successfully`,
      });
      
      // Send a notification in the chat
      sendMessage('chat_message', {
        roomId,
        content: `I've created a new task: "${task.title}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const createProjectMutation = useMutation({
    mutationFn: async (projectName: string) => {
      const response = await fetch(`/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: projectName,
          createdBy: user!.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      return response.json();
    },
    onSuccess: (project) => {
      toast({
        title: "Project created",
        description: `Project "${project.name}" created successfully`,
      });
      
      // Send a notification in the chat
      sendMessage('chat_message', {
        roomId,
        content: `I've created a new project: "${project.name}"`,
      });
      
      // Refresh project list
      queryClient.invalidateQueries({
        queryKey: ['/api/projects'],
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleCreateTask = () => {
    const taskName = prompt("Enter task name:");
    if (taskName) {
      createTaskMutation.mutate(taskName);
    }
  };
  
  const handleCreateProject = () => {
    const projectName = prompt("Enter project name:");
    if (projectName) {
      createProjectMutation.mutate(projectName);
    }
  };
  
  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (username: string) => {
      const response = await apiRequest(
        "POST", 
        `/api/projects/${projectId}/members`, 
        { username, role: 'member' }
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'members'],
      });
      
      toast({
        title: "Member added",
        description: `User ${newUsername} has been added to the project.`,
      });
      
      // Send a notification in the chat
      sendMessage('chat_message', {
        roomId,
        content: `I've added ${newUsername} to the project.`,
      });
      
      setNewUsername("");
    },
    onError: (error) => {
      toast({
        title: "Failed to add member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddMember = () => {
    if (!newUsername.trim()) return;
    
    addMemberMutation.mutate(newUsername.trim());
  };
  
  if (loadingRoom || loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="bg-card rounded-lg shadow-md overflow-hidden flex flex-col h-full">
      <div className="bg-primary p-3 text-primary-foreground flex justify-between items-center">
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-xs font-medium">
            <MessageIcon />
          </div>
          <div className="ml-2">
            <h3 className="font-medium">{room?.name || "Chat Room"}</h3>
            <div className="text-xs opacity-80">Project Chat</div>
          </div>
        </div>
        <div className="flex">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary-foreground hover:text-primary-foreground/80 mr-1"
            onClick={() => setMembersDialogOpen(true)}
          >
            <UsersIcon className="h-5 w-5 mr-1" />
            <span className="text-xs">Members</span>
          </Button>
          <Button variant="ghost" size="sm" className="text-primary-foreground hover:text-primary-foreground/80">
            <InfoIcon className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-messages">
        {messages?.length > 0 ? (
          messages.map((message: ChatMessage & { user: any }) => (
            <MessageItem key={message.id} message={message} currentUser={user} />
          ))
        ) : (
          <div className="text-center text-muted-foreground p-4">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-3 border-t border-border">
        <div className="relative">
          <Input
            type="text"
            placeholder="Type your message..."
            className="pr-10 rounded-full"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            onClick={handleSendMessage}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-primary hover:text-primary-dark transition-colors h-8 w-8 p-0"
            size="sm"
            variant="ghost"
            disabled={!message.trim()}
          >
            <SendIcon className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex justify-between mt-2 px-2">
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <ImageIcon className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <PaperclipIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={handleCreateTask}
            >
              <TaskIcon className="h-4 w-4" />
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="text-xs bg-primary hover:bg-primary-dark text-primary-foreground px-2 py-1 h-8" size="sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCreateTask}>
                New Task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateProject}>
                New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function MessageIcon() {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
