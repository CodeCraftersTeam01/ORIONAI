import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import apiRoutes from './routes/apiRoutes.js';
import itemRoutes from './routes/itemRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// 1. Hide Fingerprinting & Set Security HTTP Headers
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: false, // Managed by frontend bundle
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// 2. Logging in non-production
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 3. Payload limits (allows high-res images and file attachments up to 25MB)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 4. Strict CORS configuration
const allowedOrigins = [
  CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Akses diblokir oleh kebijakan keamanan CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours preflight cache
  })
);

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { exec } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const candidateDistPaths = [
  path.resolve(__dirname, '../../web/dist'),
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(process.cwd(), 'packages/web/dist'),
  path.resolve(process.cwd(), 'dist'),
];
const distPath = candidateDistPaths.find((p) => fs.existsSync(p)) || candidateDistPaths[0];
const hasDist = fs.existsSync(distPath);

if (hasDist) {
  // Serve static UI assets from web/dist
  app.use(express.static(distPath));
} else {
  // Root fallback route for API only mode
  app.get('/', (req, res) => {
    res.json({
      name: 'Orion AI API',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}

// Mount Routes
app.use('/api', apiRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/items', itemRoutes);

// SPA routing: any non-API GET request serves frontend index.html if dist exists
if (hasDist) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

/**
 * Open URL in default browser cross-platform
 */
export function openUrl(url) {
  const cmd =
    process.platform === 'darwin'
      ? `open "${url}"`
      : process.platform === 'win32'
      ? `start "" "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) {
      console.log(`🌐 Silakan buka browser di: ${url}`);
    }
  });
}

/**
 * Start Orion Agent server programmatically or for CLI
 */
export function startServer({ port = PORT, openBrowser = false } = {}) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      const actualPort = server.address().port;
      const url = `http://localhost:${actualPort}`;
      console.log(`\n🌌 Orion Agent aktif di ${url}`);
      console.log(`🛡️  Security Headers & CORS: Aktif`);
      console.log(`📡 Mode: ${hasDist ? 'Fullstack CLI (Web UI + API)' : 'API Service Only'}`);
      if (openBrowser) {
        console.log(`🌐 Membuka browser: ${url}`);
        openUrl(url);
      }
      resolve({ server, port: actualPort, url });
    });
    server.on('error', reject);
  });
}

// Start automatically if run directly via `node src/server.js`
const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  startServer();
}

export { app };

