import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting full application deployment build...');

// Ensure all required directories exist
const distDir = path.join(process.cwd(), 'dist');
const publicDir = path.join(distDir, 'public');
const uploadsDir = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
  console.log('Created dist directory');
}

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
  console.log('Created dist/public directory');
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
  console.log('Created uploads directory');
}

try {
  console.log('Starting with API-only build to ensure we have a working server...');
  // First run the API-only build to make sure we have a functioning application
  if (fs.existsSync('render-build.js') && fs.existsSync('render-frontend-build.js')) {
    execSync('node render-frontend-build.js', { stdio: 'inherit' });
    console.log('Successfully built static landing page');
  } else {
    console.log('Creating static landing page directly...');
    
    // Create a simple HTML file
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkBook Application</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      color: #2563eb;
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }
    .card {
      background: #f9fafb;
      border-radius: 8px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      margin: 2rem 0;
    }
    .button {
      background: #2563eb;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
      margin-top: 1rem;
    }
    .button:hover {
      background: #1d4ed8;
    }
    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin: 2rem 0;
    }
    .feature {
      background: #f3f4f6;
      padding: 1.5rem;
      border-radius: 6px;
    }
    .feature h3 {
      margin-top: 0;
      color: #2563eb;
    }
  </style>
</head>
<body>
  <h1>WorkBook Application</h1>
  
  <div class="card">
    <h2>Welcome to WorkBook</h2>
    <p>A comprehensive task management and team collaboration platform that enables real-time project tracking and intelligent workflow optimization with advanced messaging capabilities.</p>
    <a href="/api" class="button">Access API Documentation</a>
  </div>
  
  <h2>Key Features</h2>
  <div class="features">
    <div class="feature">
      <h3>Task Management</h3>
      <p>Organize tasks with priorities, deadlines, and assignees. Track time spent on each task.</p>
    </div>
    <div class="feature">
      <h3>Team Collaboration</h3>
      <p>Collaborate with team members through real-time chat and file sharing.</p>
    </div>
    <div class="feature">
      <h3>Project Tracking</h3>
      <p>Monitor project progress with Kanban-style boards and detailed analytics.</p>
    </div>
  </div>
  
  <div class="card">
    <h2>API Server Information</h2>
    <p>This is a deployed version of the WorkBook API server. The full client application interface is available in the development environment.</p>
    <p>For demonstration purposes, this landing page provides information about the application's capabilities.</p>
  </div>
  
  <footer>
    <p>&copy; 2025 WorkBook Application</p>
  </footer>
</body>
</html>`;

    // Write the HTML file
    fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml);
    console.log('Created static frontend landing page');

    // Create a simple API documentation page
    const apiHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WorkBook API Documentation</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    h1 {
      color: #2563eb;
    }
    pre {
      background: #f3f4f6;
      padding: 1rem;
      border-radius: 4px;
      overflow-x: auto;
    }
    .endpoint {
      background: #f9fafb;
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .method {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      color: white;
      font-weight: 600;
      margin-right: 0.5rem;
    }
    .get { background: #10b981; }
    .post { background: #3b82f6; }
    .put { background: #f59e0b; }
    .delete { background: #ef4444; }
  </style>
</head>
<body>
  <h1>WorkBook API Documentation</h1>
  
  <p>This page documents the available API endpoints for the WorkBook application.</p>
  
  <h2>Authentication</h2>
  
  <div class="endpoint">
    <h3><span class="method post">POST</span> /api/register</h3>
    <p>Register a new user account.</p>
    <p><strong>Request Body:</strong></p>
    <pre>{
  "username": "string",
  "email": "string",
  "password": "string",
  "fullName": "string"
}</pre>
  </div>
  
  <div class="endpoint">
    <h3><span class="method post">POST</span> /api/login</h3>
    <p>Authenticate a user and get session.</p>
    <p><strong>Request Body:</strong></p>
    <pre>{
  "username": "string",
  "password": "string"
}</pre>
  </div>
  
  <div class="endpoint">
    <h3><span class="method post">POST</span> /api/logout</h3>
    <p>End the current user session.</p>
  </div>
  
  <div class="endpoint">
    <h3><span class="method get">GET</span> /api/user</h3>
    <p>Get the current authenticated user's information.</p>
  </div>
  
  <h2>Projects</h2>
  
  <div class="endpoint">
    <h3><span class="method get">GET</span> /api/projects</h3>
    <p>Get all projects for the current user.</p>
  </div>
  
  <!-- Add more endpoints as needed -->
  
  <p><a href="/">&larr; Back to Home</a></p>
</body>
</html>`;

    // Write the API documentation file
    fs.writeFileSync(path.join(publicDir, 'api.html'), apiHtml);
    console.log('Created API documentation page');
  }

  // Create a production version of vite.ts that points to the static files
  console.log('Creating production server code...');
  const viteProductionContent = `
import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(\`\${formattedTime} [\${source}] \${message}\`);
}

// This is a placeholder to make the typechecker happy
// it's never called in production
export async function setupVite(_app: Express, _server: Server) {
  throw new Error("setupVite should not be called in production");
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");
  
  if (!fs.existsSync(distPath)) {
    console.error(\`Could not find the build directory: \${distPath}\`);
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html for SPA routes
  app.get("*", (req, res, next) => {
    // Skip API routes
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
`;
  
  // Backup and replace vite.ts
  fs.copyFileSync('server/vite.ts', 'server/vite.ts.bak');
  fs.writeFileSync('server/vite.ts', viteProductionContent);
  
  // Build the server
  console.log('Building server with esbuild...');
  execSync('npm install -D esbuild', { stdio: 'inherit' });
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  // Restore original vite.ts
  fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
  fs.unlinkSync('server/vite.ts.bak');
  
  console.log('API server build completed successfully!');
  
} catch (error) {
  console.error('Error during build:', error);
  
  // Restore original vite.ts if it exists
  if (fs.existsSync('server/vite.ts.bak')) {
    console.log('Restoring original vite.ts after error');
    fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
    fs.unlinkSync('server/vite.ts.bak');
  }
  
  process.exit(1);
}
