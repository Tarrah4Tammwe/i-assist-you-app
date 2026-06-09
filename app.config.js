export default {
  expo: {
    name: "i assist you",
    slug: "iassist",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    backgroundColor: "#0a0d14",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#0a0d14",
    },
    updates: {
      enabled: false,
      checkAutomatically: "NEVER",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0a0d14",
      },
      package: "com.iassistyou.app",
      permissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    ios: {
      bundleIdentifier: "com.iassistyou.app",
      supportsTablet: false,
      infoPlist: {
        NSMicrophoneUsageDescription:
          "i assist you uses your microphone for voice input so you can brain-dump and capture thoughts hands-free.",
        NSLocationWhenInUseUsageDescription:
          "i assist you uses your location to calculate travel time to appointments.",
        NSSpeechRecognitionUsageDescription:
          "i assist you uses speech recognition so you can dictate tasks and notes.",
      },
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0a0d14",
          image: "./assets/splash.png",
          imageWidth: 200,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            kotlinVersion: "2.0.21",
            newArchEnabled: false,
          },
        },
      ],
    ],
    scheme: "iassistyou",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: "https://luyknuzzctygtyhefliv.supabase.co",
      supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1eWtudXp6Y3R5Z3R5aGVmbGl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NzcxOTUsImV4cCI6MjA5MzI1MzE5NX0.xBbkFeVtY5cZfKrpQFN5ym7PAAh4A-wuC56ksAhUT-I",
      eas: {
        projectId: "78d0e204-359e-44ef-b655-3a3218d4468c",
      },
    },
  },
};
