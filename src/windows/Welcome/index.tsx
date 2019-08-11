import Start from "./Start";
import Seed from "./Seed";
import Confirm from "./Confirm";
import AddFunds from "./AddFunds";
import Restore from "./Restore";
import { createSwitchNavigator } from "react-navigation";

export default createSwitchNavigator({
  Start,
  Seed,
  Confirm,
  AddFunds,
  Restore,
}, {
  initialRouteName: "Start",
});
