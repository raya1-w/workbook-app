import { cn } from "@/lib/utils";
import { BrainIcon, CalendarCheckIcon, ListChecksIcon, FolderKanbanIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: "brain" | "tasks" | "streak" | "projects";
  className?: string;
}

export function StatsCard({ title, value, icon, className }: StatsCardProps) {
  const getIcon = () => {
    switch (icon) {
      case "brain":
        return <BrainIcon className="h-6 w-6 text-primary" />;
      case "tasks":
        return <ListChecksIcon className="h-6 w-6 text-secondary" />;
      case "streak":
        return <CalendarCheckIcon className="h-6 w-6 text-accent-dark" />;
      case "projects":
        return <FolderKanbanIcon className="h-6 w-6 text-info" />;
      default:
        return <BrainIcon className="h-6 w-6 text-primary" />;
    }
  };

  const getBgColor = () => {
    switch (icon) {
      case "brain":
        return "bg-primary-light bg-opacity-20";
      case "tasks":
        return "bg-secondary-light bg-opacity-20";
      case "streak":
        return "bg-accent-light bg-opacity-20";
      case "projects":
        return "bg-info bg-opacity-20";
      default:
        return "bg-primary-light bg-opacity-20";
    }
  };

  return (
    <div className={cn("bg-card rounded-lg p-5 shadow-md", className)}>
      <div className="flex items-center">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", getBgColor())}>
          {getIcon()}
        </div>
        <div className="ml-4">
          <h3 className="text-muted-foreground text-sm">{title}</h3>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );
}
