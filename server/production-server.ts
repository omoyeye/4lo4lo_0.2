
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { registerRoutes } from './routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// API Routes
registerRoutes(app);

// Production static file serving
const publicPath = path.resolve(process.cwd(), 'dist/public');
console.log('Looking for static files in:', publicPath);

if (fs.existsSync(publicPath)) {
  console.log('✅ Static files found, serving from:', publicPath);
  app.use(express.static(publicPath));

  // Handle SPA routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    const indexPath = path.join(publicPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send('Static files not found');
    }
  });
} else {
  console.error('❌ Static files not found at:', publicPath);
  app.get('*', (req, res) => {
    res.status(500).json({
      error: 'Static files not found',
      path: publicPath,
      message: 'Please run npm run build first'
    });
  });
}

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Production server running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${publicPath}`);
});
