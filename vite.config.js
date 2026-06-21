import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import geminiHandler from './api/gemini.js';

export default defineConfig(({ mode }) => {
  // Load environment variables (like GEMINI_API_KEY) from .env files
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GEMINI_API_KEY) {
    process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  }

  return {
    plugins: [
      react(),
      {
        name: 'api-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            if (urlObj.pathname === '/api/gemini') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              req.on('end', async () => {
                try {
                  req.body = body ? JSON.parse(body) : {};
                } catch (e) {
                  req.body = {};
                }
                
                req.query = Object.fromEntries(urlObj.searchParams.entries());

                // Mock Vercel response helper methods status and json
                res.status = (statusCode) => {
                  res.statusCode = statusCode;
                  return res;
                };
                res.json = (data) => {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return res;
                };

                try {
                  await geminiHandler(req, res);
                } catch (err) {
                  console.error('Error in local API dev server middleware:', err);
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
                }
              });
            } else {
              next();
            }
          });
        }
      }
    ],
    base: process.env.VITE_BASE_PATH || "/react-vite-deploy",
    envPrefix: ['VITE_'],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      globals: true
    }
  };
});

