declare module "react-native-dialogs";
declare module "react-native-icloudstore";
declare module "react-native-dialogs";

export type NavigationRootStackParamList =
  | string
  | {
      [key: string]: {
        screen?: string;
        params?: {
          callback?: () => Promise<void>;
          viaSwipe?: boolean;
        };
      };
    };
