import React from "react";
import { render, toJSON } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import Overview from "../../../src/windows/Overview";
import { setupStore, createNavigationContainer } from "../../utils";

it("renders correctly", () => {
  const AppContainer = createNavigationContainer({ Overview }, "Overview");

  const store = setupStore();
  store.getActions().channel.setBalance(Long.fromNumber(123));

  const { container } = render(
    <StoreProvider store={store}>
      <AppContainer />
    </StoreProvider>
  );
  expect(toJSON(container)).toMatchSnapshot();
});
