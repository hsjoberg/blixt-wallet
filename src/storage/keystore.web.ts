// TODO(hsjoberg)
// import * as Keychain from 'react-native-keychain';

const USER = "blixt";

export const setItem = async (
  key: string,
  value: string,
  accessible: Keychain.ACCESSIBLE = Keychain.ACCESSIBLE.ALWAYS,
) => {
  const options = {
    accessible,
  };
  // accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY, // Possible error by Lightning-app here... omitting ACCESSIBLE
  // // https://github.com/lightninglabs/lightning-app/blob/master/src/action/keychain-mobile.js#L21
  // // TODO tell them
  // await Keychain.setInternetCredentials(key, USER, value, options);
  return;
};

export const getItem = async (key: string): Promise<string | null> => {
  // const credentials = await Keychain.getInternetCredentials(key);
  // if (credentials) {
  //   return credentials.password;
  // }
  // else {
  //   return null;
  // }
  return "test";
};

export const setItemObject = async <T>(key: string, value: T) =>
  await setItem(key, JSON.stringify(value));
export const getItemObject = async (key: string) => JSON.parse((await getItem(key)) || "null");

export const removeItem = async (key: string) => {
  // await Keychain.resetInternetCredentials(key);
};

export const setSeed = async (seed: string[]) => setItemObject("seed", seed);
export const getSeed = async (): Promise<string[] | null> => getItemObject("seed");
export const removeSeed = async () => removeItem("seed");

export const setPin = async (seed: string) => setItem("pin", seed);
export const getPin = async () => getItem("pin");
export const removePin = async () => removeItem("pin");

export const setWalletPassword = async (password: string) => {
  // setItem("password", password, Keychain.ACCESSIBLE.ALWAYS);
};
export const getWalletPassword = async (): Promise<string | null> => {
  return getItem("password");
};
