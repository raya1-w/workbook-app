import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { FileList } from "@/components/projects/file-list";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export default function TasksPage() {
  const { user } = useAuth();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  
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
  
  // Set default selected project when projects are loaded
  if (projects && projects.length > 0 && !selectedProject) {
    setSelectedProject(projects[0].id);
  }
  
  // Handle project change
  const handleProjectChange = (value: string) => {
    setSelectedProject(parseInt(value));
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
            <h1 className="text-3xl font-fantasy">Task Board</h1>
            
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
              
              <Button 
                className="gap-1" 
                onClick={() => setTaskDialogOpen(true)}
                disabled={!selectedProject}
              >
                <Plus size={16} />
                New Task
              </Button>
            </div>
          </div>
          
          {loadingProjects || !selectedProject ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[600px]" />
              <Skeleton className="h-[600px]" />
              <Skeleton className="h-[600px]" />
            </div>
          ) : (
            <Tabs defaultValue="tasks" className="w-full">
              <TabsList className="grid w-[200px] grid-cols-2 mb-4">
                <TabsTrigger value="tasks">Tasks</TabsTrigger>
                <TabsTrigger value="files">Files</TabsTrigger>
              </TabsList>
              <TabsContent value="tasks" className="mt-0">
                <KanbanBoard projectId={selectedProject} />
              </TabsContent>
              <TabsContent value="files" className="mt-0">
                {user && <FileList projectId={selectedProject} currentUserId={user.id} />}
              </TabsContent>
            </Tabs>
          )}
        </main>
      </div>

      {/* Task Dialog */}
      {selectedProject && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={null}
          projectId={selectedProject}
          onClose={() => setTaskDialogOpen(false)}
        />
      )}
    </div>
  );
}
