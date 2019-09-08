import { createStackNavigator } from "react-navigation-stack";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import ChangeFingerprintSettingsAuth from "./ChangeFingerprintSettingsAuth";
// LightningNodeInfo modal is in root stack
// About modal is in root stack

export default createStackNavigator({
  Settings,
  RemovePincodeAuth,
  SetPincode,
  ChangeFingerprintSettingsAuth,
}, {
  headerMode: "none",
  initialRouteName: "Settings",
});
