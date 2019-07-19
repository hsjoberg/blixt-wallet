import { AppState, NativeModules } from "react-native";
import { Thunk, thunk, Action, action } from "easy-peasy";

export interface ILndProcessModel {
  initialize: Thunk<ILndProcessModel>;
}
