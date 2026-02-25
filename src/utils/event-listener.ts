import { DeviceEventEmitter, NativeEventEmitter } from "react-native";
import { PLATFORM } from "./constants";

import NativeBlixtTools from "../turbomodules/NativeBlixtTools";

export const LndMobileToolsEventEmitter =
  PLATFORM == "android" ? DeviceEventEmitter : new NativeEventEmitter(NativeBlixtTools);
