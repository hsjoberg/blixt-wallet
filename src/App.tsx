import React, { useEffect, useState } from "react";
import { StyleProvider, Root } from "native-base";
import { DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StoreProvider } from "easy-peasy";

import Main from "./Main";
import DEV_Commands from "./windows/InitProcess/DEV_Commands";
import { navigator } from "./utils/navigation";

const getTheme = require("./native-base-theme/components").default;
const theme = require("./native-base-theme/variables/commonColor").default;
import { blixtTheme } from "./native-base-theme/variables/commonColor";

import store from "./state/store";
import { clearApp } from "./storage/app";
import { PLATFORM } from "./utils/constants";

export default function App() {
  const [debug, setDebug] = useState(__DEV__ ? true : false);

  useEffect(() => {
    (async() => {
      if (PLATFORM === "web") {
        await clearApp();
      }
    })();
  }, []);

  return (
    <StoreProvider store={store}>
      <StyleProvider style={getTheme(theme)}>
        <NavigationContainer theme={{
          dark: true,
          colors: {
            ...DefaultTheme.colors,
            background: blixtTheme.dark,
          }
        }} documentTitle={{ enabled: false }} ref={navigator}>
          <Root>
            {debug ? <DEV_Commands continueCallback={() => setDebug(false)} /> : <Main />}
          </Root>
        </NavigationContainer>
      </StyleProvider>
    </StoreProvider>
  );
};
