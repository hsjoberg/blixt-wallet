export const setInternetCredentials = jest.fn().mockResolvedValue(undefined);

export const setGenericPassword = jest.fn().mockResolvedValue(undefined);

export const getGenericPassword = jest.fn().mockResolvedValue(undefined);

export const resetGenericPassword = jest.fn().mockResolvedValue(undefined);

export const getInternetCredentials = jest.fn().mockResolvedValue({ password: "password" });

export const ACCESSIBLE = {
  WHEN_UNLOCKED: "AccessibleWhenUnlocked",
  AFTER_FIRST_UNLOCK: "AccessibleAfterFirstUnlock",
  ALWAYS: "AccessibleAlways",
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: "AccessibleWhenPasscodeSetThisDeviceOnly",
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: "AccessibleWhenUnlockedThisDeviceOnly",
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: "AccessibleAfterFirstUnlockThisDeviceOnly",
  ALWAYS_THIS_DEVICE_ONLY: "AccessibleAlwaysThisDeviceOnly",
};
