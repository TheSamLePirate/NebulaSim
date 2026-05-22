import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mkcert from "vite-plugin-mkcert";


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['macbook-pro-de-olivier.local'],
    },
    preview: {
      allowedHosts: ['macbook-pro-de-olivier.local'],
      port: 443,
    },
    plugins: [
      react(),
      tailwindcss(),
      mkcert({
        hosts: ["macbook-pro-de-olivier.local"], // important: le hostname doit être dans le cert
      }),
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
