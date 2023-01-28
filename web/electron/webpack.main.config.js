module.exports = {
  entry: './web/electron/src/main.ts',
  devtool: 'source-map',
  module: {
    rules: [
      // {
      //   test: /\.jsx?$/,
      //   use: {
      //     loader: 'babel-loader',
      //     options: {
      //       exclude: /node_modules/,
      //       presets: ['@babel/preset-react'],
      //       plugins: ['@babel/plugin-proposal-export-namespace-from'],
      //     },
      //   },
      // },
      {
        test: /\.node$/,
        use: 'node-loader',
      },
      ...require('../webpack/webpack.rules'),
    ],
  },
  plugins: require('../webpack/webpack.plugins'),
  resolve: require('../webpack/webpack.resolve'),
};
