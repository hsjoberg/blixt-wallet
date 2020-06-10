import PushNotification, { PushNotificationObject } from "react-native-push-notification";

PushNotification.configure({
  onNotification: function(notification) {
    console.log("NOTIFICATION:", notification);
  },
  requestPermissions: false
});

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