import React from "react";
import { act, render, fireEvent, waitFor, within } from "@testing-library/react-native";
import { StoreProvider } from "easy-peasy";
import Long from "long";

import OnChain from "../../../src/windows/OnChain/index";
import { createNavigationContainer, initCommonStore } from "../../utils";
import { walletBalance, sendCoins, newAddress } from "../../../mocks/lndmobile/onchain";
import { lnrpc } from "../../../proto/proto";

jest.setTimeout(10000);

const AppContainer = createNavigationContainer(OnChain, "OnChain");

it("renders correctly", async () => {
  const store = await initCommonStore(true);

  const { unmount, toJSON } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );
  expect(toJSON()).toMatchSnapshot();

  unmount();
});

it("is possible display on-chain funds", async () => {
  const store = await initCommonStore(true);
  store.getActions().onChain.setBalance({
    totalBalance: Long.fromValue(123),
    confirmedBalance: Long.fromValue(123),
    unconfirmedBalance: Long.fromValue(0),
  });

  const { queryByTestId, queryByText, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const onChainFundsText = queryByTestId("ONCHAIN_FUNDS");
  expect(onChainFundsText!.children.join("1")).toContain("0.00000123");

  unmount();
});

it("should be possible to withdraw funds (no camera)", async () => {
  let balance = Long.fromValue(123);
  const store = await initCommonStore(true);
  store.getActions().onChain.setBalance({
    totalBalance: balance,
    confirmedBalance: balance,
    unconfirmedBalance: Long.fromValue(0),
  });

  walletBalance.mockImplementation(() => {
    const response = lnrpc.WalletBalanceResponse.create({
      confirmedBalance: balance,
      totalBalance: balance,
      unconfirmedBalance: Long.fromNumber(0),
    });
    return response;
  });

  sendCoins.mockImplementationOnce((address: string, sat: number) => {
    balance = balance.sub(sat);
    const response = lnrpc.SendCoinsResponse.create({
      txid: "7836ca1453ef598b989a09496f48be17e14950a44e6ab2526b4a7fc17f9e4591",
    });
    return response;
  })

  const { queryByTestId, unmount } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const onChainFundsText = queryByTestId("ONCHAIN_FUNDS");

  const withdrawButton = queryByTestId("WITHDRAW");
  expect(withdrawButton).not.toBeNull();
  fireEvent.press(withdrawButton!);

  expect(onChainFundsText!.children.join()).toContain("0.00000123");

  const inputBitcoinAddress = await waitFor(() => queryByTestId("INPUT_BITCOIN_ADDRESS"));
  const inputAmount = await waitFor(() => queryByTestId("INPUT_AMOUNT"));
  const sendCoinsButton = await waitFor(() => queryByTestId("SEND_COINS"));
  expect(sendCoinsButton).not.toBeNull();

  act(() => void fireEvent.changeText(inputBitcoinAddress!, "tb1qy24mr4attphw83xhmxcspkkrxwqwurxjy085vuz6t4gxtmfyuq9srzd0yw"));
  act(() => void fireEvent.changeText(inputAmount!, "0.00000001"));
  await act(async () => await fireEvent.press(sendCoinsButton!));

  expect(onChainFundsText!.children.join()).toContain("0.00000122");

  unmount();
});

it("should be possible generate a new bitcoin address", async () => {
  const store = await initCommonStore(true);

  const {getByTestId, unmount, debug, baseElement } = render(
    <StoreProvider store={store}>
      {AppContainer}
    </StoreProvider>
  );

  const generateAddressButton = getByTestId("GENERATE_ADDRESS");

  await waitFor(() => getByTestId('COPY_BITCOIN_ADDRESS'));
  const bitcoinAddress = getByTestId("COPY_BITCOIN_ADDRESS");

  expect(bitcoinAddress).not.toBeNull();
  const oldAddress = within(bitcoinAddress).getByTestId("BITCOIN_ADDRESS").children[0];

  newAddress.mockImplementationOnce(() => {
    const response = lnrpc.NewAddressResponse.create({ address: "tb1qsl4hhqs8skzwknqhwjcyyyjepnwmq8tlcd32m4" });
    return response;
  });

  await act(async () => await fireEvent.press(generateAddressButton));

  expect(within(bitcoinAddress).getByTestId("BITCOIN_ADDRESS").children[0]).not.toBe(oldAddress);

  unmount();
});
