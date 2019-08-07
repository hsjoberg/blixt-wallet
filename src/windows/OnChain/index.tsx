import { createStackNavigator } from "react-navigation";
import OnChainInfo from "./OnChainInfo";
import OnChainTransactionLog from "./OnChainTransactionLog";
import Withdraw from "./Withdraw";

export default createStackNavigator({
  OnChainInfo,
  OnChainTransactionLog,
  Withdraw,
}, {
  headerMode: "none",
  initialRouteName: "OnChainInfo",
});
