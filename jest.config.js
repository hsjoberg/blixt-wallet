module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    "node_modules/(?!react-native|@shoutem|react-clone-referenced-element|native-base-shoutem-theme|react-native-camera)"
  ]
}
