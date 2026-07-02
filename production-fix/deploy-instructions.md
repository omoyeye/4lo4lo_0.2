# Deployment Fix Instructions

Follow these steps to fix the blank page issue when deploying your app:

## Pre-Deployment Steps

1. Before deploying, run these commands in your Replit Shell:

```bash
# Ensure the directories are clean
rm -rf dist

# Run the build
npm run build

# Create the fix for static files
mkdir -p dist/public-copy
cp -r dist/public/* dist/public-copy/
```

2. Then modify the server code to handle static files correctly:

```bash
# Open server/index.ts in the editor
# Add the following code after line 56 (in the 'else' block after serveStatic(app)):

if (process.env.NODE_ENV === 'production') {
  const publicPath = path.resolve(process.cwd(), 'dist/public-copy');
  if (fs.existsSync(publicPath)) {
    app.use(express.static(publicPath));
    app.use('*', (req, res) => {
      res.sendFile(path.resolve(publicPath, 'index.html'));
    });
  }
}
```

## Deployment Steps

1. After making these changes, deploy your application to Replit
2. Your app should now work correctly without showing a blank page

## Why This Works

This fix ensures that the static files are correctly served in the production environment by:
1. Creating a copy of the static files in a location the production server can find
2. Adding fallback code to serve these files if the default location doesn't work