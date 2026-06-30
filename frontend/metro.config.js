const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Metro statically picks the "import" condition from a package's package.json
// `exports` map for any `import ... from "pkg"` source statement, regardless
// of platform. zustand's "import" condition points at a pre-built ESM file
// containing a literal `import.meta` (used for Vite/webpack env detection),
// which is a syntax error once Metro bundles it into a classic (non-module)
// script for the web platform. Disabling exports-map resolution falls back
// to plain `mainFields`, which correctly resolves the CJS build instead.
config.resolver.unstable_enablePackageExports = false;

module.exports = withNativeWind(config, { input: "./global.css" });
