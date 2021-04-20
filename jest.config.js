module.exports = {
  preset: 'react-native',
  moduleFileExtensions: ['android.ts', 'android.tsx', 'ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transformIgnorePatterns: [
    "node_modules/(?!react-native|@shoutem|react-clone-referenced-element|native-base|native-base-shoutem-theme|react-native-camera|@react-navigation|react-navigation-tabs|react-navigation|@react-native-community\/async-storage|@react-native-community/slider|@codler\/react-native-keyboard-aware-scroll-view|@react-native-community\/picker|@react-native)",
  ],
  testPathIgnorePatterns: [
    "tests/utils.ts",
  ],
  setupFiles: [
    // "react-native/jest/setup.js",
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
