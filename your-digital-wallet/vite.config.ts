import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const envLimit = process.env.VITE_PWA_MAX_FILE_SIZE
    ? parseInt(process.env.VITE_PWA_MAX_FILE_SIZE, 10)
    : NaN;
  const maxFileSize = Number.isFinite(envLimit)
    ? envLimit
    : mode === "development"
      ? 5 * 1024 * 1024
      : 2 * 1024 * 1024;

  return {
    server: {
      host: "0.0.0.0",
      port: 5000,
      allowedHosts: true,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: { enabled: false },
        workbox: {
          navigateFallback: "index.html",
          navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//],
          globPatterns: ["**/*.{css,html,ico,png,svg,webp,woff2}"],
          globIgnores: ["**/assets/index-*.js"],
          maximumFileSizeToCacheInBytes: maxFileSize,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "html", networkTimeoutSeconds: 3 },
            },
            {
              urlPattern: ({ request, url }) =>
                request.destination === "script" && url.pathname.startsWith("/assets/"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "js-assets",
                expiration: {
                  maxEntries: 24,
                  maxAgeSeconds: 60 * 60 * 24 * 14,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: ({ request, url }) =>
                url.pathname.startsWith("/assets/") &&
                ["style", "image", "font"].includes(request.destination),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "static-assets",
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                  purgeOnQuotaError: true,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/rpc\.netlifegy\.com\/.*/i,
              handler: "NetworkFirst",
              options: {
                cacheName: "rpc-cache",
                expiration: { maxEntries: 50, maxAgeSeconds: 60 },
                networkTimeoutSeconds: 5,
              },
            },
          ],
        },
        manifest: {
          name: "GYDS Wallet",
          short_name: "GYDS",
          description: "GYDS Network Wallet — send, receive, swap, and manage GYDS & GYD on the go.",
          theme_color: "#0f1318",
          background_color: "#0f1318",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          scope: "/",
          categories: ["finance", "utilities"],
          icons: [
            { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
