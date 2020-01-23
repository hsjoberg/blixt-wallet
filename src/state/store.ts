import { createStore, createTypedHooks, Store } from "easy-peasy";
import { composeWithDevTools } from "remote-redux-devtools";
import model, { IStoreModel } from "./index";

import LndMobile, { ILndMobileInjections } from "./LndMobileInjection";

const { useStoreActions, useStoreState } = createTypedHooks<IStoreModel>();
export { useStoreActions, useStoreState };

export interface IStoreInjections {
  lndMobile: ILndMobileInjections;
}

let store: Store<IStoreModel>;
if (process.env.NODE_ENV === "development") {
  store = createStore(model, {
    injections: {
      lndMobile: LndMobile,
    } as IStoreInjections,
    compose: composeWithDevTools({
      realtime: true,
      trace: true,
      hostname: "192.168.1.100",
      port: 8000,
    })
  });
}
else {
  store = createStore(model, {
    injections: {
      lndMobile: LndMobile,
    } as IStoreInjections,
  });
}

export default store;
