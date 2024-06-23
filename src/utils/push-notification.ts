import { Notifications } from "react-native-notifications";
import { ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID } from "./constants";

export const localNotification = (message: string): void => {
  Notifications.postLocalNotification({
    body: message,
    android_channel_id: ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID,
  });
};
