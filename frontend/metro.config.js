/* eslint-env node */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver = {
	...config.resolver,
	// Silence export-map warnings from dependencies that deep-import CJS files.
	// Metro will fall back to file-based resolution instead.
	unstable_enablePackageExports: false,
};

// Force CJS interop for WalletConnect/Reown packages to avoid
// "Cannot assign to property 'default' which has only a getter" under new arch.
config.transformer = {
	...config.transformer,
	getTransformOptions: async () => ({
		transform: {
			experimentalImportSupport: false,
			inlineRequires: true,
		},
	}),
};

module.exports = config;

module.exports = config;
