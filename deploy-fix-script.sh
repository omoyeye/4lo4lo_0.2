#!/bin/bash

# This script helps fix deployment issues for Replit apps

echo "Starting deployment fix..."

# 1. Clean up any existing build files
echo "Cleaning up old build files..."
rm -rf dist

# 2. Run the build process
echo "Building application..."
npm run build

# 3. Verify the build was successful
if [ -d "./dist" ] && [ -d "./dist/public" ]; then
  echo "✅ Build successful!"
else
  echo "❌ Build failed - dist directories not created properly"
  exit 1
fi

# 4. Create a .deploy file to signal to Replit this is ready for deployment
echo "NODE_ENV=production" > .deploy

echo "Deployment fix complete! Your app should now deploy correctly."
echo "Please deploy your application to growsocial.replit.app now."