const path = require('path');

module.exports = [
  {
    test: /\.(tsx|ts|jsx|js|mjs)$/,
    include: [
      path.resolve('src'),
      path.resolve('mocks'),

      path.resolve('easy-peasy'),
      path.resolve('node_modules/easy-peasy'),

      path.resolve('node_modules/native-base-shoutem-theme'),
      path.resolve('node_modules/react-navigation'),
      path.resolve('node_modules/react-native-easy-grid'),
      path.resolve('node_modules/react-native-drawer'),
      path.resolve('node_modules/react-native-safe-area-view'),
      path.resolve('node_modules/react-native-vector-icons'),
      path.resolve('node_modules/react-native-keyboard-aware-scroll-view'),
      path.resolve('node_modules/react-native-web'),
      path.resolve('node_modules/react-native-tab-view'),
      path.resolve('node_modules/@react-native-community/picker'),
      path.resolve('node_modules/@react-native-picker/picker'),
      path.resolve('node_modules/@codler/react-native-keyboard-aware-scroll-view'),
      path.resolve('node_modules/react-native-gesture-handler'),
      path.resolve('node_modules/react-native-animatable'),
      path.resolve('node_modules/react-native-qrcode-svg'),
      path.resolve('node_modules/react-native-material-menu'),
      path.resolve('node_modules/react-native-linear-gradient'),
      path.resolve('node_modules/react-native-haptic-feedback'),
      path.resolve('node_modules/react-native-fs'),
      path.resolve('node_modules/react-native-document-picker'),
      path.resolve('node_modules/@react-native-community/art'),
      path.resolve('node_modules/react-native-reanimated'),
      path.resolve('node_modules/native-base'),
    ],
    use: ['babel-loader'],
  },
  {
    test: /\.(png|svg|jpg|jpeg|gif)$/i,
    type: 'asset/resource',
  },
  {
    test: /\.(woff|woff2|eot|ttf|otf)$/i,
    type: 'asset/resource',
  },
  {
    test: /\.wasm$/,
    use: ['wasm-loader']
  },
  // For react-native-web-view
  {
    test: /postMock.html$/,
    use: {
      loader: 'file-loader',
      options: {
        name: '[name].[ext]',
      },
    },
  },
];
