import React from "react";
import { render } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import Receive from "../../../src/windows/Welcome/Restore";
import { createNavigationContainer, setupStore, setDefaultAsyncStorage, initCommonStore } from "../../utils";

jest.setTimeout(10000);

const AppContainer = createNavigationContainer(Receive, "Receive");

it("renders correctly", () => {
  const store = setupStore();

  const { unmount, toJSON } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );
  expect(toJSON()).toMatchSnapshot();

  unmount();
});