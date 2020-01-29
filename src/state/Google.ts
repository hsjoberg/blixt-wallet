import { Action, action, Thunk, thunk, computed, Computed } from "easy-peasy";
import { IStoreModel } from "../state";
import { GoogleSignin, statusCodes, User } from '@react-native-community/google-signin';

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
    GoogleSignin.configure({
      scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    });

    const hasPlayServices = await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });
    actions.setHasPlayServices(hasPlayServices);

    if (hasPlayServices) {
      try {
        const user = await GoogleSignin.signInSilently();
        actions.setUser(user);
        actions.setIsSignedIn(true);
      } catch (e) {
        if (e.code !== statusCodes.SIGN_IN_REQUIRED) {
          console.warn(`Google: Got unknown error from GoogleSignin.signInSilently(): ${e.code}`);
          console.log(JSON.stringify(e));
        }
      }
    }
  }),

  signIn: thunk(async (actions, _, { getState }) => {
    if (!(getState().hasPlayServices)) {
      throw new Error("Google Play Services needed to login to Google");
    }

    try {
      const user = await GoogleSignin.signIn();

      console.log(user);
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
      }
    }
  }),

  signOut: thunk(async (actions) => {
    await GoogleSignin.revokeAccess();
    await GoogleSignin.signOut();
    actions.setIsSignedIn(false);
    // await GoogleSignin.clearCachedToken()
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