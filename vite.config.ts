import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      chunkSizeWarningLimit: 2000, // Increased limit to suppress warnings for large dependencies
      rollupOptions: {
        output: {
          manualChunks: {
            // Split large libraries into separate chunks
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', 'recharts'],
            utils: ['html2canvas', 'jspdf', 'jspdf-autotable'],
            ai: ['@google/genai']
          }
        }
      }
    },
    define: {
      // Define process.env.API_KEY so it is replaced with the actual string value at build time.
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});