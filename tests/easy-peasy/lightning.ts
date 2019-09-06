import { setItem, StorageItem } from "../../src/storage/app";
import { setupStore } from "../utils";
import { getInfo } from "../../mocks/lndmobile/index";

jest.setTimeout(10000);

test("initialize lightning store", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = setupStore();

  await store.getActions().initializeApp();
  await store.getActions().lightning.initialize();

  expect(store.getState().lightning.ready).toBe(true);
  expect(store.getState().lightning.nodeInfo).toEqual(await getInfo());
});
