import { Calendar, Trash2, Clock, Play, Square, Timer } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Task } from "@shared/schema";
import { format } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task & { assignee?: { name: string; username: string; profileImage?: string } };
  onDragStart: (e: React.DragEvent) => void;
  onEdit: () => void;
  onClick?: () => void;
}

export function TaskCard({ task, onDragStart, onEdit, onClick }: TaskCardProps) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', task.projectId, 'tasks'],
      });
    },
  });
  
  const handleDelete = () => {
    deleteTaskMutation.mutate(task.id);
    setDeleteDialogOpen(false);
  };
  
  const getPriorityClass = () => {
    switch (task.priority) {
      case "high":
        return "priority-high";
      case "medium":
        return "priority-medium";
      case "low":
        return "priority-low";
      default:
        return "priority-medium";
    }
  };
  
  const getStatusClass = () => {
    switch (task.status) {
      case "todo":
        return "task-status-todo";
      case "in_progress":
        return "task-status-in_progress";
      case "completed":
        return "task-status-completed";
      default:
        return "task-status-todo";
    }
  };
  
  const formatDueDate = () => {
    if (!task.dueDate) return "No due date";
    
    try {
      return format(new Date(task.dueDate), "MMM d, yyyy");
    } catch (error) {
      return "Invalid date";
    }
  };
  
  // Format time as HH:MM
  const formatTime = (minutes: number | null): string => {
    if (!minutes) return "00:00";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Get time tracking indicator
  const getTimeTrackingIndicator = () => {
    if (task.currentlyTracking) {
      return (
        <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 flex items-center">
          <span className="animate-pulse mr-1 h-2 w-2 rounded-full bg-green-500"></span>
          <Clock className="h-3 w-3 mr-1" />
          Tracking
        </Badge>
      );
    }
    
    if (task.totalTrackedMinutes) {
      return (
        <span className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          {formatTime(task.totalTrackedMinutes)}
          {task.estimatedMinutes ? ` / ${formatTime(task.estimatedMinutes)}` : ""}
        </span>
      );
    }
    
    if (task.estimatedMinutes) {
      return (
        <span className="text-xs text-muted-foreground flex items-center">
          <Clock className="h-3 w-3 mr-1" />
          Est: {formatTime(task.estimatedMinutes)}
        </span>
      );
    }
    
    return null;
  };

  return (
    <>
      <div 
        className={cn(
          "bg-muted p-3 rounded-lg shadow-sm task-card cursor-pointer",
          getStatusClass(),
          task.status === "completed" && "opacity-80"
        )}
        draggable
        onDragStart={onDragStart}
        onClick={onClick}
      >
        <div className="flex justify-between items-start">
          <h4 className="font-medium">{task.title}</h4>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                  <path d="M8.625 2.5C8.625 3.12132 8.12132 3.625 7.5 3.625C6.87868 3.625 6.375 3.12132 6.375 2.5C6.375 1.87868 6.87868 1.375 7.5 1.375C8.12132 1.375 8.625 1.87868 8.625 2.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM7.5 13.625C8.12132 13.625 8.625 13.1213 8.625 12.5C8.625 11.8787 8.12132 11.375 7.5 11.375C6.87868 11.375 6.375 11.8787 6.375 12.5C6.375 13.1213 6.87868 13.625 7.5 13.625Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit Task</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Task
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center mt-1 gap-1 flex-wrap">
          <span className={cn("text-xs px-2 py-0.5 rounded-full", getPriorityClass())}>
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </span>
          
          {task.currentlyTracking && (
            <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 flex items-center">
              <span className="animate-pulse mr-1 h-2 w-2 rounded-full bg-green-500"></span>
              Tracking
            </Badge>
          )}
        </div>
        
        {task.description && (
          <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
        )}
        
        {/* Time tracking progress */}
        {(task.estimatedMinutes && task.totalTrackedMinutes) ? (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ 
                width: `${Math.min(100, (task.totalTrackedMinutes / task.estimatedMinutes) * 100)}%` 
              }}
            ></div>
          </div>
        ) : null}
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center">
            {task.assignee ? (
              <Avatar className="h-6 w-6">
                <AvatarImage src={task.assignee.profileImage} />
                <AvatarFallback className="text-xs">
                  {task.assignee.name?.charAt(0) || task.assignee.username.charAt(0)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-muted">UA</AvatarFallback>
              </Avatar>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {getTimeTrackingIndicator()}
            
            {task.dueDate && (
              <span className="text-xs text-muted-foreground flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                {formatDueDate()}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              task and remove it from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
