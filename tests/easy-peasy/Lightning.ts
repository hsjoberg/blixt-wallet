import { waitFor } from "@testing-library/react-native";

import { setItem, StorageItem } from "../../src/storage/app";
import { initCommonStore } from "../utils";
import { getInfoResponse } from "../../mocks/lndmobile/index";

jest.setTimeout(20000);

test("initialize lightning store", async () => {
  const store = await initCommonStore(true);

  await waitFor(() => expect(store.getState().lightning.syncedToChain).toBe(true), {
    timeout: 5000,
  });
  await waitFor(() => expect(store.getState().lightning.autopilotSet).toBeDefined(), {
    timeout: 5000,
  });
});
