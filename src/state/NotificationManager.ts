import { PermissionsAndroid } from "react-native";
import { Thunk, thunk } from "easy-peasy";
// import PushNotification, { PushNotificationObject } from "react-native-push-notification";

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
  // importance?: PushNotificationObject["importance"];
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

      if (PLATFORM === "ios") {
        const permissions = await PushNotification.requestPermissions(["alert", "sound", "badge"]);

        if (!permissions.alert) {
          log.w("Didn't get permissions to send push notifications.");
          return;
        }
      } else if (PLATFORM === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted === "denied" || granted === "never_ask_again") {
          log.w("Post notification permission was denied", [granted]);
        } else {
          return;
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

  localNotification: thunk((_, { message, importance }, { getStoreState }) => {
    if (getStoreState().settings.pushNotificationsEnabled) {
      if (PLATFORM !== "macos") {
        localNotification(message, importance ?? "default");
      } else {
        toast(message);
      }
    }
  }),
};
