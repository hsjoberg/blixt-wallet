module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {},
    macos: {},
  },
  dependencies: {
    "@react-native-google-signin/google-signin": {
      platforms: {
        ios: null,
      },
    },
    "react-native-tor": {
      platforms: {
        android: null,
      },
    },
  },
  assets: ["./assets/fonts/"],
};
