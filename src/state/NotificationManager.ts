import { Action, action, Thunk, thunk } from "easy-peasy";
import PushNotification, { PushNotificationObject } from "react-native-push-notification";

import logger from "./../utils/log";
import { navigate } from "../utils/navigation";
import { IStoreModel } from ".";
const log = logger("NotificationManager");

interface ILocalNotificationPayload {
  message: string;
  importance?: PushNotificationObject["importance"];
}

export interface INotificationManagerModel {
  initialize: Thunk<INotificationManagerModel>;

  localNotification: Thunk<INotificationManagerModel, ILocalNotificationPayload,  any, IStoreModel>;
};

export const notificationManager: INotificationManagerModel = {
  initialize: thunk(async () => {
    log.d("Initializing");

    PushNotification.configure({
      requestPermissions: false,
      onNotification: ((notification) => {
        log.i("onNotification");

        if (notification.message.toString().includes("on-chain")) {
          log.i("Navigating to OnChainTransactionLog");
          navigate("OnChain", { screen: "OnChainTransactionLog"});
        }
        else if (notification.message.toString().toLocaleLowerCase().includes("payment channel")) {
          log.i("Navigating to LightningInfo");
          navigate("LightningInfo");
        }
      }),
    });
  }),

  localNotification: thunk((state, { message, importance }, { getStoreState }) => {
    if (getStoreState().settings.pushNotificationsEnabled) {
      PushNotification.localNotification({
        message,
        playSound: true,
        vibrate: false,
        priority: "default",
        importance: importance ?? "default",
        autoCancel: true,
      });
    }
  }),
};