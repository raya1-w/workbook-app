import { Button } from "@/components/ui/button";
import { PlayIcon, TrophyIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export function WelcomeBanner() {
  const { user } = useAuth();
  
  return (
    <div className="bg-primary rounded-lg p-6 text-primary-foreground shadow-lg bg-opacity-90 relative overflow-hidden">
      <div className="relative z-10">
        <h2 className="font-fantasy text-2xl mb-2">
          Welcome back, {user?.name || user?.username}!
        </h2>
        <p className="mb-4 opacity-90">
          Your task dashboard awaits. Complete your ongoing tasks and stay on top of your projects.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/tasks">
            <Button className="bg-accent hover:bg-accent-dark text-accent-foreground">
              <PlayIcon className="mr-2 h-4 w-4" /> View Tasks
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline" className="bg-card hover:bg-muted text-primary">
              <TrophyIcon className="mr-2 h-4 w-4" /> View Progress
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 opacity-20 transform translate-x-8 -translate-y-8">
        <BrainIcon size={144} />
      </div>
    </div>
  );
}

function BrainIcon({ size = 48 }: { size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M9.5 2a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
      <path d="M14.5 2a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
      <path d="M19.5 7a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
      <path d="M19.5 12a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
      <path d="M14.5 17a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"></path>
      <path d="M9.5 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
      <path d="M4.5 12a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
      <path d="M4.5 7a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Z"></path>
      <path d="M7 9.5h1.5a2 2 0 0 1 2 2v1m5.5 2h1.5a2 2 0 0 0 2-2v-1M11 15v-2.5a2 2 0 0 1 2-2h1m-4 10v-3"></path>
    </svg>
  );
}
