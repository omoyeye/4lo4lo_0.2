#!/usr/bin/env node

// Comprehensive deployment fix for the webapp
import fs from 'fs';
import path from 'path';

console.log('Starting deployment fix...');

// 1. Check if dist directory exists and create production build
const distExists = fs.existsSync('./dist');
const publicExists = fs.existsSync('./dist/public');

if (!distExists || !publicExists) {
  console.log('Missing build files. Run npm run build first.');
  process.exit(1);
}

// 2. Create a simple index.html fallback if missing
const indexPath = path.join('./dist/public/index.html');
if (!fs.existsSync(indexPath)) {
  console.log('Creating fallback index.html...');
  const fallbackHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Task Platform</title>
</head>
<body>
    <div id="root"></div>
    <script>
        // Simple fallback to detect loading issues
        setTimeout(() => {
            if (!document.querySelector('#root').children.length) {
                document.body.innerHTML = '<h1>Loading application...</h1><p>If this persists, please check the console for errors.</p>';
            }
        }, 5000);
    </script>
    <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
  
  fs.writeFileSync(indexPath, fallbackHTML);
}

console.log('Deployment fix completed.');