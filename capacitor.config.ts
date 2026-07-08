import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.glasses.app",
  appName: "Glasses",
  // Next.js static export lands here; Capacitor copies it into the native app.
  webDir: "out",
  backgroundColor: "#000000",
  plugins: {
    // Route fetch() through native HTTP on device. The timetable import calls
    // api.anthropic.com directly from the WebView; without this it would be
    // blocked by browser CORS.
    CapacitorHttp: { enabled: true },
  },
};

export default config;
