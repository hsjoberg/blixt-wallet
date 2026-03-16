import { electrobunRequest } from "../../electrobun/src/shared/rpc-client.web";
import { IS_ELECTROBUN } from "../utils/constants";

const PREFIX = "blixt-keystore:";

const keyOf = (key: string) => `${PREFIX}${key}`;

const setElectrobunItem = async (key: string, value: string) => {
  await electrobunRequest("__BlixtKeystoreSetItem", {
    key,
    value,
  });
};

const getElectrobunItem = async (key: string): Promise<string | null> => {
  return await electrobunRequest<string | null>("__BlixtKeystoreGetItem", {
    key,
  });
};

const removeElectrobunItem = async (key: string) => {
  await electrobunRequest("__BlixtKeystoreRemoveItem", {
    key,
  });
};

export const setItem = async (key: string, value: string) => {
  if (IS_ELECTROBUN) {
    await setElectrobunItem(key, value);
    return;
  }

  localStorage.setItem(keyOf(key), value);
};

export const getItem = async (key: string): Promise<string | null> => {
  if (IS_ELECTROBUN) {
    return await getElectrobunItem(key);
  }

  return localStorage.getItem(keyOf(key));
};

export const setItemObject = async <T>(key: string, value: T) => {
  await setItem(key, JSON.stringify(value));
};

export const getItemObject = async (key: string) => JSON.parse((await getItem(key)) || "null");

export const removeItem = async (key: string) => {
  if (IS_ELECTROBUN) {
    await removeElectrobunItem(key);
    return;
  }

  localStorage.removeItem(keyOf(key));
};

export const setSeed = async (seed: string[]) => setItemObject("seed", seed);
export const getSeed = async (): Promise<string[] | null> => getItemObject("seed");
export const removeSeed = async () => removeItem("seed");

export const setPin = async (pin: string) => setItem("pin", pin);
export const getPin = async () => getItem("pin");
export const removePin = async () => removeItem("pin");

export const setWalletPassword = async (password: string) => setItem("password", password);
export const getWalletPassword = async (): Promise<string | null> => getItem("password");
