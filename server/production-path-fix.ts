import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// This function adds additional static file handling for production mode
// It should be called in server/index.ts right after the serveStatic call
export function setupProductionPaths(app: express.Express): void {
  // Only run in production mode
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  // Check additional paths for static files in production
  const productionPaths = [
    path.resolve(process.cwd(), 'dist/public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../public'),
    path.resolve(__dirname, '../dist/public')
  ];

  for (const prodPath of productionPaths) {
    if (fs.existsSync(prodPath)) {
      console.log(`Using additional production static path: ${prodPath}`);
      
      // Serve static files from this path
      app.use(express.static(prodPath));
      
      // Setup additional fallback for SPA routing
      app.use('*', (req, res, next) => {
        const indexPath = path.resolve(prodPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
      
      break;
    }
  }
}