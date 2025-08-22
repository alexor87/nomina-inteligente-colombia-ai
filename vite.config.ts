
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split CSS into smaller chunks
          if (id.includes('node_modules')) {
            if (id.includes('@radix-ui')) {
              return 'radix-ui';
            }
            if (id.includes('tailwindcss') || id.includes('postcss')) {
              return 'styles';
            }
            return 'vendor';
          }
          // Split by route/page for better code splitting
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1].split('/')[0].replace('.tsx', '').replace('.ts', '');
            return `page-${pageName.toLowerCase()}`;
          }
        },
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(css)$/.test(assetInfo.name)) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    target: 'esnext',
    minify: 'esbuild',
  },
  css: {
    devSourcemap: true,
  },
}));
