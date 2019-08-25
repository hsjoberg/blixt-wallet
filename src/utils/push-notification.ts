import PushNotification from "react-native-push-notification";

PushNotification.configure({
  onNotification: function(notification) {
    console.log("NOTIFICATION:", notification);
  },
  requestPermissions: false
});

export const localNotification = (message: string): void => {
  PushNotification.localNotification({
    message: message,
    playSound: false,
    vibrate: false,
    priority: "min",
    importance: "min",
    autoCancel: true,
  });
};
