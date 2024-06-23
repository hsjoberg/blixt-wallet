import { PermissionsAndroid } from "react-native";
import { Thunk, thunk } from "easy-peasy";
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
} from "@notifee/react-native";

import { navigate } from "../utils/navigation";
import { IStoreModel } from "./index";
import {
  ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
  ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME,
  PLATFORM,
} from "../utils/constants";
import { localNotification } from "../utils/push-notification";
import { toast } from "../utils";

import logger from "./../utils/log";
const log = logger("NotificationManager");

interface ILocalNotificationPayload {
  message: string;
}

export interface INotificationManagerModel {
  initialize: Thunk<INotificationManagerModel>;

  localNotification: Thunk<INotificationManagerModel, ILocalNotificationPayload, any, IStoreModel>;
}

export const notificationManager: INotificationManagerModel = {
  initialize: thunk(async () => {
    try {
      log.d("Initializing");

      if (PLATFORM === "macos") {
        log.i("Push notifications not supported on " + PLATFORM);
        return;
      }

      if (PLATFORM === "ios" || PLATFORM === "android") {
        log.i("Requesting permissions");
        const result = await notifee.requestPermission();

        if (
          result.authorizationStatus === AuthorizationStatus["AUTHORIZED"] &&
          PLATFORM === "android"
        ) {
          const channelId = await notifee.createChannel({
            id: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
            name: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME,
            visibility: AndroidVisibility["PUBLIC"],
            importance: AndroidImportance["HIGH"],
            sound: "default",
          });
        }
      }
    } catch (error) {
      // TODO(hsjoberg): Perhaps should be handled in the lib instead?
      if (error.domain === "UNErrorDomain") {
        return;
      }

      throw error;
    }
  }),

  localNotification: thunk((_, { message }, { getStoreState }) => {
    if (getStoreState().settings.pushNotificationsEnabled) {
      if (PLATFORM === "android" || PLATFORM === "ios") {
        localNotification(message);
      } else {
        toast(message);
      }
    }
  }),
};
