import React from "react";
import { StyleProvider } from "native-base";
import { StoreProvider } from "easy-peasy";

import Main from "./Main";

import getTheme from "../native-base-theme/components";
import theme from "../native-base-theme/variables/commonColor";

import store from "./state/store";

export default () => {
  return (
    <StoreProvider store={store}>
      <StyleProvider style={getTheme(theme)}>
        <Main />
      </StyleProvider>
    </StoreProvider>
  );
};
