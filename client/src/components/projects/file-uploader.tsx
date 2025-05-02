import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileUp } from "lucide-react";

interface FileUploaderProps {
  projectId: number;
  onSuccess?: () => void;
}

export function FileUploader({ projectId, onSuccess }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async ({ file, description }: { file: File, description: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (description) {
        formData.append("description", description);
      }

      // Custom implementation for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              resolve(response);
            } catch (error) {
              reject(new Error("Invalid response format"));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred during upload"));
        });
        
        xhr.open("POST", `/api/projects/${projectId}/files`);
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      // Reset form
      setFile(null);
      setDescription("");
      setUploadProgress(0);
      setIsDialogOpen(false);
      
      // Invalidate queries to refetch files list
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/files`] });
      
      // Show success toast
      toast({
        title: "File uploaded",
        description: "Your file has been uploaded successfully.",
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the file.",
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    uploadMutation.mutate({ file, description });
  };

  const clearSelectedFile = () => {
    setFile(null);
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp size={16} />
          Upload File
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="file">File</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className={file ? "hidden" : ""}
                  disabled={uploadMutation.isPending}
                />
                {file && (
                  <div className="flex items-center justify-between w-full p-2 border rounded-md">
                    <span className="truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={clearSelectedFile}
                      disabled={uploadMutation.isPending}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this file"
                disabled={uploadMutation.isPending}
              />
            </div>
            {uploadMutation.isPending && (
              <div className="space-y-2">
                <Label>Upload Progress</Label>
                <Progress value={uploadProgress} className="h-2" />
                <p className="text-xs text-right">{uploadProgress}%</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={uploadMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!file || uploadMutation.isPending}
              className="gap-2"
            >
              {uploadMutation.isPending ? (
                <>
                  <Upload className="animate-bounce" size={16} />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={16} />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}