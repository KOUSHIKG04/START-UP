const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Reduce simultaneous file operations when Metro builds the app.
config.maxWorkers = 2;

module.exports = config;
