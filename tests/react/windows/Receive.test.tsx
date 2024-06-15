import React from "react";
import { act, render, fireEvent, waitFor, within } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";
import * as base64 from "base64-js";

import Overview from "../../../src/windows/Overview";
import Receive from "../../../src/windows/Receive";
import {
  createNavigationContainer,
  setupStore,
  setDefaultAsyncStorage,
  initCommonStore,
} from "../../utils";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import { DeviceEventEmitter } from "react-native";
import { lnrpc } from "../../../proto/lightning";
import { hexToUint8Array } from "../../../src/utils";

jest.setTimeout(10000);

const AppContainer = createNavigationContainer(Receive, "Receive");

it("renders correctly", () => {
  const store = setupStore();

  const { unmount, toJSON } = render(<StoreProvider store={store}>{AppContainer}</StoreProvider>);
  expect(toJSON()).toMatchSnapshot();

  unmount();
});

it("is possible to create an invoice and go to the QR screen", async () => {
  await setDefaultAsyncStorage();
  const store = await initCommonStore(true);

  const { queryByTestId, unmount } = render(
    <StoreProvider store={store}>{AppContainer}</StoreProvider>,
  );

  const inputAmountSat = queryByTestId("input-amount-sat");
  const inputMessage = queryByTestId("input-message");
  const createInvoiceButton = queryByTestId("create-invoice");

  expect(createInvoiceButton).not.toBeNull();
  expect(inputAmountSat).not.toBeNull();
  expect(inputMessage).not.toBeNull();

  act(() => void fireEvent.changeText(inputAmountSat!, "10000"));
  expect(inputAmountSat!.props.value).toBe("10000");
  act(() => void fireEvent.changeText(inputMessage!, "A test invoice"));
  expect(inputMessage!.props.value).toBe("A test invoice");

  // Pressing createInvoiceButton moves us
  // to the next window, from ReceiveSetup.tsx to ReceiveQr.tsx
  act(() => void fireEvent.press(createInvoiceButton!));

  await waitFor(() => expect(store.getState().transaction.transactions).toHaveLength(1));
  const paymentRequestString = await waitFor(() => queryByTestId("payment-request-string"));
  const expireString = await waitFor(() => queryByTestId("expire"));
  const payAmountString = await waitFor(() => queryByTestId("pay-amount"));

  expect(paymentRequestString).not.toBeNull();
  expect(expireString!.children[0]!.children!.join()).toContain("Expires in");
  expect(payAmountString!.children.join()).toContain("10 000");

  unmount();
  store.getActions().receive.deinitialize();
});

test("invoice appears on the transaction list", async () => {
  const store = await initCommonStore(true);
  const RootStack = createStackNavigator();

  const Container = (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen name="Overview" component={Overview} />
        <RootStack.Screen name="Receive" component={Receive} />
      </RootStack.Navigator>
    </NavigationContainer>
  );

  const { getByTestId, findByTestId, unmount, getAllByTestId } = render(
    <StoreProvider store={store}>{Container}</StoreProvider>,
  );

  // See if we can find the Overview transaction list
  const txList = getByTestId("TX_LIST");
  expect(Array.isArray(txList.children)).toBe(true);

  // Navigate to Receive screen
  const footerReceiveButton = await findByTestId("FOOTER_RECEIVE");
  fireEvent.press(footerReceiveButton);

  // Create an invoice
  const inputAmountSat = await findByTestId("input-amount-sat");
  const inputMessage = getByTestId("input-message");
  const createInvoiceButton = getByTestId("create-invoice");
  act(() => void fireEvent.changeText(inputAmountSat!, "10000"));
  act(() => void fireEvent.changeText(inputMessage!, "A test invoice"));
  act(() => void fireEvent.press(createInvoiceButton!));

  // Expect an invoice to be created
  await waitFor(() => expect(store.getState().transaction.transactions).toHaveLength(1));

  // Go back to the Overview screen
  const goBackButton = getByTestId("header-back");
  fireEvent.press(goBackButton);

  // Expect a new invoice to be created with state OPEN
  const tx = store.getState().transaction.transactions[0];
  expect(tx.status).toBe("OPEN");
  expect(within(txList).queryAllByText("Open")).not.toBeNull();

  // Pay invoice
  const invoice = lnrpc.Invoice.create({
    amtPaid: Long.fromValue(10000),
    amtPaidSat: Long.fromValue(10000),
    amtPaidMsat: Long.fromValue(1000000),
    rHash: hexToUint8Array(tx.rHash),
    // paymentRequest: "payreq",
    expiry: Long.fromValue(40),
    isKeysend: false,
    state: lnrpc.Invoice.InvoiceState.SETTLED,
  });
  act(() => {
    DeviceEventEmitter.emit("SubscribeInvoices", {
      data: base64.fromByteArray(lnrpc.Invoice.encode(invoice).finish()),
    });
  });

  // Expect the invoice to have status SETTLED
  await waitFor(async () => {
    expect(store.getState().transaction.transactions[0].status).toBe("SETTLED");
  });

  expect(within(txList).queryAllByText("Open")).toEqual(expect.arrayContaining([]));

  unmount();
});
