#!/bin/bash

echo "Building application for deployment..."

# Create dist directory structure
mkdir -p dist/public

# Build frontend with timeout protection
timeout 120s npx vite build --outDir dist/public || {
    echo "Frontend build timed out or failed, creating fallback..."
    
    # Create minimal fallback HTML
    cat > dist/public/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Social Media Task Platform</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .loading { text-align: center; color: #666; }
        .error { color: #d73a49; background: #ffeef0; padding: 12px; border-radius: 6px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="loading">
            <h1>Social Media Task Platform</h1>
            <p>Application is starting up...</p>
            <div id="status">Checking server connection...</div>
        </div>
    </div>
    
    <script>
        // Check if server is responding
        async function checkServer() {
            try {
                const response = await fetch('/api/user');
                if (response.status === 401 || response.status === 200) {
                    // Server is running, redirect to development URL
                    window.location.href = '/auth';
                }
            } catch (error) {
                document.getElementById('status').innerHTML = 
                    '<div class="error">Server not responding. Please check deployment logs.</div>';
                console.error('Server check failed:', error);
            }
        }
        
        // Check server every 2 seconds
        checkServer();
        setInterval(checkServer, 2000);
    </script>
</body>
</html>
EOF
}

# Build server
echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --external:pg-native

echo "Build completed."