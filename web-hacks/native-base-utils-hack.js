const ReactNative = require("react-native");
const InteractionManager = ReactNative.InteractionManager;

module.exports = {
  InteractionManager: {
    ...InteractionManager,
    runAfterInteractions: (f) => {
      let called = false;
      const timeout = setTimeout(() => {
        called = true;
        f();
      }, 10);
      InteractionManager.runAfterInteractions(() => {
        if (called) return;
        clearTimeout(timeout);
        f();
      });
    },
  },

  ViewPropTypes: {},
};
