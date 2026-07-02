#!/bin/bash

# Clean up any existing build files
rm -rf dist

# Build both client and server
npm run build

# Make sure the server can find the static files
if [ -d "./dist/public" ]; then
  echo "✅ Build completed successfully"
  echo "Your app is ready for deployment"
else
  echo "❌ Build failed or output directory structure is incorrect"
  exit 1
fi