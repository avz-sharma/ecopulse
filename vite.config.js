import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import geminiHandler from './api/gemini.js';

export default defineConfig({
  plugins: [react()],
  base: "/",
  envPrefix: ['VITE_', 'GEMINI_'],
});

