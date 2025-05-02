import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare, MessagesSquare, Users, Search } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ChatPage() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [newRoomName, setNewRoomName] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
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
    } catch (error) {
      toast({
        title: "Failed to create chat room",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
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
            <h1 className="text-3xl font-fantasy">Chat Rooms</h1>
            
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
          
          <div className="h-[calc(100vh-200px)]">
            {loadingProjects || loadingRooms || !selectedProject || !selectedRoom ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <EnhancedChatInterface roomId={selectedRoom} projectId={selectedProject} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
