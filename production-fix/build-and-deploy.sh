#!/bin/bash

# This script fixes the deployment issue by ensuring static files are correctly handled
# Run this before deploying

echo "Starting deployment fix for the application..."

# Step 1: Clean up any previous builds
echo "Cleaning up previous builds..."
rm -rf dist

# Step 2: Create special deployment variables file that will be picked up during build
echo "Creating deployment configuration..."
cat > ./deployment-config.json << EOL
{
  "production": true,
  "staticPath": "public",
  "timestamp": "$(date +%s)"
}
EOL

# Step 3: Run the build
echo "Building the application..."
NODE_ENV=production npm run build

# Step 4: Check if build was successful
if [ -d "./dist" ] && [ -d "./dist/public" ]; then
  echo "✅ Build completed successfully!"
else
  echo "❌ Build failed! Please check the error messages."
  exit 1
fi

echo "Deployment fix completed. Your app should now work when deployed."
echo "Please deploy your application now to see the changes."