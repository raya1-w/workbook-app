import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create project uploads directory
const projectUploadsDir = path.join(uploadsDir, 'projects');
if (!fs.existsSync(projectUploadsDir)) {
  fs.mkdirSync(projectUploadsDir, { recursive: true });
}

// Configure project file storage
const projectStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const projectId = req.params.projectId;
    const projectDir = path.join(projectUploadsDir, projectId);
    
    // Create directory for this project if it doesn't exist
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    
    cb(null, projectDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// Configure storage for chat file attachments
const chatStorage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const roomId = req.params.roomId;
    const chatDir = path.join(uploadsDir, 'chats', roomId);
    
    // Create directory for this chat room if it doesn't exist
    if (!fs.existsSync(chatDir)) {
      fs.mkdirSync(chatDir, { recursive: true });
    }
    
    cb(null, chatDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

// File filter to limit allowed file types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file types
  const allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'text/csv',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/svg+xml',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    
    // Others
    'application/json',
    'text/markdown',
  ];
  
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed.`));
  }
};

// Create multer upload middleware for projects
export const projectUpload = multer({
  storage: projectStorage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Create multer upload middleware for chat attachments
export const chatUpload = multer({
  storage: chatStorage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for chat attachments
  },
});

// Helper function to delete a file
export const deleteFile = (filePath: string) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }
  return false;
};

// Helper to get file URL from file path
export const getFileUrl = (filePath: string) => {
  const relativePath = path.relative(uploadsDir, filePath);
  return `/uploads/${relativePath.replace(/\\/g, '/')}`;
};