import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { FileUploader } from "./file-uploader";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  FileIcon, 
  Download, 
  Trash, 
  MoreVertical, 
  File as FileSymbol,
  FileText,
  FileImage,
  FileArchive,
  FileSpreadsheet,
  FilePieChart,
  FileQuestion,
} from "lucide-react";

interface ProjectFile {
  id: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  description: string | null;
  projectId: number;
  uploadedBy: number;
  createdAt: string;
  updatedAt: string;
  url: string;
  uploader: {
    id: number;
    username: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

interface FileListProps {
  projectId: number;
  currentUserId: number;
  className?: string;
}

export function FileList({ projectId, currentUserId, className }: FileListProps) {
  const [fileToDelete, setFileToDelete] = useState<ProjectFile | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files, isLoading, error } = useQuery<ProjectFile[]>({
    queryKey: [`/api/projects/${projectId}/files`],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}/files/${fileId}`);
    },
    onSuccess: () => {
      // Invalidate queries to refetch files list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      
      // Show success toast
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
      
      // Close delete dialog
      setFileToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Deletion failed",
        description: error.message || "An error occurred while deleting the file.",
        variant: "destructive",
      });
    },
  });

  const confirmDelete = (file: ProjectFile) => {
    setFileToDelete(file);
  };

  const handleDelete = () => {
    if (fileToDelete) {
      deleteMutation.mutate(fileToDelete.id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="h-10 w-10 text-blue-500" />;
    } else if (fileType.includes('pdf')) {
      return <FileText className="h-10 w-10 text-red-500" />;
    } else if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className="h-10 w-10 text-green-500" />;
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
      return <FilePieChart className="h-10 w-10 text-orange-500" />;
    } else if (fileType.includes('zip') || fileType.includes('compressed') || fileType.includes('rar')) {
      return <FileArchive className="h-10 w-10 text-purple-500" />;
    } else if (fileType.includes('text') || fileType.includes('document')) {
      return <FileText className="h-10 w-10 text-gray-500" />;
    } else {
      return <FileSymbol className="h-10 w-10 text-gray-500" />;
    }
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || '';
  };

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Project Files</h3>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="p-4">
                <Skeleton className="h-5 w-3/4" />
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Project Files</h3>
          <FileUploader projectId={projectId} />
        </div>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <p className="text-red-600">Error loading files: {error.message}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Project Files</h3>
        <FileUploader projectId={projectId} />
      </div>

      {files && files.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="flex flex-col items-center justify-center py-10 text-center">
            <FileIcon className="h-12 w-12 text-muted-foreground/60 mb-3" />
            <h3 className="font-medium text-lg">No files uploaded yet</h3>
            <p className="text-muted-foreground mt-1">
              Upload files to share with your team members
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {files?.map((file) => (
            <Card key={file.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="p-4 pb-0">
                <CardTitle className="text-base font-medium truncate" title={file.fileName}>
                  {file.fileName}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {getFileIcon(file.fileType)}
                  <div>
                    <Badge variant="outline" className="font-mono text-xs">
                      {getFileExtension(file.fileName)}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(file.fileSize)}
                    </p>
                  </div>
                </div>
                {file.description && (
                  <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                    {file.description}
                  </p>
                )}
              </CardContent>
              <CardFooter className="p-4 pt-0 flex justify-between">
                <div className="text-xs text-muted-foreground">
                  {new Date(file.createdAt).toLocaleDateString()}
                </div>
                <div className="flex gap-2">
                  <Button asChild size="icon" variant="ghost">
                    <a href={file.url} download={file.fileName} target="_blank" rel="noopener noreferrer">
                      <Download size={16} />
                    </a>
                  </Button>
                  {(currentUserId === file.uploader.id) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => confirmDelete(file)}
                        >
                          <Trash size={16} className="mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={fileToDelete !== null} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <span className="font-medium">{fileToDelete?.fileName}</span>? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setFileToDelete(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}