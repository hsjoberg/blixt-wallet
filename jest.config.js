module.exports = {
  preset: '@testing-library/react-native',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    "node_modules/(?!react-native|@shoutem|react-clone-referenced-element|native-base-shoutem-theme|react-native-camera|@react-navigation|react-navigation-tabs|react-navigation|@react-native-community\/async-storage)",
  ],
  testPathIgnorePatterns: [
    "tests/utils.ts",
  ],
  setupFiles: [
    "./jestSetup.js",
    "jest-date-mock",
    "./node_modules/react-native-gesture-handler/jestSetup.js"
  ],
  moduleNameMapper: {
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/assetsTransformer.js",
    "\\.(css|less)$": "<rootDir>/assetsTransformer.js"
  },
  testMatch: ['**/tests/**/*.[jt]s?(x)'],
}
