import { createStore } from "easy-peasy";
import { model } from "../../src/state/index";

import { getInfo } from "../../mocks/lndmobile/index";

import LndMobile from "../../src/state/LndMobileInjection";

const setupStore = (initialState: any) => createStore(model, {
  injections: {
    lndMobile: LndMobile,
  },
  initialState,
});

let store = setupStore({});


test("initialize lightning store", async () => {
  store = setupStore(/*{
    appReady: true,
    walletCreated: true,
    lightning: {
      syncedToChain: false,
      ready: false,
      firstSync: false,
    },
  }*/);

  await store.getActions().initializeApp(undefined);
  await store.getActions().lightning.initialize(undefined);

  expect(store.getState().lightning.ready).toBe(true);
  expect(store.getState().lightning.nodeInfo).toEqual(
    await getInfo()
  );
});
