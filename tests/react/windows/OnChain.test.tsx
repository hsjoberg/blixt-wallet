import React from "react";
import { act, render, toJSON, fireEvent, wait, waitForElement } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";

import OnChain from "../../../src/windows/OnChain/index";
import { createNavigationContainer, initCommonStore } from "../../utils";

jest.setTimeout(10000);

const AppContainer = createNavigationContainer(OnChain, "OnChain");

it("renders correctly", async () => {
  const store = await initCommonStore(true);

  const { container, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );
  expect(toJSON(container)).toMatchSnapshot();

  unmount();
});

it("is possible display on-chain funds", async () => {
  const store = await initCommonStore(true);

  const { queryByTestId, queryByText, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const onChainFundsText = queryByTestId("ONCHAIN_FUNDS");
  expect(onChainFundsText!.children.join()).toContain("0.00001");

  unmount();
});
