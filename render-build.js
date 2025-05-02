import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Starting server build script for Render deployment...');

// Make sure the dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
  console.log('Created dist directory');
}

// Build the frontend first
try {
  console.log('Building frontend...');
  execSync('node render-frontend-build.js', { stdio: 'inherit' });
  console.log('Frontend build completed');
} catch (error) {
  console.error('Error building frontend:', error);
  process.exit(1);
}

// Build the server
try {
  console.log('Building server with esbuild...');
  
  // Use vite-production.ts instead of vite.ts
  console.log('Backing up and replacing vite.ts with vite-production.ts');
  fs.copyFileSync('server/vite.ts', 'server/vite.ts.bak');
  fs.copyFileSync('server/vite-production.ts', 'server/vite.ts');
  
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  
  // Restore original vite.ts
  console.log('Restoring original vite.ts');
  fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
  fs.unlinkSync('server/vite.ts.bak');
  
  console.log('Server build completed successfully');
} catch (error) {
  console.error('Error building server:', error);
  
  // Try to restore original vite.ts if it exists
  if (fs.existsSync('server/vite.ts.bak')) {
    console.log('Restoring original vite.ts after error');
    fs.copyFileSync('server/vite.ts.bak', 'server/vite.ts');
    fs.unlinkSync('server/vite.ts.bak');
  }
  
  process.exit(1);
}

// Ensure uploads directory exists
try {
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
    console.log('Created uploads directory');
  }
} catch (error) {
  console.log('Error creating uploads directory:', error);
}

console.log('Build completed successfully!');
