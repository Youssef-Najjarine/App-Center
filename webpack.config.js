const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './server/src/AppEntry.js',
  output: {
    path: path.resolve(__dirname, 'server/public_html/Js'),
    filename: 'bundle.js',
    publicPath: '/Js/',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|jpe?g|gif)$/i, // Exclude SVG from this rule
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]',
        },
      },
      {
        test: /\.svg$/i,
        issuer: /\.[jt]sx?$/, // Only apply to JS/JSX/TS/TSX files
        use: ['@svgr/webpack', 'url-loader'], // Use @svgr/webpack for React components
      },
      {
        test: /\.(mp4|webm|ogg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'videos/[name].[hash][ext]',
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './server/public_html/index.html',
      filename: '../index.html',
      inject: 'body',
    }),
    new webpack.HotModuleReplacementPlugin(),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'server/public_html'),
    },
    port: 8080,
    hot: true,
    liveReload: true,
    open: true,
    historyApiFallback: true,
    client: {
      overlay: true,
    },
  },
  mode: 'development',
};