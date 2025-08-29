// Electron Forge configuration file
// Defines packaging, makers, plugins, and build options for the app

import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';


const config: ForgeConfig = {
  // Packager options for Electron app
  packagerConfig: {
    // Disabling asar packaging prevents certain bugs during testing
    asar: false,
  },
  rebuildConfig: {},

  // Makers: define how to package the app for different platforms
  makers: [
    new MakerSquirrel({}), // Windows installer
    new MakerZIP({}, ['darwin']), // macOS ZIP
    new MakerRpm({}), // Linux RPM
    new MakerDeb({}), // Linux DEB
  ],

  // Plugins: Webpack for bundling, Fuses for advanced Electron options
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html', // Main HTML entry
            js: './src/renderer.tsx', // Main renderer entry
            name: 'main_window',
            preload: {
              js: './src/preload.ts', // Preload script for secure IPC
            },
          },
        ],
      },
    }),
    // Fuses plugin: advanced Electron runtime options
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: true, // Enable Node.js integration
      [FuseV1Options.EnableCookieEncryption]: true, // Secure cookies
      [FuseV1Options.EnableNodeCliInspectArguments]: true, // Enable debugging
    }),
  ],
};

// Export the Forge configuration
export default config;
