import type { Configuration } from 'webpack';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push({
  test: /\.css$/,
  use: [MiniCssExtractPlugin.loader, 'css-loader'],
});

plugins.push(new MiniCssExtractPlugin());

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
  entry: './src/renderer.tsx', // <--- UPDATED LINE
};
