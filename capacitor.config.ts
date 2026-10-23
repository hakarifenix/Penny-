import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.pennytrack.app",
  appName: "PennyTrack",
  webDir: "dist",
  backgroundColor: "#0B1020",
  android: {
    backgroundColor: "#0B1020",
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
