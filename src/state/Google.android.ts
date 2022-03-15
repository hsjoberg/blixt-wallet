import { Action, action, Thunk, thunk } from "easy-peasy";
import { GoogleSignin, statusCodes, User } from "@react-native-google-signin/google-signin";

import logger from "./../utils/log";
import { PLATFORM } from "../utils/constants";
const log = logger("Google");

export interface IGoogleDriveToken {
  idToken: string;
  accessToken: string;
}

export interface IGoogleModel {
  initialize: Thunk<IGoogleModel>;

  signIn: Thunk<IGoogleModel>;
  signOut: Thunk<IGoogleModel>;
  getTokens: Thunk<IGoogleModel, void, any, {}, Promise<IGoogleDriveToken>>;

  setIsSignedIn: Action<IGoogleModel, boolean>;
  setHasPlayServices: Action<IGoogleModel, boolean>;
  setUser: Action<IGoogleModel, User>;

  isSignedIn: boolean;
  hasPlayServices: boolean;
  user?: User;
};

export const google: IGoogleModel = {
  initialize: thunk(async (actions) => {
    log.i("Initializing", [PLATFORM]);

    try {
      GoogleSignin.configure({
        scopes: ["https://www.googleapis.com/auth/drive.appdata"],
      });

      log.i("hasPlayServices");
      const hasPlayServices = await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: false,
      });
      actions.setHasPlayServices(hasPlayServices);
      log.i("after");

      if (hasPlayServices) {
        try {
          const user = await GoogleSignin.signInSilently();
          actions.setIsSignedIn(true);
          actions.setUser(user);
        } catch (e) {
          if (e.code !== statusCodes.SIGN_IN_REQUIRED) {
            log.w(`Got unexpected error from GoogleSignin.signInSilently(): ${e.code}`, [e]);
          }
        }
      }
    } catch (e) {
      log.i("Got exception", [e]);
    }
    log.d("Done");
  }),

  signIn: thunk(async (actions, _, { getState }) => {
    if (!(getState().hasPlayServices)) {
      throw new Error("Google Play Services needed to login to Google");
    }

    try {
      const user = await GoogleSignin.signIn();
      actions.setUser(user);
      actions.setIsSignedIn(true);
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // user cancelled the login flow
      } else if (error.code === statusCodes.IN_PROGRESS) {
        // operation (e.g. sign in) is in progress already
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        // play services not available or outdated
      } else {
        // some other error happened
        log.e("Got expected error from GoogleSignin.signIn(): ${e.code}", [error]);
      }
      return false
    }
    return true;
  }),

  signOut: thunk(async (actions) => {
    // await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    actions.setIsSignedIn(false);
  }),

  getTokens: thunk(async (_, _2, { getState }) => {
    if (!getState().isSignedIn) {
      throw new Error("Attempting to call Google.getTokens() when user not logged in");
    }
    return await GoogleSignin.getTokens();
  }),

  setIsSignedIn: action((store, payload) => { store.isSignedIn = payload; }),
  setHasPlayServices: action((store, payload) => { store.hasPlayServices = payload; }),
  setUser: action((store, payload) => { store.user = payload; }),

  isSignedIn: false,
  hasPlayServices: false,
}
