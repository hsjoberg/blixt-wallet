import React from "react";
import { render, waitFor, within, act } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";
import * as base64 from "base64-js";

import { OverviewTabsComponent } from "../../../src/windows/Overview";
import { setupStore, createNavigationContainer, initCommonStore } from "../../utils";
import { createStackNavigator } from "@react-navigation/stack";
import { DeviceEventEmitter } from "react-native";
import { lnrpc } from "../../../proto/lightning";
import { hexToUint8Array } from "../../../src/utils";
import { channelBalance } from "../../../mocks/lndmobile/channel";

jest.setTimeout(10000);

it("renders correctly", () => {
  // @react-navigation/material-top-tabs fails to render so we
  // use the nested bottom tabs instead
  const AppContainer = createNavigationContainer(OverviewTabsComponent, "OverviewTabsComponent");

  const store = setupStore();
  store.getActions().channel.setBalance(Long.fromNumber(123));

  const { toJSON, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );
  expect(toJSON()).toMatchSnapshot();
  // unmount();
});

it("expect balance to update when paying an invoice", async () => {
  let balance = 100000;

  channelBalance.mockImplementation(() => {
    const response = lnrpc.ChannelBalanceResponse.create({
      balance: Long.fromValue(balance),
      pendingOpenBalance: Long.fromValue(0),
    });
    return response;
  });

  const AppContainer = createNavigationContainer(OverviewTabsComponent, "OverviewTabsComponent");
  const store = await initCommonStore(true);
  // store.getActions().channel.setBalance(Long.fromValue(100000));
  const addInvoiceResponse = await store.getActions().receive.addInvoice({
    sat: 100,
    description: "Receiving 100 sats",
  });
  await waitFor(() => expect(store.getState().transaction.transactions).toHaveLength(1));

  const { queryByTestId, getByTestId } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const txList = getByTestId("TX_LIST");
  const tx = store.getState().transaction.transactions[0];
  expect(tx.status).toBe("OPEN");
  expect(within(txList).queryAllByText("Open")).not.toBeNull();

  const bigBalanceHeader = getByTestId("BIG_BALANCE_HEADER");
  expect(bigBalanceHeader.children[0]).toContain("0.001");

  // Pay invoice
  const invoice = lnrpc.Invoice.create({
    amtPaid: Long.fromValue(10000),
    amtPaidSat: Long.fromValue(10000),
    amtPaidMsat: Long.fromValue(1000000),
    rHash: addInvoiceResponse.rHash,
    // paymentRequest: "payreq",
    expiry: Long.fromValue(40),
    isKeysend: false,
    state: lnrpc.Invoice.InvoiceState.SETTLED,
  })
  act(() => {
    balance = balance - 100;
    DeviceEventEmitter.emit("SubscribeInvoices", {
      data: base64.fromByteArray(lnrpc.Invoice.encode(invoice).finish())
    });
  });

  await waitFor(async () => {
    expect(store.getState().transaction.transactions[0].status).toBe("SETTLED");
  });

  await waitFor(() => expect(bigBalanceHeader.children[0]).toContain("0.000999"));
});
