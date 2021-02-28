import { waitFor } from "@testing-library/react-native";

import { setItem, StorageItem } from "../../src/storage/app";
import { initCommonStore } from "../utils";
import { getInfoResponse } from "../../mocks/lndmobile/index";

jest.setTimeout(20000);

test("initialize lightning store", async () => {
  await setItem(StorageItem.walletPassword, "test1234");
  const store = await initCommonStore(false);

  expect(store.getState().lightning.syncedToChain).toBe(false);
  expect(store.getState().lightning.nodeInfo).toEqual(getInfoResponse);
  await waitFor(() => expect(store.getState().lightning.syncedToChain).toBe(true), { timeout: 5000 });
  await waitFor(() => expect(store.getState().lightning.autopilotSet).toBeDefined(), { timeout: 5000 });

  // TODO wait for Autopilot to finish
  await new Promise((r) => setTimeout(r, 10000));
});
