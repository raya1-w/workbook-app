import { useState, useEffect } from "react";
import { Task } from "@shared/schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Timer, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TimeTrackingControlsProps {
  task: Task;
}

export function TimeTrackingControls({ task }: TimeTrackingControlsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(task.currentlyTracking || false);
  
  // Format time as HH:MM:SS
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };
  
  // Calculate total time (tracked + current session if tracking)
  const getTotalTime = (): number => {
    return (task.totalTrackedMinutes || 0) + elapsedTime;
  };
  
  // Update elapsed time while tracking
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isTracking && task.trackingStartedAt) {
      // Initial calculation
      const startTime = new Date(task.trackingStartedAt);
      const now = new Date();
      const initialElapsed = Math.round((now.getTime() - startTime.getTime()) / 60000);
      setElapsedTime(initialElapsed);
      
      // Set up interval to update elapsed time
      interval = setInterval(() => {
        const startTime = new Date(task.trackingStartedAt!);
        const now = new Date();
        const newElapsed = Math.round((now.getTime() - startTime.getTime()) / 60000);
        setElapsedTime(newElapsed);
      }, 60000); // Update every minute
    } else {
      setElapsedTime(0);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTracking, task.trackingStartedAt]);
  
  // Start tracking mutation
  const startTrackingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tasks/${task.id}/track/start`, {});
      return await response.json();
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', task.projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/personal-tasks'],
      });
      setIsTracking(true);
      toast({
        title: "Time tracking started",
        description: `Now tracking time for "${task.title}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to start time tracking",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Stop tracking mutation
  const stopTrackingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/tasks/${task.id}/track/stop`, {});
      return await response.json();
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({
        queryKey: ['/api/projects', task.projectId, 'tasks'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/personal-tasks'],
      });
      setIsTracking(false);
      toast({
        title: "Time tracking stopped",
        description: `Tracked ${elapsedTime} minutes for "${task.title}"`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to stop time tracking",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-muted-foreground" />
            <div>
              <div className="font-medium">Time Tracking</div>
              <div className="text-sm text-muted-foreground">
                {formatTime(getTotalTime())} {task.estimatedMinutes ? `/ ${formatTime(task.estimatedMinutes)}` : ""}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isTracking ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => stopTrackingMutation.mutate()}
                      disabled={stopTrackingMutation.isPending}
                    >
                      <Square className="h-4 w-4 mr-1" />
                      Stop
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stop time tracking for this task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => startTrackingMutation.mutate()}
                      disabled={startTrackingMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Start time tracking for this task</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {isTracking && (
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100">
                <span className="animate-pulse mr-1">●</span> Tracking
              </Badge>
            )}
          </div>
        </div>
        
        {task.estimatedMinutes && (
          <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ 
                width: `${Math.min(100, (getTotalTime() / task.estimatedMinutes) * 100)}%` 
              }}
            ></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}