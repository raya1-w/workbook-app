import { useState, useEffect } from "react";
import { TaskCard } from "./task-card";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Task } from "@shared/schema";
import { TaskDialog } from "./task-dialog";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/use-websocket";

interface KanbanBoardProps {
  projectId: number;
}

export function KanbanBoard({ projectId }: KanbanBoardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();
  
  // Fetch tasks for the project
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['/api/projects', projectId, 'tasks'],
    queryFn: async () => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      return response.json();
    },
  });
  
  // Update task status mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PUT", `/api/tasks/${id}`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'tasks'],
      });
    },
  });
  
  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage?.type === 'task_created' || 
        lastMessage?.type === 'task_updated' || 
        lastMessage?.type === 'task_deleted') {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', projectId, 'tasks'],
      });
    }
  }, [lastMessage, projectId, queryClient]);
  
  // Group tasks by status
  const todoTasks = tasks?.filter((task: Task) => task.status === 'todo') || [];
  const inProgressTasks = tasks?.filter((task: Task) => task.status === 'in_progress') || [];
  const completedTasks = tasks?.filter((task: Task) => task.status === 'completed') || [];
  
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('task', JSON.stringify(task));
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, status: 'todo' | 'in_progress' | 'completed') => {
    e.preventDefault();
    const taskData = e.dataTransfer.getData('task');
    if (!taskData) return;
    
    try {
      const task = JSON.parse(taskData) as Task;
      if (task.status !== status) {
        updateTaskMutation.mutate({ id: task.id, status });
      }
    } catch (error) {
      console.error('Error parsing task data:', error);
    }
  };
  
  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };
  
  const handleCreateTask = () => {
    setSelectedTask(null);
    setIsDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedTask(null);
  };
  
  if (isLoading) {
    return <div className="p-8 text-center">Loading tasks...</div>;
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-fantasy text-2xl">Task Board</h2>
        <Button onClick={handleCreateTask} className="bg-primary hover:bg-primary-dark text-primary-foreground">
          <PlusIcon className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 overflow-x-auto">
        {/* To Do Column */}
        <div 
          className="bg-card rounded-lg shadow-md p-4" 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'todo')}
        >
          <h3 className="font-medium mb-3 flex items-center">
            <div className="w-3 h-3 rounded-full bg-info mr-2"></div>
            To Do
            <span className="ml-auto text-sm bg-muted px-2 py-0.5 rounded-full">
              {todoTasks.length}
            </span>
          </h3>
          <div className="space-y-3">
            {todoTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onDragStart={(e) => handleDragStart(e, task)}
                onEdit={() => handleEditTask(task)}
              />
            ))}
            {todoTasks.length === 0 && (
              <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground">
                No tasks to do
              </div>
            )}
          </div>
        </div>
        
        {/* In Progress Column */}
        <div 
          className="bg-card rounded-lg shadow-md p-4" 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'in_progress')}
        >
          <h3 className="font-medium mb-3 flex items-center">
            <div className="w-3 h-3 rounded-full bg-warning mr-2"></div>
            In Progress
            <span className="ml-auto text-sm bg-muted px-2 py-0.5 rounded-full">
              {inProgressTasks.length}
            </span>
          </h3>
          <div className="space-y-3">
            {inProgressTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onDragStart={(e) => handleDragStart(e, task)}
                onEdit={() => handleEditTask(task)}
              />
            ))}
            {inProgressTasks.length === 0 && (
              <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground">
                No tasks in progress
              </div>
            )}
          </div>
        </div>
        
        {/* Completed Column */}
        <div 
          className="bg-card rounded-lg shadow-md p-4" 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, 'completed')}
        >
          <h3 className="font-medium mb-3 flex items-center">
            <div className="w-3 h-3 rounded-full bg-success mr-2"></div>
            Completed
            <span className="ml-auto text-sm bg-muted px-2 py-0.5 rounded-full">
              {completedTasks.length}
            </span>
          </h3>
          <div className="space-y-3">
            {completedTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                onDragStart={(e) => handleDragStart(e, task)}
                onEdit={() => handleEditTask(task)}
              />
            ))}
            {completedTasks.length === 0 && (
              <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground">
                No completed tasks
              </div>
            )}
          </div>
        </div>
      </div>
      
      <TaskDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        task={selectedTask}
        projectId={projectId}
        onClose={handleDialogClose}
      />
    </div>
  );
}
