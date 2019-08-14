import { Action, action, Thunk, thunk } from "easy-peasy";
import { StorageItem, getItemObject, setItemObject, removeItem } from "../storage/app";

export enum LoginMethods {
  pincode = "PinCode",
}

export interface ISecurityModel {
  initialize: Thunk<ISecurityModel>;
  loginPincode: Thunk<ISecurityModel, string>;
  getSeed: Thunk<ISecurityModel, void, any, any, Promise<string[] | null>>;
  deleteSeedFromDevice: Thunk<ISecurityModel>;
  storeSeed: Thunk<ISecurityModel, string[]>;

  setLoggedIn: Action<ISecurityModel, boolean>;
  setLoginMethods: Action<ISecurityModel, LoginMethods[]>;
  setSeedAvailable: Action<ISecurityModel, boolean>;
  
  loggedIn: boolean;
  loginMethods?: LoginMethods[];
  seedAvailable: boolean;
}

export const security: ISecurityModel = {
  initialize: thunk(async (actions) => {
    const loginMethods: LoginMethods[] = await getItemObject(StorageItem.loginMethods) || [];
    actions.setLoginMethods(loginMethods);
    actions.setLoggedIn(loginMethods.length === 0);
    actions.setSeedAvailable(await getItemObject(StorageItem.seedStored) || false);
  }),

  loginPincode: thunk(async (actions, pincodeAttempt) => {
    const pincode = await getItemObject(StorageItem.pincode);

    if (pincode === pincodeAttempt) {
      actions.setLoggedIn(true);
      return true;
    }
    return false;
  }),

  getSeed: thunk(async (_, _2, { getState }) => {
    if (getState().loggedIn) {
      return await getItemObject(StorageItem.seed);
    }
    return null;
  }),

  deleteSeedFromDevice: thunk(async (actions) => {
    await removeItem(StorageItem.seed);
    await setItemObject(StorageItem.seedStored, false);
    actions.setSeedAvailable(false);
  }),

  storeSeed: thunk(async (actions, payload) => {
    await setItemObject(StorageItem.seedStored, true);
    actions.setSeedAvailable(true);
    await setItemObject(StorageItem.seed, payload);
  }),

  setLoggedIn: action((store, payload) => { store.loggedIn = payload; }),
  setLoginMethods: action((store, payload) => { store.loginMethods = payload; }),
  setSeedAvailable: action((store, payload) => { store.seedAvailable = payload; }),

  loggedIn: false,
  seedAvailable: false,
};

