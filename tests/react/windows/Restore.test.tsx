import React from "react";
import { act, render, toJSON, fireEvent, wait, waitForElement } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import Receive from "../../../src/windows/Welcome/Restore";
import { createNavigationContainer, setupStore, setDefaultAsyncStorage, initCommonStore } from "../../utils";

jest.setTimeout(10000);

const AppContainer = createNavigationContainer(Receive, "Receive");

it("renders correctly", () => {
  const store = setupStore();

  const { container, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );
  expect(toJSON(container)).toMatchSnapshot();

  unmount();
});