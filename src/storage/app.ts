import AsyncStorage from "@react-native-community/async-storage";

export interface IApp {
  dbVersion: number;
  welcome: boolean;
  walletCreated: boolean;
}
export const getApp = async (): Promise<IApp | null> => await getItemObject("app");

export const setApp = async (app: IApp) => setItemObject("app", app);

export const setItem = async (key: string, value: string) => await AsyncStorage.setItem(key, value);
export const setItemObject = async (key: string, value: any) => await AsyncStorage.setItem(key, JSON.stringify(value));

export const getItem = async (key: string) => await AsyncStorage.getItem(key);
export const getItemObject = async (key: string) => JSON.parse(await AsyncStorage.getItem(key) || "null");


export const clearApp = async () => await AsyncStorage.removeItem("app");


export const setupApp = async () => {
  const app: IApp = {
    dbVersion: 1,
    welcome: false,
    walletCreated: false,
  };
  await setApp(app);
  return app;
};
