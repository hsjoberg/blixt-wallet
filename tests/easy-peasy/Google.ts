import { setItem, StorageItem } from "../../src/storage/app";
import { initCommonStore } from "../utils";

jest.setTimeout(20000);

test("initialize google store", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(true);

  expect(store.getState().google.isSignedIn).toBe(true);
});

test("sign out", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(true);

  await store.getActions().google.signOut();
  expect(store.getState().google.isSignedIn).toBe(false);
});
