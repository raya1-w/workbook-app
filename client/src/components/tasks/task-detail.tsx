import { useState } from "react";
import { Task, User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle2, User as UserIcon, AlertCircle, Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TimeTrackingControls } from "./time-tracking-controls";

interface TaskDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  projectId?: number;
  users?: { id: number; username: string; name?: string }[];
  onEditClick?: () => void;
}

const statusColors = {
  todo: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
};

const priorityColors = {
  low: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-100",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
};

export function TaskDetail({ open, onOpenChange, task, projectId, users, onEditClick }: TaskDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const formatStatus = (status: string): string => {
    if (status === "todo") return "To Do";
    if (status === "in_progress") return "In Progress";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };
  
  if (!task) return null;
  
  const assignee = users?.find(u => u.id === task.assignedTo);
  
  // Format dates for display
  const createdDate = task.createdAt ? format(new Date(task.createdAt), "PPP") : "Unknown";
  const dueDate = task.dueDate ? format(new Date(task.dueDate), "PPP") : "None";
  
  // Get recurring string
  const getRecurringString = (type: string): string => {
    if (type === "none") return "None";
    return type.charAt(0).toUpperCase() + type.slice(1);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-xl">{task.title}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* Time tracking section */}
          {task.id && <TimeTrackingControls task={task} />}
          
          {/* Task details */}
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className={statusColors[task.status]}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              {formatStatus(task.status)}
            </Badge>
            
            <Badge variant="outline" className={priorityColors[task.priority]}>
              <AlertCircle className="h-3.5 w-3.5 mr-1" />
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
            </Badge>
            
            {assignee && (
              <Badge variant="outline">
                <UserIcon className="h-3.5 w-3.5 mr-1" />
                Assignee: {assignee.name || assignee.username}
              </Badge>
            )}
            
            {task.recurringType !== "none" && (
              <Badge variant="outline">
                <Bookmark className="h-3.5 w-3.5 mr-1" />
                {getRecurringString(task.recurringType)} recurring
              </Badge>
            )}
          </div>
          
          <div className="flex gap-6">
            <div className="flex items-center text-sm text-muted-foreground">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Created: {createdDate}</span>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mr-1" />
              <span>Due: {dueDate}</span>
            </div>
          </div>
          
          <Separator />
          
          {task.description ? (
            <div className="text-sm">
              <h4 className="font-medium mb-2">Description</h4>
              <div className="whitespace-pre-wrap text-muted-foreground">
                {task.description}
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground italic">No description provided</div>
          )}
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          
          {onEditClick && (
            <Button onClick={onEditClick}>
              Edit Task
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}