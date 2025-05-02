import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting custom build script for Render deployment...');

// Make sure the dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
  console.log('Created dist directory');
}

// Skip Vite build for now and just build the server
try {
  console.log('Building server with esbuild...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
  console.log('Server build completed successfully');
} catch (error) {
  console.error('Error building server:', error);
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

console.log('Custom build completed successfully!');
