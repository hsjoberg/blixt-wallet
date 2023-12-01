import PushNotification, { PushNotificationObject } from "react-native-push-notification";
import PushNotificationIOS from "@react-native-community/push-notification-ios";
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

// Must be outside of any component LifeCycle (such as `componentDidMount`).
PushNotification.configure({
  // (optional) Called when Token is generated (iOS and Android)
  onRegister: function (token) {
    console.log("TOKEN:", token);
  },

  // (required) Called when a remote is received or opened, or local notification is opened
  onNotification: function (notification) {
    console.log("NOTIFICATION:", notification);

    // process the notification

    // (required) Called when a remote is received or opened, or local notification is opened
    notification.finish(PushNotificationIOS.FetchResult.NoData);
  },

  // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
  onAction: function (notification) {
    console.log("ACTION:", notification.action);
    console.log("NOTIFICATION:", notification);

    // process the action
  },

  // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
  onRegistrationError: function (err) {
    console.error(err.message, err);
  },

  // IOS ONLY (optional): default: all - Permissions to register.
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },

  // Should the initial notification be popped automatically
  // default: true
  popInitialNotification: true,

  /**
   * (optional) default: true
   * - Specified if permissions (ios) and token (android and ios) will requested or not,
   * - if not, you must call PushNotificationsHandler.requestPermissions() later
   * - if you are not using remote notification or do not have Firebase installed, use this:
   *     requestPermissions: Platform.OS === 'ios'
   */
  requestPermissions: true,
});

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
    .catch((error) => console.log("failed", error));

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
