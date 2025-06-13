const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './server/src/AppEntry.js', // Entry point for React app
  output: {
    path: path.resolve(__dirname, 'server/public_html/Js'),
    filename: 'bundle.js',
    publicPath: '/Js/',
    clean: true, // Clean output dir before build
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
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]',
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
      filename: '../index.html', // Output index.html to public_html root
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
