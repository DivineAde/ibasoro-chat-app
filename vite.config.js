import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "ìbáṣọ̀rọ̀",
        short_name: "ìbáṣọ̀rọ̀",
        description: "Fast, private, real-time conversations.",
        start_url: "/chat",
        display: "standalone",
        background_color: "#f7f5f1",
        theme_color: "#3440b5",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      // Only the app shell is precached. API and socket traffic is cross-origin
      // and never touched by the service worker.
      workbox: { navigateFallback: "/index.html", globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2}"] },
    }),
  ],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.js"],
    css: false,
  },
});
