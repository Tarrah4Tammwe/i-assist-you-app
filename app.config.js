export default {
  expo: {
    name: "i assist you",
    slug: "i-assist-you",
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
      // @react-native-voice/voice plugin configured at build time only (not needed for local dev)
    ],
    updates: {
      enabled: false,
    },
    scheme: "iassistyou",
    experiments: {
      typedRoutes: true,
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: "785a5784-e5e0-4383-bb23-e92cb1b2b7de",
      },
    },
  },
};
