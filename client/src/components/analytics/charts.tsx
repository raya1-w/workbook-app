import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

export function TaskStatusChart() {
  const { data: projects } = useQuery({
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
  
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch tasks for all projects
  useEffect(() => {
    if (!projects) return;
    
    const fetchAllTasks = async () => {
      setIsLoading(true);
      const taskPromises = projects.map((project: any) => 
        fetch(`/api/projects/${project.id}/tasks`, {
          credentials: 'include',
        }).then(res => res.json())
      );
      
      try {
        const tasksResults = await Promise.all(taskPromises);
        const allTasks = tasksResults.flat();
        setAllTasks(allTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllTasks();
  }, [projects]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Status Distribution</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  const todoCount = allTasks.filter(task => task.status === 'todo').length;
  const inProgressCount = allTasks.filter(task => task.status === 'in_progress').length;
  const completedCount = allTasks.filter(task => task.status === 'completed').length;
  
  const data = [
    { name: 'To Do', value: todoCount, color: 'hsl(var(--chart-1))' },
    { name: 'In Progress', value: inProgressCount, color: 'hsl(var(--chart-2))' },
    { name: 'Completed', value: completedCount, color: 'hsl(var(--chart-3))' },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Status Distribution</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {allTasks.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} tasks`, 'Count']} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No tasks found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TaskCompletionChart() {
  const { user } = useAuth();
  
  // Simulate task completion data over time (in a real app, this would come from the backend)
  const completionData = [
    { day: 'Mon', completion: 65 },
    { day: 'Tue', completion: 80 },
    { day: 'Wed', completion: 45 },
    { day: 'Thu', completion: 90 },
    { day: 'Fri', completion: 75 },
    { day: 'Sat', completion: 60 },
    { day: 'Sun', completion: 85 },
  ];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Task Completion</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={completionData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="day" />
            <YAxis 
              tickFormatter={(value) => `${value}%`}
              domain={[0, 100]}
            />
            <Tooltip formatter={(value) => [`${value}%`, 'Completion']} />
            <Legend />
            <Line
              type="monotone"
              dataKey="completion"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function ProjectProgressChart() {
  const { data: projects } = useQuery({
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
  
  const [projectProgress, setProjectProgress] = useState<{ name: string; progress: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Calculate project progress
  useEffect(() => {
    if (!projects) return;
    
    const calculateProgress = async () => {
      setIsLoading(true);
      
      try {
        const progressData = await Promise.all(
          projects.slice(0, 5).map(async (project: any) => {
            const tasksResponse = await fetch(`/api/projects/${project.id}/tasks`, {
              credentials: 'include',
            });
            
            const tasks = await tasksResponse.json();
            const totalTasks = tasks.length;
            const completedTasks = tasks.filter((task: any) => task.status === 'completed').length;
            
            const progress = totalTasks > 0 
              ? Math.round((completedTasks / totalTasks) * 100) 
              : 0;
            
            return {
              name: project.name,
              progress,
            };
          })
        );
        
        setProjectProgress(progressData);
      } catch (error) {
        console.error("Error calculating project progress:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    calculateProgress();
  }, [projects]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Progress</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {projectProgress.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={projectProgress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
              <YAxis type="category" dataKey="name" width={120} />
              <Tooltip formatter={(value) => [`${value}%`, 'Progress']} />
              <Bar dataKey="progress" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            No projects found
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TaskPriorityChart() {
  const { data: projects } = useQuery({
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
  
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch tasks for all projects
  useEffect(() => {
    if (!projects) return;
    
    const fetchAllTasks = async () => {
      setIsLoading(true);
      const taskPromises = projects.map((project: any) => 
        fetch(`/api/projects/${project.id}/tasks`, {
          credentials: 'include',
        }).then(res => res.json())
      );
      
      try {
        const tasksResults = await Promise.all(taskPromises);
        const allTasks = tasksResults.flat();
        setAllTasks(allTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllTasks();
  }, [projects]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Task Priority Distribution</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        </CardContent>
      </Card>
    );
  }
  
  const highCount = allTasks.filter(task => task.priority === 'high').length;
  const mediumCount = allTasks.filter(task => task.priority === 'medium').length;
  const lowCount = allTasks.filter(task => task.priority === 'low').length;
  
  const totalTasks = allTasks.length;
  
  const highPercentage = totalTasks > 0 ? Math.round((highCount / totalTasks) * 100) : 0;
  const mediumPercentage = totalTasks > 0 ? Math.round((mediumCount / totalTasks) * 100) : 0;
  const lowPercentage = totalTasks > 0 ? Math.round((lowCount / totalTasks) * 100) : 0;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Priority Distribution</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {allTasks.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-accent-dark mr-2"></div>
                  <span className="text-sm font-medium">High Priority</span>
                </div>
                <span className="text-sm font-medium">{highCount} tasks</span>
              </div>
              <Progress value={highPercentage} className="h-2 bg-muted" indicatorClassName="bg-accent-dark" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-muted-foreground mr-2"></div>
                  <span className="text-sm font-medium">Medium Priority</span>
                </div>
                <span className="text-sm font-medium">{mediumCount} tasks</span>
              </div>
              <Progress value={mediumPercentage} className="h-2 bg-muted" indicatorClassName="bg-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-secondary mr-2"></div>
                  <span className="text-sm font-medium">Low Priority</span>
                </div>
                <span className="text-sm font-medium">{lowCount} tasks</span>
              </div>
              <Progress value={lowPercentage} className="h-2 bg-muted" indicatorClassName="bg-secondary" />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No tasks found
          </div>
        )}
      </CardContent>
    </Card>
  );
}
