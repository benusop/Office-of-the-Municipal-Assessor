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
      chunkSizeWarningLimit: 1600, // Increased limit to suppress warning
      rollupOptions: {
        output: {
          manualChunks: {
            // Split vendor code into separate chunks for better caching and performance
            vendor: ['react', 'react-dom'],
            charts: ['recharts'],
            utils: ['jspdf', 'jspdf-autotable', 'html2canvas', 'lucide-react'],
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