import PushNotification, { PushNotificationObject } from "react-native-push-notification";

export const localNotification = (message: string, importance: PushNotificationObject["importance"] = "default"): void => {
  PushNotification.localNotification({
    message,
    playSound: true,
    vibrate: false,
    priority: "default",
    importance,
    autoCancel: true,
  });
};
