const path = require('path');
const rootDir = path.join(__dirname);
const webpackEnv = process.env.NODE_ENV || 'development';

module.exports = {
  mode: webpackEnv,
  entry: {
    app: path.join(rootDir, '../index.web.js'),
  },
  output: {
    path: path.resolve(rootDir, 'dist'),
    filename: 'app-[fullhash].bundle.js',
  },
  devtool: 'source-map',
  module: {
    rules: require('./webpack/webpack.rules'),
  },
  plugins: require("./webpack/webpack.plugins.js"),
  resolve: require('./webpack/webpack.resolve'),
  devServer: {
    https: true,
    devMiddleware:{
      writeToDisk: true,
    }
  },
};
