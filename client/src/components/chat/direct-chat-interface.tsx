import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useWebSocket } from '@/lib/use-websocket';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, SendHorizonal, Paperclip, File, Image, Mic, MicOff,
  X, MoreVertical, Download, ChevronRight, Users
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface DirectChatInterfaceProps {
  roomId: number;
}

export default function DirectChatInterface({ roomId }: DirectChatInterfaceProps) {
  const { user } = useAuth();
  const { sendMessage } = useWebSocket();
  const [messageInput, setMessageInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [isRecordingPermissionGranted, setIsRecordingPermissionGranted] = useState<boolean | null>(null);

  // Fetch chat room details
  const { data: chatRoom, isLoading: loadingRoom } = useQuery({
    queryKey: ['/api/chat-rooms', roomId],
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/${roomId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chat room');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch participants
  const { data: participants, isLoading: loadingParticipants } = useQuery({
    queryKey: ['/api/direct-messages', roomId, 'participants'],
    queryFn: async () => {
      const response = await fetch(`/api/direct-messages/${roomId}/participants`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch participants');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch messages
  const { data: messages, isLoading: loadingMessages } = useQuery({
    queryKey: ['/api/chat-rooms', roomId, 'messages'],
    queryFn: async () => {
      const response = await fetch(`/api/chat-rooms/${roomId}/messages`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });
  
  // Fetch files
  const { data: files, isLoading: loadingFiles } = useQuery({
    queryKey: ['/api/direct-messages', roomId, 'files'],
    queryFn: async () => {
      const response = await fetch(`/api/direct-messages/${roomId}/files`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      
      return response.json();
    },
    enabled: !!roomId,
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Set up media recorder for voice messages
  useEffect(() => {
    if (isRecordingPermissionGranted && isRecording && !mediaRecorder) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const recorder = new MediaRecorder(stream);
          setMediaRecorder(recorder);
          
          const chunks: Blob[] = [];
          recorder.ondataavailable = (e: BlobEvent) => {
            chunks.push(e.data);
            setAudioChunks(chunks);
          };
          
          recorder.start();
        })
        .catch(err => {
          console.error('Error accessing microphone:', err);
          setIsRecording(false);
          toast({
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access to record voice messages.',
            variant: 'destructive',
          });
        });
    }
  }, [isRecording, isRecordingPermissionGranted, mediaRecorder, toast]);

  // Handle send message
  const handleSendMessage = () => {
    if (!messageInput.trim() && !selectedFile) return;
    
    if (selectedFile) {
      // Upload file first, then send message with file reference
      uploadFileThenSendMessage();
    } else {
      // Send text message
      sendTextMessage();
    }
  };

  // Send text message
  const sendTextMessage = () => {
    if (!messageInput.trim()) return;
    
    sendMessage('chat_message', {
      roomId,
      content: messageInput,
    });
    
    setMessageInput('');
  };

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/direct-messages/${roomId}/files`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      // Send message with file reference
      sendMessage('chat_message', {
        roomId,
        content: messageInput.trim() || `Shared a file: ${data.fileName}`,
        fileId: data.id,
      });
      
      // Reset state
      setMessageInput('');
      setSelectedFile(null);
      
      // Invalidate files query
      queryClient.invalidateQueries({ queryKey: ['/api/direct-messages', roomId, 'files'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'File Upload Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Upload file then send message
  const uploadFileThenSendMessage = () => {
    if (!selectedFile) return;
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // If a message was created with the file, add message ID
    if (messageInput.trim()) {
      formData.append('message', messageInput);
    }
    
    uploadFileMutation.mutate(formData);
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle voice recording
  const handleVoiceRecording = () => {
    if (isRecordingPermissionGranted === null) {
      // First time, request permission
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
          setIsRecordingPermissionGranted(true);
          setIsRecording(true);
        })
        .catch(() => {
          setIsRecordingPermissionGranted(false);
          toast({
            title: 'Microphone Access Denied',
            description: 'Please allow microphone access to record voice messages.',
            variant: 'destructive',
          });
        });
    } else if (isRecordingPermissionGranted) {
      if (isRecording) {
        // Stop recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
          mediaRecorder.stream.getTracks().forEach(track => track.stop());
          setMediaRecorder(null);
          
          // Create audio file from chunks
          if (audioChunks.length > 0) {
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            try {
              const audioFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });
              setSelectedFile(audioFile);
            } catch (err) {
              // Fallback for browsers that don't support File constructor
              // @ts-ignore - this is a workaround
              audioBlob.name = 'voice-message.webm';
              // @ts-ignore - this is a workaround
              audioBlob.lastModified = new Date();
              // @ts-ignore - this is a workaround
              setSelectedFile(audioBlob as File);
            }
            
            // Reset audio chunks
            setAudioChunks([]);
          }
        }
      }
      
      setIsRecording(!isRecording);
    }
  };

  // Get other participant in direct chat
  const getOtherParticipant = () => {
    if (!participants || participants.length === 0) return null;
    
    return participants.find((p: { user: { id: number } }) => p.user.id !== user?.id)?.user;
  };

  // Format message time
  const formatMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return 'Unknown time';
    }
  };

  // Loading state
  if (loadingRoom || loadingMessages || loadingParticipants) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No room or messages
  if (!chatRoom) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-muted-foreground">No chat selected</p>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={otherParticipant?.avatarUrl || ''} />
            <AvatarFallback>
              {otherParticipant?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold">{otherParticipant?.fullName || otherParticipant?.username || 'User'}</h3>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Users className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Participants</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                {participants?.map((participant: { userId: number, user: { id: number, avatarUrl?: string, username?: string, fullName?: string } }) => (
                  <div key={participant.userId} className="flex items-center gap-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={participant.user.avatarUrl || ''} />
                      <AvatarFallback>
                        {participant.user.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{participant.user.fullName || participant.user.username}</p>
                      {participant.user.id === user?.id && (
                        <Badge variant="secondary" className="text-xs">You</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Users className="mr-2 h-4 w-4" />
                View Shared Files
              </DropdownMenuItem>
              <DropdownMenuItem>
                <ChevronRight className="mr-2 h-4 w-4" />
                Forward Messages
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <p className="text-muted-foreground text-center">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages?.map((message: { id: number, user: { id: number, fullName?: string, username?: string }, content: string, createdAt: string }) => (
              <div
                key={message.id}
                className={cn(
                  "flex flex-col max-w-[80%] rounded-lg p-3",
                  message.user.id === user?.id
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-secondary"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">
                    {message.user.id === user?.id ? 'You' : (message.user.fullName || message.user.username)}
                  </span>
                </div>
                <p>{message.content}</p>
                <span className="text-xs self-end mt-1 opacity-70">
                  {formatMessageTime(message.createdAt)}
                </span>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center gap-2 p-2 border-t">
          <div className="flex-1 flex items-center gap-2 p-2 bg-secondary rounded-md">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="h-5 w-5" />
            ) : selectedFile.type.startsWith('audio/') ? (
              <Mic className="h-5 w-5" />
            ) : (
              <File className="h-5 w-5" />
            )}
            <span className="text-sm truncate">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">
              {(selectedFile.size / 1024).toFixed(0)} KB
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Input area */}
      <div className="flex items-center p-3 border-t">
        <div className="relative mr-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAttachmentOptions(!showAttachmentOptions)}
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          {showAttachmentOptions && (
            <div className="absolute bottom-full left-0 mb-2 p-2 bg-background border rounded-md shadow-md flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachmentOptions(false);
                      }}
                    >
                      <File className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Document</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setShowAttachmentOptions(false);
                      }}
                    >
                      <Image className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Image</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn(isRecording && "text-destructive")}
          onClick={handleVoiceRecording}
        >
          {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        
        <Input
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 mx-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        
        <Button
          disabled={(!messageInput.trim() && !selectedFile) || uploadFileMutation.isPending}
          onClick={handleSendMessage}
        >
          {uploadFileMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <SendHorizonal className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}