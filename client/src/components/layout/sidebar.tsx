import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  CheckSquare, 
  FolderKanban, 
  MessageSquare, 
  BarChart2, 
  Settings, 
  LogOut, 
  Brain
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { toast } = useToast();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navItems = [
    { path: "/", label: "Dashboard", icon: <Home className="w-6 h-6" /> },
    { path: "/tasks", label: "Tasks", icon: <CheckSquare className="w-6 h-6" /> },
    { path: "/projects", label: "Projects", icon: <FolderKanban className="w-6 h-6" /> },
    { path: "/chat", label: "Chat Rooms", icon: <MessageSquare className="w-6 h-6" /> },
    { path: "/analytics", label: "Analytics", icon: <BarChart2 className="w-6 h-6" /> },
    { path: "/profile", label: "Settings", icon: <Settings className="w-6 h-6" /> },
  ];

  const handleAccessibilityChange = (feature: string) => {
    toast({
      title: "Accessibility Setting Changed",
      description: `${feature} setting has been updated.`,
    });
  };

  return (
    <div className={cn("w-64 bg-sidebar text-sidebar-foreground flex flex-col h-screen", className)}>
      {/* Logo and brand */}
      <div className="px-4 py-6 flex items-center border-b border-sidebar-border">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <Brain className="h-6 w-6 text-sidebar-foreground" />
        </div>
        <h1 className="ml-3 font-fantasy text-xl font-bold">TaskMaster</h1>
      </div>
      
      {/* Navigation menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className="mb-1 mx-2">
              <Link href={item.path}>
                <a className={cn(
                  "flex items-center px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors",
                  location === item.path ? "bg-primary" : ""
                )}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
                </a>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Accessibility options */}
      <div className="p-4 border-t border-sidebar-border">
        <h3 className="text-sm uppercase text-sidebar-foreground opacity-60 font-semibold mb-2">Accessibility</h3>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">High Contrast</span>
          <Switch onCheckedChange={() => handleAccessibilityChange("High Contrast")} />
        </div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm">Colorblind Mode</span>
          <Switch defaultChecked onCheckedChange={() => handleAccessibilityChange("Colorblind Mode")} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Text-to-Speech</span>
          <Switch onCheckedChange={() => handleAccessibilityChange("Text-to-Speech")} />
        </div>
      </div>
      
      {/* User profile */}
      <div className="p-4 border-t border-sidebar-border flex items-center">
        <Avatar>
          <AvatarImage src={user?.profileImage} alt="User profile" />
          <AvatarFallback className="bg-primary-light text-sidebar-foreground">
            {user?.name?.charAt(0) || user?.username?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="ml-3">
          <p className="text-sm font-medium">{user?.name || user?.username}</p>
          <p className="text-xs opacity-60">{user?.email}</p>
        </div>
        <button 
          onClick={handleLogout}
          className="ml-auto text-sidebar-foreground opacity-60 hover:opacity-100 transition-opacity"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
