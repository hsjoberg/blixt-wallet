var PERMISSIONS = Object.freeze({
  ANDROID: {},
  IOS: {},
  WINDOWS: {}
});

var RESULTS = Object.freeze({
  UNAVAILABLE: 'unavailable',
  BLOCKED: 'blocked',
  DENIED: 'denied',
  GRANTED: 'granted',
  LIMITED: 'limited'
});

var openLimitedPhotoLibraryPicker = (async () => {});
var openSettings = (async () => {});
var check = (async (permission) => RESULTS.GRANTED);
var request = (async (permission) => RESULTS.GRANTED);
var checkLocationAccuracy = (async () => 'full');
var requestLocationAccuracy = (async (options) => 'full');

var notificationOptions = ['alert', 'badge', 'sound', 'carPlay', 'criticalAlert', 'provisional'];

var notificationSettings = {
  alert: true,
  badge: true,
  sound: true,
  carPlay: true,
  criticalAlert: true,
  provisional: true,
  lockScreen: true,
  notificationCenter: true,
};

var checkNotifications = async () => ({
  status: RESULTS.GRANTED,
  settings: notificationSettings,
});

var requestNotifications = async (options) => ({
  status: RESULTS.GRANTED,
  settings: options
    .filter((option) => notificationOptions.includes(option))
    .reduce((acc, option) => ({...acc, [option]: true}), {
      lockScreen: true,
      notificationCenter: true,
    }),
});

var checkMultiple = async (permissions) =>
  permissions.reduce((acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
  }));

var requestMultiple = async (permissions) =>
  permissions.reduce((acc, permission) => ({
    ...acc,
    [permission]: RESULTS.GRANTED,
  }));

module.exports = {
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
