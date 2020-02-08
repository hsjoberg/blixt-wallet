import React from "react";
import { DeviceEventEmitter } from "react-native";
import { createStore } from "easy-peasy";
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from "@react-navigation/stack";


import { model } from "../src/state/index";
import LndMobile from "../src/state/LndMobileInjection";

import { setupApp, setItem, setItemObject, StorageItem, clearApp } from "../src/storage/app";
import { timeout } from "../src/utils";

export const setupStore = (initialState?: any) => createStore(model, {
  injections: {
    lndMobile: LndMobile,
  },
  initialState,
});

export const initCommonStore = async (waitUntilReady = false) => {
  const store = setupStore();
  await store.getActions().initializeApp();
  await store.getActions().lightning.initialize();
  store.getActions().lightning.setFirstSync(false);
  DeviceEventEmitter.emit("WalletUnlocked", {});

  if (waitUntilReady) {
    while (!store.getState().lightning.rpcReady || !store.getState().receive.invoiceSubscriptionStarted) {
      await timeout(100);
    }
  }
  return store;
}

export const createNavigationContainer = (routes: any, initial: string) => {
  const RootStack = createStackNavigator();

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen name="a" component={routes} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}


export const setDefaultAsyncStorage = async () => {
  await clearApp();
  await setupApp();
  await setItemObject(StorageItem.firstSync, false);
  await setItemObject(StorageItem.walletCreated, true);
  await setItem(StorageItem.walletPassword, "test1234");
}

export const mockBlockchainAPI = () => ({
  USD: { last: 1000 },
  JPY: { last: 1000 },
  CNY: { last: 1000 },
  SGD: { last: 1000 },
  HKD: { last: 1000 },
  CAD: { last: 1000 },
  NZD: { last: 1000 },
  AUD: { last: 1000 },
  CLP: { last: 1000 },
  GBP: { last: 1000 },
  DKK: { last: 1000 },
  SEK: { last: 1000 },
  ISK: { last: 1000 },
  CHF: { last: 1000 },
  BRL: { last: 1000 },
  EUR: { last: 1000 },
  RUB: { last: 1000 },
  PLN: { last: 1000 },
  THB: { last: 1000 },
  KRW: { last: 1000 },
  TWD: { last: 1000 },
});
