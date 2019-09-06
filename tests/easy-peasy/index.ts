import { setupStore } from "../utils";

jest.setTimeout(10000);

let store = setupStore();
beforeEach(() => {
  store = setupStore();
});

test("initialize index store", async () => {
  await store.getActions().initializeApp()

  expect(store.getState().appReady).toBe(true);
  expect(store.getState().walletCreated).toBe(false);
});

test("create wallet", async () => {
  await store.getActions().initializeApp();
  await store.getActions().generateSeed();
  await store.getActions().createWallet(false);

  expect(store.getState().appReady).toBe(true);
  expect(store.getState().walletCreated).toBe(true);
});
