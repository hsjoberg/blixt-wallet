module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
    android: {},
    macos: {},
  },
  dependencies: {
    "react-native-tor": {
      platforms: {
        android: null,
      },
    },
  },
  assets: ["./assets/fonts/"],
};
