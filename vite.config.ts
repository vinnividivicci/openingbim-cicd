/* eslint-disable import/no-extraneous-dependencies */
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
});
