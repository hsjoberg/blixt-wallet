import React from "react";
import { act, render, toJSON, fireEvent, wait, waitForElement } from "@testing-library/react-native";
import Clipboard from "@react-native-community/react-native-clipboard";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import Send from "../../../src/windows/Send";
import SendCamera from "../../../src/windows/Send/SendCamera";
import SendConfirmation from "../../../src/windows/Send/SendConfirmation";
import { createNavigationContainer, setupStore, setDefaultAsyncStorage, mockBlockchainAPI, initCommonStore } from "../../utils";

const AppContainer = createNavigationContainer(Send, "Send");
const AppContainerSendCamera = createNavigationContainer(SendCamera, "SendCamera");
const AppContainerSendConfirmation = createNavigationContainer(SendConfirmation, "SendConfirmation");

it("SendCamera renders correctly", async () => {
  await setDefaultAsyncStorage();

  const store = setupStore();
  await store.getActions().initializeApp();
  await store.getActions().lightning.initialize();
  store.getActions().channel.setBalance(Long.fromNumber(123));

  const { container, unmount } = render(
    <StoreProvider store={store}>
      {AppContainerSendCamera}
    </StoreProvider>
  );
  expect(toJSON(container)).toMatchSnapshot();

  unmount();
});

it("It is possible to paste invoice from clipboard and pay it", async () => {
  await setDefaultAsyncStorage();
  fetch.once(mockBlockchainAPI());
  const store = await initCommonStore(true);

  await store.getActions().initializeApp();
  await store.getActions().lightning.initialize();
  store.getActions().channel.setBalance(Long.fromNumber(10000));
  const invoice = "lntb12u1pww4ckdpp5xck8m9yerr9hqufyd6p0pp0pwjv5nqn6guwr9qf4l66wrqv3h2ssdp2xys9xct5da3kx6twv9kk7m3qg3hkccm9ypxxzar5v5cqp5ynhgvxfnkwxx75pcxcq2gye7m5dj26hjglqmhkz8rljhg3eg4hfyg38gnsynty3pdatjg9wpa7pe7g794y0hxk2gqd0hzg2hn5hlulqqen6cr5";
  Clipboard.setString(invoice);

  const { queryByTestId, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const pasteClipboardIcon = queryByTestId("paste-clipboard");
  expect(pasteClipboardIcon).not.toBeNull();

  await act(async () => await fireEvent.press(pasteClipboardIcon!));

  const payInvoiceButton = await waitForElement(() => queryByTestId("pay-invoice"));
  await act(async () => await fireEvent.press(payInvoiceButton!));

  expect(store.getState().transaction.transactions).toHaveLength(1);

  unmount();
});
