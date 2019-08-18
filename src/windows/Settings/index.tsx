import { createStackNavigator } from "react-navigation";

import Settings from "./Settings";
import SetPincode from "./SetPincode";
import RemovePincodeAuth from "./RemovePincodeAuth";
import RemoveFingerprintAuth from "./RemoveFingerprintAuth";
// LightnigNodeInfo is in root stack

export default createStackNavigator({
  Settings,
  RemovePincodeAuth,
  SetPincode,
  RemoveFingerprintAuth,
}, {
  headerMode: "none",
  initialRouteName: "Settings",
});
