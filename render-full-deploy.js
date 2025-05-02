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
  // Move client files to a location where they can be processed
  console.log('Preparing the client source code...');
  execSync('mkdir -p ./client-build && cp -r ./client/* ./client-build/', { stdio: 'inherit' });
  
  // Modify the client code to use the production API URLs
  console.log('Modifying client code for production...');
  // Create a small production config file
  const prodConfigContent = `
// Production configuration
export const API_URL = '';  // Empty string means same domain
export const IS_PRODUCTION = true;
  `;
  fs.writeFileSync('./client-build/src/config.js', prodConfigContent);
  
  // Install required build dependencies
  console.log('Installing build dependencies...');
  execSync('npm install -D esbuild vite @vitejs/plugin-react', { stdio: 'inherit' });
  
  // Build the client with Vite
  console.log('Building client application...');
  // Create a minimal vite config for client build
  const viteConfigContent = `
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/public',
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
  `;
  fs.writeFileSync('./client-build/vite.config.js', viteConfigContent);
  
  // Run the build using the local vite installation
  process.chdir('./client-build');
  console.log('Running Vite build...');
  execSync('npx vite build', { stdio: 'inherit' });
  process.chdir('..');
  
  // Build the server with esbuild (using production version of vite.ts)
  console.log('Building server application...');
  
  // Create a production version of vite.ts that points to the built client files
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
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  // Restore original vite.ts
  fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
  fs.unlinkSync('server/vite.ts.bak');
  
  // Clean up build directory
  console.log('Cleaning up...');
  execSync('rm -rf ./client-build', { stdio: 'inherit' });
  
  console.log('Full application build completed successfully!');
  
} catch (error) {
  console.error('Error during build:', error);
  
  // Restore original vite.ts if it exists
  if (fs.existsSync('server/vite.ts.bak')) {
    console.log('Restoring original vite.ts after error');
    fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
    fs.unlinkSync('server/vite.ts.bak');
  }
  
  // Clean up build directory even if there was an error
  console.log('Cleaning up after error...');
  execSync('rm -rf ./client-build', { stdio: 'inherit' });
  
  process.exit(1);
}
