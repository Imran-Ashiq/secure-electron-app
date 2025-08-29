
import type { ModuleOptions } from 'webpack';

/**
 * Webpack rules for module handling in Electron app
 * - Handles native modules, asset relocation, and TypeScript transpilation
 */
export const rules: Required<ModuleOptions>['rules'] = [
  // Support for native node modules (.node files)
  {
    // Asset relocator loader generates a "fake" .node file (actually a CJS file)
    test: /native_modules[/\\].+\.node$/,
    use: 'node-loader',
  },
  // Relocate assets for node modules (JS and .node files)
  {
    test: /[/\\]node_modules[/\\].+\.(m?js|node)$/,
    parser: { amd: false }, // Disable AMD parsing for compatibility
    use: {
      loader: '@vercel/webpack-asset-relocator-loader',
      options: {
        outputAssetBase: 'native_modules', // Output base for relocated assets
      },
    },
  },
  // Transpile TypeScript files (main and renderer)
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|\.webpack)/,
    use: {
      loader: 'ts-loader',
      options: {
        transpileOnly: true, // Speed up builds by skipping type checking
      },
    },
  },
];
