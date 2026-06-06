const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Block react-native-screens fabric TypeScript source files
// Metro should use the compiled JS versions instead
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Exclude fabric TS files from react-native-screens
config.resolver.blockList = [
  /node_modules\/react-native-screens\/src\/fabric\/.*/,
];

module.exports = config;
