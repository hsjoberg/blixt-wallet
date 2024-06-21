import { Notifications } from "react-native-notifications";

export const localNotification = (message: string): void => {
  Notifications.postLocalNotification({
    body: message,
  });
};
