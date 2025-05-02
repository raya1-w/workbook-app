import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, CheckCircle, Circle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema for personal tasks
const taskFormSchema = z.object({
  title: z.string().min(3, "Task title must be at least 3 characters"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "completed"]),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().optional().nullable(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

export default function PersonalTasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();

  // Fetch personal tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['/api/personal-tasks'],
    queryFn: async () => {
      const response = await apiRequest("GET", '/api/personal-tasks');
      
      if (!response.ok) {
        throw new Error('Failed to fetch personal tasks');
      }
      
      return response.json();
    },
  });

  // Form for creating or updating tasks
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    }
  });

  // Create a personal task
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      // Format the date properly to avoid timestamp errors
      const formattedData = {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
      };
      const response = await apiRequest("POST", '/api/personal-tasks', formattedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal-tasks'] });
      toast({
        title: "Task created",
        description: "Your personal task was created successfully.",
      });
      setTaskDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update a personal task
  const updateTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues & { id: number }) => {
      const { id, ...taskData } = data;
      // Format the date properly to avoid timestamp errors
      const formattedData = {
        ...taskData,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate).toISOString() : null,
      };
      const response = await apiRequest("PUT", `/api/personal-tasks/${id}`, formattedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal-tasks'] });
      toast({
        title: "Task updated",
        description: "Your personal task was updated successfully.",
      });
      setTaskDialogOpen(false);
      setCurrentTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete a personal task
  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/personal-tasks/${id}`);
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/personal-tasks'] });
      toast({
        title: "Task deleted",
        description: "Your personal task was deleted successfully.",
      });
      setCurrentTask(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete task",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: TaskFormValues) => {
    if (currentTask) {
      updateTaskMutation.mutate({ ...data, id: currentTask.id });
    } else {
      createTaskMutation.mutate(data);
    }
  };

  const handleEditTask = (task: any) => {
    setCurrentTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : null,
    });
    setTaskDialogOpen(true);
  };

  const handleNewTask = () => {
    setCurrentTask(null);
    form.reset({
      title: "",
      description: "",
      status: "todo",
      priority: "medium",
      dueDate: null,
    });
    setTaskDialogOpen(true);
  };

  const handleDeleteTask = (id: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      deleteTaskMutation.mutate(id);
    }
  };

  // Filter tasks based on active tab
  const filteredTasks = tasks ? tasks.filter((task: any) => {
    if (activeTab === "all") return true;
    return task.status === activeTab;
  }) : [];

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">High</Badge>;
      case "medium":
        return <Badge variant="default">Medium</Badge>;
      case "low":
        return <Badge variant="outline">Low</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Circle className="h-5 w-5 text-blue-500" />;
      case "todo":
        return <Circle className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar className={isMobile ? (sidebarOpen ? "block w-full absolute z-50" : "hidden") : "w-64"} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-muted/30">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-bold">Personal Tasks</h1>
              <Button onClick={handleNewTask}>
                <Plus className="h-4 w-4 mr-2" /> New Task
              </Button>
            </div>
            
            <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-md">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="todo">To Do</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="pt-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredTasks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredTasks.map((task: any) => (
                      <Card key={task.id} className="bg-card hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              {getStatusIcon(task.status)}
                              <CardTitle className="text-base font-semibold leading-tight">
                                {task.title}
                              </CardTitle>
                            </div>
                            {getPriorityBadge(task.priority)}
                          </div>
                          {task.dueDate && (
                            <CardDescription>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="pb-2">
                          {task.description && <p className="text-sm">{task.description}</p>}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditTask(task)}>
                            Edit
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => handleDeleteTask(task.id)}
                          >
                            Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 bg-card rounded-lg border border-border">
                    <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-1">No tasks found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      You don't have any personal tasks {activeTab !== "all" ? `in "${activeTab}" status` : ""} yet.
                    </p>
                    <Button onClick={handleNewTask} size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Create your first task
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {currentTask 
                ? "Update your personal task details below." 
                : "Add a new personal task to your list."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter task description" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ""} 
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setTaskDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {(createTaskMutation.isPending || updateTaskMutation.isPending) ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : currentTask ? (
                    "Update Task"
                  ) : (
                    "Create Task"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}