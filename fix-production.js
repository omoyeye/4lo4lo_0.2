/**
 * This file modifies the server/vite.ts file to correctly handle static files in production
 * This should fix the deployment issue with the blank page
 */

import fs from 'fs';
import path from 'path';

// Path to the vite.ts file
const filePath = path.resolve('server', 'vite.ts');

// Read the file content
try {
  const content = fs.readFileSync(filePath, 'utf8');

  // Replace the code that handles static file paths in production
  const updatedContent = content.replace(
    `export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      \`Could not find the build directory: \${distPath}, make sure to build the client first\`,
    );
  }`,
    `export function serveStatic(app: Express) {
  // Check multiple possible paths for the static files
  let distPath = path.resolve(__dirname, "public");
  
  // If the path doesn't exist in production mode, try alternative paths
  if (!fs.existsSync(distPath)) {
    const altPath1 = path.resolve(process.cwd(), "dist/public");
    const altPath2 = path.resolve(process.cwd(), "public");
    const altPath3 = path.resolve(__dirname, "../public");
    
    if (fs.existsSync(altPath1)) {
      distPath = altPath1;
      console.log("Using alternate path 1 for static files:", distPath);
    } else if (fs.existsSync(altPath2)) {
      distPath = altPath2;
      console.log("Using alternate path 2 for static files:", distPath);
    } else if (fs.existsSync(altPath3)) {
      distPath = altPath3;
      console.log("Using alternate path 3 for static files:", distPath);
    } else {
      throw new Error(
        \`Could not find the build directory: \${distPath}, make sure to build the client first\`,
      );
    }
  }`
  );

  // Write the updated content back to the file
  fs.writeFileSync(filePath, updatedContent, 'utf8');
  console.log('✅ Successfully updated server/vite.ts to fix deployment issue');
} catch (error) {
  console.error('❌ Error updating server/vite.ts:', error);
}