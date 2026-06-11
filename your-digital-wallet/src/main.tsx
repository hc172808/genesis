import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent service worker in iframe / preview environments
const isInIframe = (() => {
  try { return window.self !== window.top; } catch { return true; }
})();
const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((regs) =>
    regs.forEach((r) => r.unregister())
  );
} else {
  // Register the background alerts service worker (narrow scope, no nav intercept)
  import("./lib/alerts-sw-bridge").then((m) => m.registerAlertsSW()).catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);

// Dismiss splash screen after app renders (with fallback timeout)
const dismissSplash = () => {
  const splash = document.getElementById("splash-screen");
  if (splash && !splash.classList.contains("hide")) {
    splash.classList.add("hide");
    setTimeout(() => splash.remove(), 600);
  }
};
requestAnimationFrame(dismissSplash);
// Fallback: always dismiss after 3s even if render is slow
setTimeout(dismissSplash, 3000);
