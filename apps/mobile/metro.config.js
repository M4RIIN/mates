const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const zustandCjsModules = new Set([
  "zustand",
  "zustand/middleware",
  "zustand/react",
  "zustand/vanilla"
]);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && zustandCjsModules.has(moduleName)) {
    return {
      type: "sourceFile",
      filePath: require.resolve(moduleName, { paths: [__dirname] })
    };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
