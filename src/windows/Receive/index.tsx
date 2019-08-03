import { createSwitchNavigator } from "react-navigation";
import ReceiveSetup from "./ReceiveSetup";
import ReceiveQr from "./ReceiveQr";

export default createSwitchNavigator({
  ReceiveSetup,
  ReceiveQr,
}, {
  initialRouteName: "ReceiveSetup",
});
