import React, { useState } from "react";
import { StyleProvider, Root } from "native-base";
import { NavigationContainer } from '@react-navigation/native';
import { StoreProvider } from "easy-peasy";

import Main from "./Main";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";

import getTheme from "../native-base-theme/components";
import theme from "../native-base-theme/variables/commonColor";

import store from "./state/store";

export default () => {
  const [debug, setDebug] = useState(__DEV__ ? true : false);

  return (
    <StoreProvider store={store}>
      <StyleProvider style={getTheme(theme)}>
        <NavigationContainer>
          <Root>
            {debug ? <DEV_Commands continueCallback={() => setDebug(false)} /> : <Main />}
          </Root>
        </NavigationContainer>
      </StyleProvider>
    </StoreProvider>
  );
};
