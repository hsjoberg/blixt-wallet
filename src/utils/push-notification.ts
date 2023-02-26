import PushNotification, { PushNotificationObject } from "react-native-push-notification";
import { ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID } from "./constants";

export const localNotification = (
  message: string,
  importance: PushNotificationObject["importance"] = "default",
): void => {
  PushNotification.localNotification({
    channelId: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
    message,
    playSound: true,
    vibrate: false,
    priority: "default",
    importance,
    autoCancel: true,
  });
};
