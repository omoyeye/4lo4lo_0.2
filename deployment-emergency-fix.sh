#!/bin/bash

# Emergency deployment fix for blank page issue
echo "Applying emergency deployment fix..."

# 1. Create the build directory structure if it doesn't exist
mkdir -p dist/public

# 2. Build the frontend only (skip server build for now)
echo "Building frontend..."
cd client && npx vite build --outDir ../dist/public

# 3. Copy a simple server file for production
echo "Creating production server..."
cd ..
cat > dist/index.js << 'EOF'
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

echo "Emergency fix complete. Deploy the application now."