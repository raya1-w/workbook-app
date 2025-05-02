import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import DirectChatInterface from "@/components/chat/direct-chat-interface";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  Plus, MessageSquare, MessagesSquare, Users, Search, X, 
  User, UserPlus, Loader2
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";

export default function ChatPage() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [selectedDirectChat, setSelectedDirectChat] = useState<number | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newDirectChatDialog, setNewDirectChatDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("project");
  const { toast } = useToast();
  
  // Fetch user's projects
  const { data: projects, isLoading: loadingProjects } = useQuery({
    queryKey: ['/api/projects'],
    queryFn: async () => {
      const response = await fetch('/api/projects', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      
      return response.json();
    },
  });
  
  // Fetch chat rooms for selected project
  const { data: chatRooms, isLoading: loadingRooms } = useQuery({
    queryKey: ['/api/projects', selectedProject, 'chat-rooms'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${selectedProject}/chat-rooms`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      
      return response.json();
    },
    enabled: !!selectedProject,
  });
  
  // Fetch direct messages
  const { data: directChats, isLoading: loadingDirectChats } = useQuery({
    queryKey: ['/api/direct-messages'],
    queryFn: async () => {
      const response = await fetch('/api/direct-messages', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch direct messages');
      }
      
      return response.json();
    },
  });
  
  // Fetch available users for direct messaging
  const { data: availableUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await fetch('/api/users', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      return response.json();
    },
  });
  
  // Set default selected project when projects are loaded
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);
  
  // Set default selected room when rooms are loaded
  useEffect(() => {
    if (chatRooms && chatRooms.length > 0 && !selectedRoom) {
      setSelectedRoom(chatRooms[0].id);
    }
  }, [chatRooms, selectedRoom]);
  
  // Handle project change
  const handleProjectChange = (value: string) => {
    setSelectedProject(parseInt(value));
    setSelectedRoom(null);
  };
  
  // Handle room change
  const handleRoomChange = (value: string) => {
    setSelectedRoom(parseInt(value));
  };
  
  // Create new chat room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !selectedProject) return;
    
    try {
      const response = await apiRequest("POST", `/api/projects/${selectedProject}/chat-rooms`, {
        name: newRoomName.trim(),
      });
      
      const newRoom = await response.json();
      setSelectedRoom(newRoom.id);
      setNewRoomName("");
      setDialogOpen(false);
      
      toast({
        title: "Chat room created",
        description: `Chat room "${newRoom.name}" was created successfully.`,
      });
      
      // Invalidate chat rooms query cache
      queryClient.invalidateQueries({ queryKey: ['/api/projects', selectedProject, 'chat-rooms'] });
    } catch (error) {
      toast({
        title: "Failed to create chat room",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };
  
  // Mutation to create direct chat
  const createDirectChatMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      const response = await apiRequest("POST", '/api/direct-messages/create', {
        recipientId,
      });
      
      if (!response.ok) {
        throw new Error('Failed to create direct chat');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setSelectedDirectChat(data.id);
      setActiveTab("direct");
      setNewDirectChatDialog(false);
      
      toast({
        title: "Direct chat created",
        description: "Direct chat was created successfully.",
      });
      
      // Invalidate direct chats query cache
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create direct chat",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle create direct chat
  const handleCreateDirectChat = () => {
    if (!selectedRecipient) return;
    
    createDirectChatMutation.mutate(selectedRecipient);
  };
  
  // Handle direct chat selection
  const handleDirectChatSelect = (roomId: number) => {
    setSelectedDirectChat(roomId);
  };
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {isMobile ? (
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <Sidebar />
          </SheetContent>
        </Sheet>
      ) : (
        <Sidebar className="hidden md:flex" />
      )}
      
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        <Header toggleSidebar={() => setSidebarOpen(true)} />
        
        <main className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <h1 className="text-3xl font-fantasy">Chat</h1>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full md:w-[400px] grid-cols-2">
              <TabsTrigger value="project" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span>Project Chats</span>
              </TabsTrigger>
              <TabsTrigger value="direct" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Direct Messages</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Project Chats Tab */}
            <TabsContent value="project" className="mt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                  {loadingProjects ? (
                    <Skeleton className="h-10 w-40" />
                  ) : (
                    <Select 
                      value={selectedProject?.toString()} 
                      onValueChange={handleProjectChange}
                      disabled={!projects || projects.length === 0}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects?.map((project: any) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {loadingRooms || !selectedProject ? (
                    <Skeleton className="h-10 w-40" />
                  ) : (
                    <Select 
                      value={selectedRoom?.toString()} 
                      onValueChange={handleRoomChange}
                      disabled={!chatRooms || chatRooms.length === 0}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {chatRooms?.map((room: any) => (
                          <SelectItem key={room.id} value={room.id.toString()}>
                            {room.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-1" disabled={!selectedProject}>
                        <Plus size={16} />
                        New Room
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Chat Room</DialogTitle>
                      </DialogHeader>
                      <div className="py-4">
                        <Input
                          placeholder="Room name"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateRoom} disabled={!newRoomName.trim()}>
                          Create Room
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="h-[calc(100vh-280px)]">
                {loadingProjects || loadingRooms || !selectedProject || !selectedRoom ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <EnhancedChatInterface roomId={selectedRoom} projectId={selectedProject} />
                )}
              </div>
            </TabsContent>
            
            {/* Direct Messages Tab */}
            <TabsContent value="direct" className="mt-4">
              <div className="flex flex-col md:flex-row h-[calc(100vh-280px)] gap-4">
                {/* Direct Chats Sidebar */}
                <div className="md:w-72 border rounded-lg md:h-full overflow-hidden">
                  <div className="p-3 border-b flex items-center justify-between">
                    <h3 className="font-medium">Direct Messages</h3>
                    <Dialog open={newDirectChatDialog} onOpenChange={setNewDirectChatDialog}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <UserPlus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>New Direct Message</DialogTitle>
                        </DialogHeader>
                        <div className="py-4">
                          <Select 
                            value={selectedRecipient}
                            onValueChange={setSelectedRecipient}
                            disabled={loadingUsers || !availableUsers || availableUsers.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select contact" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableUsers?.map((user: any) => (
                                <SelectItem key={user.id} value={user.id.toString()}>
                                  {user.fullName || user.username}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button 
                            variant="outline" 
                            onClick={() => setNewDirectChatDialog(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleCreateDirectChat}
                            disabled={!selectedRecipient || createDirectChatMutation.isPending}
                          >
                            {createDirectChatMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Start Chat
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <ScrollArea className="h-[calc(100%-53px)]">
                    {loadingDirectChats ? (
                      <div className="p-4 space-y-3">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                      </div>
                    ) : directChats && directChats.length > 0 ? (
                      <div className="p-1">
                        {directChats.map((chat: any) => {
                          // Find the other participant (not the current user)
                          const otherUser = chat.participants.find(
                            (p: any) => p.id !== user?.id
                          );
                          
                          return (
                            <button
                              key={chat.id}
                              onClick={() => handleDirectChatSelect(chat.id)}
                              className={`w-full p-3 rounded-md flex items-center gap-3 hover:bg-secondary transition-colors ${
                                selectedDirectChat === chat.id ? "bg-secondary" : ""
                              }`}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={otherUser?.avatarUrl || ''} />
                                <AvatarFallback>
                                  {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-left flex-1 overflow-hidden">
                                <p className="font-medium truncate">
                                  {otherUser?.fullName || otherUser?.username || 'User'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {chat.lastMessage ? (
                                    <>
                                      {chat.lastMessage.content.substring(0, 30)}
                                      {chat.lastMessage.content.length > 30 ? '...' : ''}
                                    </>
                                  ) : (
                                    'No messages yet'
                                  )}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-muted-foreground text-sm">No direct messages yet</p>
                        <Button
                          variant="link"
                          onClick={() => setNewDirectChatDialog(true)}
                          className="mt-2"
                        >
                          Start a new conversation
                        </Button>
                      </div>
                    )}
                  </ScrollArea>
                </div>
                
                {/* Direct Chat Interface */}
                <div className="flex-1 border rounded-lg overflow-hidden">
                  {!selectedDirectChat ? (
                    <div className="h-full flex flex-col items-center justify-center p-4">
                      <User className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-xl font-medium mb-2">Select a conversation</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        Choose an existing conversation or start a new one to begin chatting
                      </p>
                      <Button
                        onClick={() => setNewDirectChatDialog(true)}
                        className="mt-4"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Start New Conversation
                      </Button>
                    </div>
                  ) : (
                    <DirectChatInterface roomId={selectedDirectChat} />
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
