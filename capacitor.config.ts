import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.glasses.app",
  appName: "Glasses",
  // Next.js static export lands here; Capacitor copies it into the native app.
  webDir: "out",
  backgroundColor: "#000000",
  // CapacitorHttp is deliberately NOT enabled. Its fetch shim reads
  // `options.headers` as a plain object, but @google/genai passes a `Headers`
  // instance — so `x-goog-api-key` was silently dropped and Google answered 403,
  // which looked like a bad key. The WebView's own fetch handles Headers
  // correctly, and generativelanguage.googleapis.com serves CORS for API-key
  // requests (that is exactly what @google/genai's web build is built for).
};

export default config;
