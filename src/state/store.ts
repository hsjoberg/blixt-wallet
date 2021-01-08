import { createStore, createTypedHooks, Store } from "easy-peasy";
import { composeWithDevTools } from "remote-redux-devtools";
import model, { IStoreModel } from "./index";
import { Flavor } from "../utils/build";

let LndMobile;
if (Flavor === "fakelnd") {
  console.log("Using fake lnd backend");
  LndMobile = require("./LndMobileInjectionFake").default;
}
else {
  LndMobile = require("./LndMobileInjection").default;
}

import { ILndMobileInjections } from "./LndMobileInjection";
import { PLATFORM } from "../utils/constants";

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
    compose: PLATFORM !== "web" ? composeWithDevTools({
      realtime: true,
      trace: true,
      hostname: "192.168.1.100",
      port: 8000,
    }) : undefined,
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
