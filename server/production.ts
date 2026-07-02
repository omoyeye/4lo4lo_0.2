import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Production logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.json;
  
  res.json = function(body) {
    const duration = Date.now() - start;
    console.log(`${new Date().toLocaleTimeString()} [express] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    return originalSend.call(this, body);
  };
  
  next();
});

async function startServer() {
  try {
    const server = await registerRoutes(app);

    // Production static file serving
    console.log("Setting up production static file serving...");
    
    const possiblePaths = [
      path.resolve(process.cwd(), "dist/public"),
      path.resolve(__dirname, "../dist/public"),
      path.resolve(__dirname, "public"),
      path.resolve(__dirname, "../public")
    ];
    
    let publicPath = null;
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        const indexFile = path.join(testPath, 'index.html');
        if (fs.existsSync(indexFile)) {
          publicPath = testPath;
          console.log(`Using static files from: ${publicPath}`);
          break;
        }
      }
    }
    
    if (publicPath) {
      // Serve static files with proper caching
      app.use(express.static(publicPath, {
        maxAge: '1d',
        etag: true,
        lastModified: true
      }));
      
      // SPA fallback for client-side routing
      app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        
        const indexPath = path.join(publicPath, 'index.html');
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).send('Error loading application');
          }
        });
      });
    } else {
      console.error('No static files found');
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.status(500).json({ 
            error: 'Application not built',
            message: 'Static files not found' 
          });
        }
      });
    }

    // Error handling middleware
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled error:", err);
      if (res.headersSent) {
        return next(err);
      }
      res.status(500).json({ error: "Internal server error" });
    });

    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();