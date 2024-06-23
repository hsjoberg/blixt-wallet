import { PermissionsAndroid } from "react-native";
import { Thunk, thunk } from "easy-peasy";
import { requestNotifications } from "react-native-permissions";

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
import {
  Notification,
  NotificationBackgroundFetchResult,
  NotificationCompletion,
  Notifications,
} from "react-native-notifications";
import { NotificationActionResponse } from "react-native-notifications/lib/dist/interfaces/NotificationActionResponse";
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
        const result = await requestNotifications(["alert", "sound", "badge"]);
        log.d("request notification status", [result.status]);

        if (result.status === "granted" && PLATFORM === "android") {
          Notifications.setNotificationChannel({
            channelId: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
            name: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_NAME,
            importance: 3,
            enableLights: true,
            enableVibration: true,
            showBadge: true,
          });
        }
      }

      Notifications.events().registerNotificationReceivedForeground(
        (notification: Notification, completion: (response: NotificationCompletion) => void) => {
          console.log("Notification Received - Foreground", notification.payload);

          // Calling completion on iOS with `alert: true` will present the native iOS inApp notification.
          completion({ alert: true, sound: true, badge: false });
        },
      );

      Notifications.events().registerNotificationOpened(
        (
          notification: Notification,
          completion: () => void,
          action: NotificationActionResponse | undefined,
        ) => {
          console.log("Notification opened by device user", notification.payload);
          console.log(
            `Notification opened with an action identifier: ${action?.identifier} and response text: ${action?.text}`,
          );
          completion();
        },
      );

      Notifications.events().registerNotificationReceivedBackground(
        (
          notification: Notification,
          completion: (response: NotificationBackgroundFetchResult) => void,
        ) => {
          console.log("Notification Received - Background", notification.payload);

          // Calling completion on iOS with `alert: true` will present the native iOS inApp notification.
          completion({ alert: true, sound: true, badge: false });
        },
      );
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
