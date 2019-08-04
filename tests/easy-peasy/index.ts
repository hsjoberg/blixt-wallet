import { createStore } from "easy-peasy";
import { model } from "../../src/state/index";

import LndMobile from "../../src/state/LndMobileInjection";

const setupStore = () => createStore(model, {
  injections: {
    lndMobile: LndMobile,
  },
});

let store = setupStore();

beforeEach(() => {
  store = setupStore();
});

test("initialize index store", async () => {
  await store.getActions().initializeApp(undefined);

  expect(store.getState().appReady).toBe(true);
  expect(store.getState().walletCreated).toBe(false);
});

test("create wallet", async () => {
  await store.getActions().initializeApp(undefined);
  await store.getActions().createWallet({
    password: "test12345",
  });

  expect(store.getState().appReady).toBe(true);
  expect(store.getState().walletCreated).toBe(true);
});
