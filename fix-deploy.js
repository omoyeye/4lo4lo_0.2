// This script fixes the deployment issue
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure the server works correctly in production environment
function fixProductionServerConfig() {
  // Create a small modification to package.json to ensure correct paths are used
  const packageJsonPath = path.join(__dirname, 'package.json');
  
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Update the start script to include proper path handling
    packageJson.scripts.start = "NODE_ENV=production STATIC_PATH=./dist/public node dist/index.js";
    
    // Write the updated package.json
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
    console.log('✅ Updated package.json for better production deployment');
    
    return true;
  } catch (error) {
    console.error('❌ Error updating package.json:', error);
    return false;
  }
}

// Run the fix
fixProductionServerConfig();