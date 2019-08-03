import { createStackNavigator } from "react-navigation";

import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";

export default createStackNavigator({
  OnChainInfo,
  OnChainTransactionLog,
}, {
  headerMode: "none",
  initialRouteName: "OnChainInfo",
});
