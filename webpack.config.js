const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './server/src/AppEntry.js', // Entry point for React app
  output: {
    path: path.resolve(__dirname, 'server/public_html/Js'), // Output directory
    filename: 'bundle.js', // Bundle file name
    publicPath: '/Js/', // Path where static files are served
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'], // For React and modern JS support
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'], // For CSS files
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i, // For images
        type: 'asset/resource',
        generator: {
          filename: 'assets/[name].[hash][ext]', // Place images in assets folder
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'], // Resolve JS and JSX files
  },
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'server/public_html'), // Serve files from public_html
    },
    port: 8080, // Development server port
    hot: true, // Enable hot module replacement
    historyApiFallback: {
      rewrites: [
        { from: /^\/auth\/Js\/bundle\.js$/, to: '/Js/bundle.js' }, // Rewrite for /auth/Js/ requests
      ],
    }, // Ensure React Router works
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './server/public_html/index.html', // Path to index.html template
      inject: 'body', // Inject bundle.js before closing </body>
    }),
    new webpack.HotModuleReplacementPlugin(), // Enable hot module replacement
  ],
  mode: 'development', // Development mode
};
