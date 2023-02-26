import { setupStore } from "../utils";
import { setupApp, setItem, setItemObject, StorageItem, clearApp } from "../../src/storage/app";
import { waitFor } from "@testing-library/react-native";

jest.setTimeout(10000);

let store = setupStore();
beforeEach(async () => {
  await setItemObject(StorageItem.autopilotEnabled, false);
  store = setupStore();
});

test("initialize index store", async () => {
  await store.getActions().initializeApp();

  expect(store.getState().appReady).toBe(true);
  expect(store.getState().walletCreated).toBe(false);

  await new Promise((r) => setTimeout(r, 4000));
});
