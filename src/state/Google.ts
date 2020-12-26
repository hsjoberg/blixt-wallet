import { Action, action, Thunk, thunk } from "easy-peasy";

import logger from "./../utils/log";
const log = logger("Google");

export interface IGoogleDriveToken {
  idToken: string;
  accessToken: string;
}

export interface IGoogleModel {
  initialize: Thunk<IGoogleModel>;

  signIn: Thunk<IGoogleModel>;
  signOut: Thunk<IGoogleModel>;
  getTokens: Thunk<IGoogleModel, void, any, {}, Promise<any>>;

  setIsSignedIn: Action<IGoogleModel, boolean>;
  setHasPlayServices: Action<IGoogleModel, boolean>;
  setUser: Action<IGoogleModel, any>;

  isSignedIn: boolean;
  hasPlayServices: boolean;
  user?: any;
};

export const google: IGoogleModel = {
  initialize: thunk(async (actions) => {
  }),

  signIn: thunk(async (actions, _, { getState }) => {
  }),

  signOut: thunk(async (actions) => {
  }),

  getTokens: thunk(async (_, _2, { getState }) => {
  }),

  setIsSignedIn: action((store, payload) => { store.isSignedIn = payload; }),
  setHasPlayServices: action((store, payload) => { store.hasPlayServices = payload; }),
  setUser: action((store, payload) => { store.user = payload; }),

  isSignedIn: false,
  hasPlayServices: false,
}
