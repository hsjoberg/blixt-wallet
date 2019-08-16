import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";
import FingerprintScanner from "react-native-fingerprint-scanner";

import { StorageItem, getItemObject, setItemObject, removeItem } from "../storage/app";
import { Alert } from "react-native";

export enum LoginMethods {
  pincode = "pincode",
  fingerprint = "fingerprint",
}

export interface ISecurityModel {
  initialize: Thunk<ISecurityModel>;
  checkPincode: Thunk<ISecurityModel, string>;
  loginPincode: Thunk<ISecurityModel, string>;
  getSeed: Thunk<ISecurityModel, void, any, any, Promise<string[] | null>>;
  deleteSeedFromDevice: Thunk<ISecurityModel>;
  storeSeed: Thunk<ISecurityModel, string[]>;
  setPincode: Thunk<ISecurityModel, string>;
  removePincode: Thunk<ISecurityModel, string>;
  setFingerprintEnabled: Thunk<ISecurityModel, boolean>;
  fingerprintStartScan: Thunk<ISecurityModel>;
  fingerprintStopScan: Thunk<ISecurityModel>;

  setLoggedIn: Action<ISecurityModel, boolean>;
  setLoginMethods: Action<ISecurityModel, Set<LoginMethods>>;
  setSeedAvailable: Action<ISecurityModel, boolean>;
  setFingerprintAvailable: Action<ISecurityModel, boolean>;

  loggedIn: boolean;
  loginMethods: Set<LoginMethods>;
  seedAvailable: boolean;
  fingerprintAvailable: boolean;
  fingerprintEnabled: Computed<ISecurityModel, boolean>;
}

export const security: ISecurityModel = {
  initialize: thunk(async (actions) => {
    const loginMethods: Set<LoginMethods> = new Set(await getItemObject(StorageItem.loginMethods));
    actions.setLoginMethods(loginMethods);
    actions.setLoggedIn(loginMethods.size === 0);
    actions.setSeedAvailable(await getItemObject(StorageItem.seedStored) || false);
    try {
      actions.setFingerprintAvailable(await FingerprintScanner.isSensorAvailable() === "Fingerprint");
    } catch (e) {
      console.log(e);
    }
  }),

  checkPincode: thunk(async (actions, pincodeAttempt) => {
    const pincode = await getItemObject(StorageItem.pincode);
    if (pincode === pincodeAttempt) {
      return true;
    }
    return false;
  }),

  loginPincode: thunk(async (actions, pincodeAttempt) => {
    if (await actions.checkPincode(pincodeAttempt)) {
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

  setPincode: thunk(async (actions, payload, { getState }) => {
    const loginMethods = new Set(getState().loginMethods.values());
    loginMethods.add(LoginMethods.pincode);

    await setItemObject(StorageItem.pincode, payload);
    await setItemObject(StorageItem.loginMethods, Array.from(loginMethods));

    actions.setLoginMethods(loginMethods);
  }),

  removePincode: thunk(async (actions, pincodeAttempt, { getState }) => {
    if (await actions.checkPincode(pincodeAttempt)) {
      const loginMethods = new Set(getState().loginMethods.values());
      loginMethods.delete(LoginMethods.pincode);

      await removeItem(StorageItem.pincode);
      await setItemObject(StorageItem.loginMethods, []);

      actions.setLoginMethods(loginMethods);
      return true;
    }
    return false;
  }),

  setFingerprintEnabled: thunk(async (actions, enable, { getState }) => {
    const loginMethods = new Set(getState().loginMethods.values());
    enable
      ? loginMethods.add(LoginMethods.fingerprint)
      : loginMethods.delete(LoginMethods.fingerprint);
    await setItemObject(StorageItem.loginMethods, Array.from(loginMethods));
    actions.setLoginMethods(loginMethods);
  }),

  fingerprintStartScan: thunk(async (actions) => {
    try {
      const r = await FingerprintScanner.authenticate({ onAttempt: () => {}});
      actions.setLoggedIn(true);
      return true;
    } catch (e) {
      Alert.alert(e.message);
    }
  }),

  fingerprintStopScan: thunk(async () => {
    FingerprintScanner.release();
  }),

  setLoggedIn: action((store, payload) => { store.loggedIn = payload; }),
  setLoginMethods: action((store, payload) => { store.loginMethods = payload; }),
  setSeedAvailable: action((store, payload) => { store.seedAvailable = payload; }),
  setFingerprintAvailable: action((store, payload) => { store.fingerprintAvailable = payload; }),

  loginMethods: new Set<LoginMethods>([]),
  loggedIn: false,
  seedAvailable: false,
  fingerprintAvailable: false,
  fingerprintEnabled: computed((store) => store.loginMethods.has(LoginMethods.fingerprint)),
};

