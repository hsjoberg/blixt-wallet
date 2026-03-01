import { createStore, createTypedHooks, Store } from "easy-peasy";
import model, { IStoreModel } from "./index";

const { useStoreActions, useStoreState } = createTypedHooks<IStoreModel>();
export { useStoreActions, useStoreState };

const store: Store<IStoreModel> = createStore(model);

export default store;
