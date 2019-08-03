import { createSwitchNavigator } from "react-navigation";
import SendCamera from "./SendCamera";
import SendConfirmation from "./SendConfirmation";

export default createSwitchNavigator({
  SendCamera,
  SendConfirmation,
}, {
  initialRouteName: "SendCamera",
});
