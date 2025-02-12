import { Thunk, thunk } from "easy-peasy";

const notifee = require("@notifee/react-native").default;
const {
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
} = require("@notifee/react-native");

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
  startPersistentService: Thunk<INotificationManagerModel>;
  stopPersistentService: Thunk<INotificationManagerModel>;
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
    } catch (error: any) {
      // TODO(hsjoberg): Perhaps should be handled in the lib instead?
      if (error.domain === "UNErrorDomain") {
        return;
      }

      throw error;
    }
  }),

  startPersistentService: thunk(async () => {
    log.i("starting notifee persistent service");
    notifee.registerForegroundService(() => {
      return new Promise(() => {});
    });
    const channelId = await notifee.createChannel({
      id: "blixt",
      name: "Blixt Wallet",
    });
    notifee.displayNotification({
      title: "Blixt Wallet",
      body: "",
      android: {
        smallIcon: "ic_small_icon",
        channelId,
        asForegroundService: true,
        colorized: false,
        ongoing: true,
      },
    });
  }),

  stopPersistentService: thunk(async () => {
    log.i("STOPPING notifee persistent service");
    await notifee.stopForegroundService();
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
