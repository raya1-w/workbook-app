import { User, ChatMessage } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { FileIcon } from "lucide-react";

interface MessageItemProps {
  message: ChatMessage & { user: User };
  currentUser: User | null;
}

export function MessageItem({ message, currentUser }: MessageItemProps) {
  const isCurrentUser = message.user.id === currentUser?.id;
  
  const formatTime = (timestamp: string | Date) => {
    try {
      return format(new Date(timestamp), "h:mm a");
    } catch (error) {
      return "";
    }
  };
  
  return (
    <div className={cn(
      "flex items-start",
      isCurrentUser && "flex-row-reverse"
    )}>
      <Avatar className="w-8 h-8 mt-1">
        <AvatarImage src={message.user.profileImage} alt={message.user.name || message.user.username} />
        <AvatarFallback className={cn(
          "text-xs",
          isCurrentUser ? "bg-primary-light text-primary-foreground" : "bg-secondary-light text-secondary-foreground"
        )}>
          {message.user.name?.charAt(0) || message.user.username.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        "px-3 py-2 rounded-lg max-w-[80%]",
        isCurrentUser 
          ? "ml-2 bg-primary bg-opacity-10 rounded-tr-none" 
          : "ml-2 bg-muted rounded-tl-none"
      )}>
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm">
            {isCurrentUser ? "You" : (message.user.name || message.user.username)}
          </span>
          <span className="text-xs text-muted-foreground ml-2">
            {formatTime(message.createdAt)}
          </span>
        </div>
        
        <p className="text-sm mt-1">{message.content}</p>
        
        {message.attachment && (
          <div className="mt-2 p-2 bg-card rounded border border-border border-opacity-20 text-sm flex items-center">
            <FileIcon className="h-4 w-4 mr-2 text-secondary" />
            <span className="text-primary hover:underline cursor-pointer">
              {message.attachment}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
