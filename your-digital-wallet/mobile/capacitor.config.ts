import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "io.netlifegy.gyds",
  appName: "GYDS Wallet",
  webDir: "../dist",
  // To load the published web build instead of bundled assets, uncomment:
  // server: { url: "https://YOUR-DOMAIN", cleartext: false },
  backgroundColor: "#0f1318",
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#0f1318",
      androidSplashResourceName: "splash",
    },
    PushNotifications: { presentationOptions: ["badge", "sound", "alert"] },
  },
};

export default config;
