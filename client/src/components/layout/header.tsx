import { useState } from "react";
import { BellIcon, MenuIcon, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  toggleSidebar: () => void;
  className?: string;
}

export function Header({ toggleSidebar, className }: HeaderProps) {
  const [location] = useLocation();
  const isMobile = useMobile();
  
  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      return response.json();
    },
  });
  
  // Get title based on current path
  const getTitle = () => {
    switch (location) {
      case '/':
        return 'Dashboard';
      case '/tasks':
        return 'Task Board';
      case '/projects':
        return 'Projects';
      case '/chat':
        return 'Chat Rooms';
      case '/analytics':
        return 'Analytics';
      case '/profile':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };
  
  const unreadNotifications = notifications?.filter(n => !n.read) || [];
  
  return (
    <header className={cn("bg-background shadow-sm py-4 px-6 flex items-center justify-between", className)}>
      <div className="flex items-center">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4">
            <MenuIcon className="h-5 w-5" />
          </Button>
        )}
        <h2 className="font-fantasy text-xl">{getTitle()}</h2>
      </div>
      
      <div className="flex items-center space-x-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <BellIcon className="h-5 w-5" />
              {unreadNotifications.length > 0 && (
                <Badge 
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary"
                >
                  {unreadNotifications.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {notifications?.length > 0 ? (
              notifications.map((notification) => (
                <DropdownMenuItem key={notification.id} className={cn(
                  "flex flex-col items-start py-2",
                  !notification.read && "font-medium bg-muted"
                )}>
                  <div className="text-sm">{notification.content}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleTimeString()}
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <DropdownMenuItem className="text-center" disabled>
                No notifications
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
