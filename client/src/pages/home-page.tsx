import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { EnhancedChatInterface } from "@/components/chat/enhanced-chat-interface";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

export default function HomePage() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  
  // Fetch user's tasks
  const { data: tasks, isLoading: loadingTasks } = useQuery({
    queryKey: ['/api/user/tasks'],
    queryFn: async () => {
      const response = await fetch('/api/user/tasks', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return response.json();
    },
  });
  
  // Get first project for Kanban board and chat
  const firstProject = projects && projects.length > 0 ? projects[0] : null;
  
  // Fetch chat rooms for the first project
  const { data: chatRooms } = useQuery({
    queryKey: ['/api/projects', firstProject?.id, 'chat-rooms'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${firstProject.id}/chat-rooms`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat rooms');
      }
      
      return response.json();
    },
    enabled: !!firstProject,
  });
  
  // Stats calculations
  const todoTasks = tasks ? tasks.filter((task: any) => task.status === 'todo').length : 0;
  const inProgressTasks = tasks ? tasks.filter((task: any) => task.status === 'in_progress').length : 0;
  const completedTasks = tasks ? tasks.filter((task: any) => task.status === 'completed').length : 0;
  const totalTasks = tasks ? tasks.length : 0;
  const projectCount = projects ? projects.length : 0;
  
  // Completion percentage
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100) 
    : 0;
  
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
          <WelcomeBanner />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {loadingTasks ? (
              <>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </>
            ) : (
              <>
                <StatsCard 
                  title="Completion Rate" 
                  value={`${completionPercentage}%`} 
                  icon="brain" 
                />
                <StatsCard 
                  title="Tasks Assigned" 
                  value={`${totalTasks}`} 
                  icon="tasks" 
                />
                <StatsCard 
                  title="In Progress" 
                  value={`${inProgressTasks}`} 
                  icon="streak" 
                />
                <StatsCard 
                  title="Active Projects" 
                  value={`${projectCount}`} 
                  icon="projects" 
                />
              </>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row gap-6 mt-8">
            <div className="md:w-3/5">
              {loadingProjects || !firstProject ? (
                <Skeleton className="h-96 w-full" />
              ) : (
                <KanbanBoard projectId={firstProject.id} />
              )}
            </div>
            
            <div className="md:w-2/5 h-[550px]">
              <h2 className="font-fantasy text-2xl mb-4">Project Chat</h2>
              {loadingProjects || !firstProject || !chatRooms || chatRooms.length === 0 ? (
                <Skeleton className="h-[510px] w-full" />
              ) : (
                <EnhancedChatInterface roomId={chatRooms[0].id} projectId={firstProject.id} />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
