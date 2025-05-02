import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MessageItem } from "./message-item";
import { useWebSocket } from "@/lib/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatMessage, User } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  PaperclipIcon, 
  ImageIcon, 
  SendIcon, 
  PlusIcon, 
  UserPlusIcon, 
  UsersIcon,
  MoreVertical,
  Smile,
  Mic,
  CheckCircle,
  AlertCircle,
  Clock,
  Calendar,
  X,
  Search,
  ChevronLeft,
  Info,
  Phone,
  Video
} from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface EnhancedChatInterfaceProps {
  roomId: number;
  projectId: number;
}

export function EnhancedChatInterface({ roomId, projectId }: EnhancedChatInterfaceProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [createTaskDialogOpen, setCreateTaskDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssignee, setTaskAssignee] = useState<number | undefined>(undefined);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isProject, setIsProject] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // Fetch project tasks
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/projects', projectId, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch project tasks');
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
    if (!message.trim() && !attachmentName && !user) return;
    
    // Send message via WebSocket
    sendMessage('chat_message', {
      roomId,
      content: message.trim(),
      attachment: attachmentName
    });
    
    setMessage("");
    setAttachmentName(null);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Mock file upload - in a real app, you'd upload the file to the server
    setAttachmentName(file.name);
    toast({
      title: "File attached",
      description: `${file.name} is ready to send`,
    });
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const removeAttachment = () => {
    setAttachmentName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: any) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(taskData),
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

      // Clear form
      setTaskTitle("");
      setTaskDescription("");
      setTaskPriority("medium");
      setTaskDueDate("");
      setTaskAssignee(undefined);
      setCreateTaskDialogOpen(false);

      // Refresh task list
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'tasks'],
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
  
  const handleCreateTask = () => {
    if (!taskTitle.trim()) return;

    createTaskMutation.mutate({
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      status: 'todo',
      priority: taskPriority,
      projectId: projectId,
      createdBy: user!.id,
      assignedTo: taskAssignee,
      dueDate: taskDueDate ? new Date(taskDueDate).toISOString() : null,
    });
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
  
  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest(
        "DELETE", 
        `/api/projects/${projectId}/members/${userId}`
      );
      return response.ok ? null : response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'members'],
      });
      
      toast({
        title: "Member removed",
        description: "The member has been removed from the project.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove member",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleRemoveMember = (userId: number, username: string) => {
    if (confirm(`Are you sure you want to remove ${username}?`)) {
      removeMemberMutation.mutate(userId);
    }
  };

  const filteredMessages = searchQuery 
    ? messages?.filter((msg: ChatMessage & { user: User }) => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.user.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const formatDate = (date: string | Date) => {
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch (error) {
      return "";
    }
  };
  
  if (loadingRoom || loadingMessages) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      <div className="bg-card rounded-lg shadow-md overflow-hidden flex flex-col h-full border border-border">
        {/* Header */}
        <div className="bg-primary p-3 text-primary-foreground flex justify-between items-center">
          <div className="flex items-center">
            {isSearchActive && (
              <Button
                variant="ghost"
                size="sm"
                className="text-primary-foreground mr-2 h-8 w-8 p-0"
                onClick={() => {
                  setIsSearchActive(false);
                  setSearchQuery("");
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
            <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-xs font-medium">
              {room?.name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div className="ml-2">
              <h3 className="font-medium">{room?.name || "Chat Room"}</h3>
              <div className="text-xs opacity-80">
                {members?.length || 0} members • {project?.name || "Project"}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {!isSearchActive ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground h-8 w-8 p-0"
                        onClick={() => setIsSearchActive(true)}
                      >
                        <Search className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Search messages</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground h-8 w-8 p-0"
                      >
                        <Phone className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Voice call</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary-foreground h-8 w-8 p-0"
                      >
                        <Video className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Video call</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary-foreground h-8 w-8 p-0"
                        onClick={() => setMembersDialogOpen(true)}
                      >
                        <UsersIcon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Members</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary-foreground h-8 w-8 p-0"
                        onClick={() => setInfoDialogOpen(true)}
                      >
                        <Info className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Chat info</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <Input
                type="text"
                placeholder="Search in conversation..."
                className="h-8 bg-primary-dark text-primary-foreground border-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            )}
          </div>
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4" id="chat-messages">
            {filteredMessages?.length > 0 ? (
              filteredMessages.map((message: ChatMessage & { user: any }) => (
                <MessageItem key={message.id} message={message} currentUser={user} />
              ))
            ) : (
              <div className="text-center text-muted-foreground p-4">
                {searchQuery ? "No matching messages found." : "No messages yet. Start the conversation!"}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        {/* Attachment Preview */}
        {attachmentName && (
          <div className="px-4 py-2 bg-muted/30 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PaperclipIcon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{attachmentName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground"
                onClick={removeAttachment}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Input Area */}
        <div className="p-3 border-t border-border">
          <div className="relative">
            <Textarea
              placeholder="Type your message..."
              className="min-h-[60px] resize-none pr-10 py-3 rounded-lg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              onClick={handleSendMessage}
              className="absolute right-2 bottom-2 text-primary hover:text-primary-dark transition-colors h-8 w-8 p-0"
              size="sm"
              variant="ghost"
              disabled={!message.trim() && !attachmentName}
            >
              <SendIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex justify-between mt-2 px-2">
            <div className="flex space-x-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileInputChange}
              />
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      <Smile className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Emoji</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={handleFileButtonClick}
                    >
                      <PaperclipIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={handleFileButtonClick}
                    >
                      <ImageIcon className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Send image</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Voice message</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="text-xs bg-primary hover:bg-primary-dark text-primary-foreground px-2 py-1 h-8" size="sm">
                  <PlusIcon className="h-4 w-4 mr-1" /> Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setCreateTaskDialogOpen(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" /> Create Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setMembersDialogOpen(true)}>
                  <UserPlusIcon className="h-4 w-4 mr-2" /> Manage Members
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => window.open(`/projects/${projectId}`, '_blank')}>
                  <FolderIcon className="h-4 w-4 mr-2" /> Go to Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Create Task Dialog */}
      <Dialog open={createTaskDialogOpen} onOpenChange={setCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Add a new task to the project and assign team members.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="task-title">Task Title</Label>
              <Input
                id="task-title"
                placeholder="Enter task title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="task-description">Description (optional)</Label>
              <Textarea
                id="task-description"
                placeholder="Enter task description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task-priority">Priority</Label>
                <select
                  id="task-priority"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="task-due-date">Due Date (optional)</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="task-assignee">Assignee (optional)</Label>
              <select
                id="task-assignee"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={taskAssignee || ""}
                onChange={(e) => setTaskAssignee(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Unassigned</option>
                {members?.map((member: any) => (
                  <option key={member.user.id} value={member.user.id}>
                    {member.user.name || member.user.username}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateTaskDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTask}
              disabled={!taskTitle.trim() || createTaskMutation.isPending}
            >
              {createTaskMutation.isPending ? "Creating..." : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members Dialog */}
      <Dialog open={membersDialogOpen} onOpenChange={setMembersDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Project Members</DialogTitle>
            <DialogDescription>
              View, add, or remove members from this project
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="members" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="members">Current Members</TabsTrigger>
              <TabsTrigger value="invite" disabled={!isProject}>Add Member</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members" className="mt-4">
              {loadingMembers ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : members && members.length > 0 ? (
                <div className="space-y-4">
                  {members.map((member: any) => (
                    <div 
                      key={member.user.id} 
                      className="flex items-center justify-between p-3 bg-muted/40 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                          {member.user.name ? member.user.name.charAt(0).toUpperCase() : 
                           member.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">
                            {member.user.name || member.user.username}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.user.email || member.user.username}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-primary/20 text-primary rounded-full px-2 py-1">
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>
                        {isProject && member.user.id !== user?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => handleRemoveMember(member.user.id, member.user.username)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground p-8">
                  No members found in this project.
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="invite" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="username">Username</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="username"
                      placeholder="Enter username to add"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                    />
                    <Button 
                      onClick={handleAddMember}
                      disabled={!newUsername.trim() || addMemberMutation.isPending}
                    >
                      {addMemberMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Enter the username of the person you want to add to this project.
                  They must have an account on the platform.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Chat Info Dialog */}
      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chat Room Information</DialogTitle>
            <DialogDescription>
              Details and settings for this chat room
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center">
                <span className="text-3xl font-semibold text-primary-foreground">
                  {room?.name?.charAt(0).toUpperCase() || "C"}
                </span>
              </div>
              <h3 className="text-xl font-semibold">{room?.name || "Chat Room"}</h3>
              <p className="text-sm text-muted-foreground">
                Created on {formatDate(room?.createdAt || new Date())}
              </p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Project</h4>
              <div className="bg-muted/40 p-3 rounded-lg flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <FolderIcon className="h-5 w-5 text-primary" />
                  <span>{project?.name || "Project"}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => window.open(`/projects/${projectId}`, '_blank')}
                >
                  View
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Members ({members?.length || 0})</h4>
              <div className="flex flex-wrap gap-2">
                {loadingMembers ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : members && members.length > 0 ? (
                  members.slice(0, 5).map((member: any) => (
                    <div 
                      key={member.user.id} 
                      className="flex items-center gap-2 bg-muted/40 p-2 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                        {member.user.name ? member.user.name.charAt(0).toUpperCase() : 
                         member.user.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">
                        {member.user.name || member.user.username}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground">No members</span>
                )}
                {members && members.length > 5 && (
                  <div className="bg-muted/40 p-2 rounded-lg">
                    <span className="text-sm">+{members.length - 5} more</span>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => {
                  setInfoDialogOpen(false);
                  setMembersDialogOpen(true);
                }}
              >
                Manage Members
              </Button>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Related Tasks ({tasks?.length || 0})</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {loadingTasks ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : tasks && tasks.length > 0 ? (
                  tasks.slice(0, 3).map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex justify-between items-center bg-muted/40 p-2 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <StatusIcon status={task.status} />
                        <span className="text-sm">{task.title}</span>
                      </div>
                      <Badge 
                        variant={
                          task.priority === 'high' ? 'destructive' : 
                          task.priority === 'medium' ? 'default' : 
                          'secondary'
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <span className="text-muted-foreground">No tasks</span>
                )}
                {tasks && tasks.length > 3 && (
                  <div className="text-center text-sm text-muted-foreground">
                    {tasks.length - 3} more tasks
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full"
                onClick={() => window.open(`/tasks?projectId=${projectId}`, '_blank')}
              >
                View All Tasks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'todo':
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    case 'in_progress':
      <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
    </svg>
  );
}