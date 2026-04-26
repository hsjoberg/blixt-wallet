export const AuthorizationStatus = {
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

export const AndroidImportance = {
  LOW: 2,
  DEFAULT: 3,
  HIGH: 4,
};

export const AndroidVisibility = {
  PRIVATE: 0,
  PUBLIC: 1,
};

const notifee = {
  async requestPermission() {
    return {
      authorizationStatus: AuthorizationStatus.AUTHORIZED,
    };
  },

  async createChannel({ id }) {
    return id ?? "default";
  },

  async displayNotification() {
    return;
  },

  registerForegroundService() {},

  async stopForegroundService() {
    return;
  },
};

export default notifee;
