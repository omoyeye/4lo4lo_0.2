// This file helps prepare the application for deployment
// It ensures the correct paths are used for static files in production

import fs from 'fs';
import path from 'path';

// Function to check if build directory exists
function checkBuildDirectory() {
  const distPath = path.resolve(process.cwd(), 'dist');
  const publicPath = path.resolve(distPath, 'public');
  
  if (!fs.existsSync(distPath)) {
    console.error('Error: dist directory not found! Please run npm run build first.');
    return false;
  }
  
  if (!fs.existsSync(publicPath)) {
    console.error('Error: dist/public directory not found! Build may be incomplete.');
    return false;
  }
  
  return true;
}

// Run the check
if (checkBuildDirectory()) {
  console.log('✅ Build directories verified. Application is ready for deployment.');
} else {
  console.log('❌ Build verification failed. Please check the errors above.');
}