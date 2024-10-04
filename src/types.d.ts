declare module "react-native-dialogs";
declare module "react-native-icloudstore";

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
