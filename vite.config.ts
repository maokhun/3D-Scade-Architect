import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      modulePreload: {
        resolveDependencies(filename, deps) {
          if (filename.includes('index-')) {
            return deps.filter(dep => !dep.includes('three-') && !dep.includes('jscad-') && !dep.includes('markdown-') && !dep.includes('gemini-'));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            if (id.includes('@react-three') || id.includes('/three/')) return 'three';
            if (id.includes('@jscad')) return 'jscad';
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('micromark') || id.includes('mdast') || id.includes('hast')) return 'markdown';
            if (id.includes('@google/genai')) return 'gemini';
            if (id.includes('react') || id.includes('scheduler')) return 'react';
            return undefined;
          },
        },
      },
    },
  };
});
