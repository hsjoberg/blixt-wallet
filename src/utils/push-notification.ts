import PushNotification, { PushNotificationObject } from "react-native-push-notification";
import { ANDROID_PUSH_NOTIFICATION_PUSH_CHANNEL_ID } from "./constants";
import firebase from "@react-native-firebase/app";
import { Alert } from "./alert";

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

export const notificationListener = () => {
  firebase.messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log(
      "Notification caused app to open from background state:",
      remoteMessage.notification,
    );
  });

  // Quiet and Background State -> Check whether an initial notification is available
  firebase
    .messaging()
    .getInitialNotification()
    .then((remoteMessage) => {
      if (remoteMessage) {
        console.log("Notification caused app to open from quit state:", remoteMessage.notification);
      }
    })
    .catch((error) => console.error("Quiet and background state error: ", error));

  // Foreground State
  firebase.messaging().onMessage(async (remoteMessage) => {
    Alert.alert("A new FCM message arrived!", JSON.stringify(remoteMessage));
    console.log("foreground", remoteMessage);
  });
};

export const getFcmToken = async () => {
  try {
    const newFcmToken = await firebase.messaging().getToken();
    return newFcmToken;
  } catch (error) {
    console.error("error fetching firebase token", error);
    return null;
  }
};

export const requestUserPermission = async () => {
  const authStatus = await firebase.messaging().requestPermission();
  const enabled =
    authStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === firebase.messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log("Authorization status:", authStatus);
  }
};
