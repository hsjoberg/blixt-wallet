import { createSwitchNavigator } from "react-navigation";

import Start from "./Start";
import Seed from "./Seed";
import Confirm from "./Confirm";
import AddFunds from "./AddFunds";
import AlmostDone from "./AlmostDone";
import Restore from "./Restore";

export default createSwitchNavigator({
  Start,
  Seed,
  Confirm,
  AddFunds,
  AlmostDone,
  Restore,
}, {
  initialRouteName: "Start",
});
