import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { 
  TaskStatusChart, 
  TaskCompletionChart, 
  ProjectProgressChart,
  TaskPriorityChart
} from "@/components/analytics/charts";
import { useQuery } from "@tanstack/react-query";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
  
  // Calculate stats
  const totalTasks = tasks?.length || 0;
  const completedTasks = tasks?.filter((task: any) => task.status === 'completed').length || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const dueTasksCount = tasks?.filter((task: any) => {
    if (!task.dueDate) return false;
    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && task.status !== 'completed';
  }).length || 0;
  
  const avgTasksPerProject = projects?.length > 0 && totalTasks > 0 
    ? Math.round(totalTasks / projects.length * 10) / 10 
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
          <h1 className="text-3xl font-fantasy mb-6">Analytics Dashboard</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {loadingTasks || loadingProjects ? (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Task Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tasks Due Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Tasks per Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Task Completion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{completionRate}%</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {completedTasks} of {totalTasks} tasks completed
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tasks Due Soon
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{dueTasksCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Tasks due within the next 7 days
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Avg Tasks per Project
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{avgTasksPerProject}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Across {projects?.length || 0} projects
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <TaskStatusChart />
            <TaskCompletionChart />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProjectProgressChart />
            <TaskPriorityChart />
          </div>
        </main>
      </div>
    </div>
  );
}
