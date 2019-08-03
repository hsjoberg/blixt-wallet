import { createStackNavigator } from "react-navigation";
import LightningInfo from "./LightningInfo";
import OpenChannel from "./OpenChannel";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

export default createStackNavigator({
  LightningInfo,
  OpenChannel,
}, {
  headerMode: "none",
  initialRouteName: "LightningInfo",
});
