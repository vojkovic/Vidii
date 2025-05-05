import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './app'),
    },
  },
  server: {
    port: 3000,
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
}); 