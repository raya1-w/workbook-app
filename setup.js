const { execSync } = require('child_process');
const fs = require('fs');

// Create uploads directory if it doesn't exist
try {
  fs.mkdirSync('uploads', { recursive: true });
  console.log('Created uploads directory');
} catch (error) {
  console.log('Uploads directory already exists');
}

// Start the application
console.log('Starting application...');
execSync('npm start', { stdio: 'inherit' });
