import React from "react";
import { act, render, toJSON, fireEvent, wait, waitForElement } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import Receive from "../../../src/windows/Receive";
import { createNavigationContainer, setupStore, setDefaultAsyncStorage } from "../../utils";

const AppContainer = createNavigationContainer({ Receive }, "Receive");

it("renders correctly", () => {
  const store = setupStore();

  const { container, unmount } = render(
    <StoreProvider store={store}>
      <AppContainer />
    </StoreProvider>
  );
  expect(toJSON(container)).toMatchSnapshot();

  unmount();
});

it("is possible to create an invoice and go to the QR screen", async () => {
  await setDefaultAsyncStorage();
  const store = setupStore();
  await store.getActions().initializeApp();
  await store.getActions().lightning.initialize();

  const { queryByTestId, unmount } = render(
    <StoreProvider store={store}>
      <AppContainer />
    </StoreProvider>
  );

  const inputAmountSat = queryByTestId("input-amount-sat");
  const inputMessage = queryByTestId("input-message");
  const createInvoiceButton = queryByTestId("create-invoice");

  expect(createInvoiceButton).not.toBeNull();
  expect(inputAmountSat).not.toBeNull();
  expect(inputMessage).not.toBeNull();

  act(() => void fireEvent.changeText(inputAmountSat!, "1000"));
  expect(inputAmountSat!.props.value).toBe("1000");
  act(() => void fireEvent.changeText(inputMessage!, "A test invoice"));
  expect(inputMessage!.props.value).toBe("A test invoice");

  // Pressing createInvoiceButton moves us
  // to the next window, from ReceiveSetup.tsx to ReceiveQr.tsx
  act(() => void fireEvent.press(createInvoiceButton!));

  await wait(() => expect(store.getState().transaction.transactions).toHaveLength(1));
  const paymentRequestString = await waitForElement(() => queryByTestId("payment-request-string"));
  const expireString = await waitForElement(() => queryByTestId("expire"));
  const payAmountString = await waitForElement(() => queryByTestId("pay-amount"));

  expect(paymentRequestString).not.toBeNull();
  expect(expireString!.children.join()).toContain("Expires in");
  expect(payAmountString!.children.join()).toContain("1000");

  unmount();
});
