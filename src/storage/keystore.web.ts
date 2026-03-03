const PREFIX = "blixt-keystore:";

const keyOf = (key: string) => `${PREFIX}${key}`;

export const setItem = async (key: string, value: string) => {
  localStorage.setItem(keyOf(key), value);
};

export const getItem = async (key: string): Promise<string | null> => {
  return localStorage.getItem(keyOf(key));
};

export const setItemObject = async <T>(key: string, value: T) => {
  await setItem(key, JSON.stringify(value));
};

export const getItemObject = async (key: string) => JSON.parse((await getItem(key)) || "null");

export const removeItem = async (key: string) => {
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
