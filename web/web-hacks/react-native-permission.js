const PERMISSIONS = Object.freeze({
  ANDROID: {},
  IOS: {},
  WINDOWS: {},
});

const RESULTS = Object.freeze({
  UNAVAILABLE: "unavailable",
  BLOCKED: "blocked",
  DENIED: "denied",
  GRANTED: "granted",
  LIMITED: "limited",
});

const openLimitedPhotoLibraryPicker = async () => {};
const openSettings = async () => {};
const check = async (permission) => RESULTS.GRANTED;
const request = async (permission) => RESULTS.GRANTED;
const checkLocationAccuracy = async () => "full";
const requestLocationAccuracy = async (options) => "full";

const notificationOptions = ["alert", "badge", "sound", "carPlay", "criticalAlert", "provisional"];

const notificationSettings = {
  alert: true,
  badge: true,
  sound: true,
  carPlay: true,
  criticalAlert: true,
  provisional: true,
  lockScreen: true,
  notificationCenter: true,
};

const checkNotifications = async () => ({
  status: RESULTS.GRANTED,
  settings: notificationSettings,
});

const requestNotifications = async (options) => ({
  status: RESULTS.GRANTED,
  settings: options
    .filter((option) => notificationOptions.includes(option))
    .reduce((acc, option) => ({ ...acc, [option]: true }), {
      lockScreen: true,
      notificationCenter: true,
    }),
});

const checkMultiple = async (permissions) =>
  permissions.reduce((acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
  }));

const requestMultiple = async (permissions) =>
  permissions.reduce((acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
  }));

const permissions = {
  PERMISSIONS,
  RESULTS,

  check,
  checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openLimitedPhotoLibraryPicker,
  openSettings,
  request,
  requestLocationAccuracy,
  requestMultiple,
  requestNotifications,
};

export {
  PERMISSIONS,
  RESULTS,
  check,
  checkLocationAccuracy,
  checkMultiple,
  checkNotifications,
  openLimitedPhotoLibraryPicker,
  openSettings,
  request,
  requestLocationAccuracy,
  requestMultiple,
  requestNotifications,
};

export default permissions;
