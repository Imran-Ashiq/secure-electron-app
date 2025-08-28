import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    // THIS IS THE FIX.
    // Disabling asar packaging prevents the "Cannot access 's'" bug
    // during testing.
    asar: false,
  },
  rebuildConfig: {},
  makers: [new MakerSquirrel({}), new MakerZIP({}, ['darwin']), new MakerRpm({}), new MakerDeb({})],
  plugins: [
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.tsx',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    // The Fuses plugin is fine to keep, but the AutoUnpackNativesPlugin must be removed.
    new FusesPlugin({
      version: FuseVersion.V1,
      // The values must be simple booleans (true/false). This was my mistake.
      [FuseV1Options.RunAsNode]: true,
      [FuseV1Options.EnableCookieEncryption]: true,
      // THIS IS THE KEY FIX: Set the value to `true` to allow debugging.
      [FuseV1Options.EnableNodeCliInspectArguments]: true,
    }),
  ],
};

export default config;
