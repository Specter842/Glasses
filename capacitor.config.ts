import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.productivityos.app",
  appName: "Productivity OS",
  // Next.js static export lands here; Capacitor copies it into the native app.
  webDir: "out",
  backgroundColor: "#000000",
};

export default config;
