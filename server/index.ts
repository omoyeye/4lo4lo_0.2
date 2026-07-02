import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// ES module compatibility for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure __dirname is properly defined in production
if (typeof __dirname === 'undefined') {
  throw new Error('__dirname is not defined. This is likely an ES module compilation issue.');
}

// Production-safe logging
const log = console.log;

// Validate critical environment variables on startup
if (process.env.NODE_ENV === 'production') {
  if (!process.env.MYSQL_DB_NAME) {
    console.error('❌ FATAL ERROR: MYSQL_DB_NAME is required in production');
    process.exit(1);
  }
  console.log('✅ MySQL database configured:', process.env.MYSQL_DB_NAME);
} else {
  if (!process.env.MYSQL_DB_HOST) {
    console.warn('⚠️  WARNING: MYSQL_DB_HOST not set — defaulting to localhost');
  }
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server for WebSocket integration
  const httpServer = createServer(app);
  const server = await registerRoutes(app, httpServer);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Production mode
  if (process.env.NODE_ENV === "production") {
    console.log('🏭 Running in production mode');
    console.log('📂 Current working directory:', process.cwd());
    console.log('📁 __dirname:', __dirname);

    // In production, the static files should be in the same directory as the server
    // Since this file is bundled to dist/index.js, the public folder should be at dist/public
    const publicPath = path.join(__dirname, 'public');
    const fallbackPath = path.join(process.cwd(), 'dist', 'public');

    const actualPublicPath = fs.existsSync(publicPath) ? publicPath : fallbackPath;

    console.log('🔍 Looking for static files at:', actualPublicPath);
    console.log('📂 Static path exists:', fs.existsSync(actualPublicPath));

    if (fs.existsSync(actualPublicPath)) {
      const indexPath = path.join(publicPath, 'index.html');
      console.log('📄 Index.html exists:', fs.existsSync(indexPath));

      if (fs.existsSync(indexPath)) {
        // List files for debugging
        try {
          const files = fs.readdirSync(publicPath);
          console.log('📄 Files in public directory:', files.slice(0, 10)); // Limit output
        } catch (e) {
          console.log('Could not list files:', e);
        }

        // Serve static files
        app.use(express.static(publicPath, {
          index: false, // Don't serve index.html automatically
          dotfiles: 'ignore',
          etag: true,
          lastModified: true,
          maxAge: '1d'
        }));

        // Handle SPA routing - serve index.html for all non-API routes
        app.get('*', (req, res) => {
          // Skip API routes
          if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }

          console.log(`🔄 Serving SPA route: ${req.path}`);
          res.sendFile(indexPath, (err) => {
            if (err) {
              console.error('Error serving index.html:', err);
              res.status(500).send('Error loading application');
            }
          });
        });

        console.log('✅ Production static file serving configured');
      } else {
        console.error('❌ index.html not found at:', indexPath);
        app.get('*', (req, res) => {
          if (req.path.startsWith('/api')) {
            return res.status(404).json({ error: 'API endpoint not found' });
          }
          res.status(500).send('Static files not properly built');
        });
      }
    } else {
      console.error('❌ Public directory not found at:', publicPath);

      // Debug: show what's actually in the dist directory
      try {
        const distContents = fs.readdirSync(__dirname);
        console.log('📁 Contents of dist directory:', distContents);
      } catch (e) {
        console.log('Could not read dist directory:', e);
      }

      app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.status(500).json({
          error: 'Build files missing',
          message: 'Static files not found. Please check build process.',
          expectedPath: publicPath,
          distContents: fs.existsSync(__dirname) ? fs.readdirSync(__dirname) : 'N/A'
        });
      });
    }
  } else {
    // Development mode - load vite dynamically
    try {
      const { setupVite } = await import("./vite.js");
      await setupVite(app, server);
    } catch (error) {
      console.error("Failed to setup Vite:", error);
    }
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 3001;


  // Use the HTTP server returned from registerRoutes for listening
  const actualServer = server || httpServer;

  // actualServer.listen({
  //   port: Number(port),
  //   host: "0.0.0.0",
  //   reusePort: true,
  // }, () => {
  //   log(`🚀 Server running on port ${port}`);
  //   log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
  //   log(`📂 Working directory: ${process.cwd()}`);
  // }).on('error', (err: any) => {
  //   console.error('❌ Server failed to start:', err);
  //   process.exit(1);
  // });

  actualServer.listen(port, () => {
    log(`🚀 Server running on port ${port}`);
    log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    log(`📂 Working directory: ${process.cwd()}`);
  });


})();