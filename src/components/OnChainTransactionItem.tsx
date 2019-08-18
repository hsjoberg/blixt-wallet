import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { Body, Text, Right, ListItem, Icon } from "native-base";
import { fromUnixTime } from "date-fns";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { IBlixtTransaction } from "../state/OnChain";
import { formatISO } from "../utils";
import { IBitcoinUnits, formatBitcoin } from "../utils/bitcoin-units";

export interface IOnChainTransactionItemProps {
  transaction: IBlixtTransaction;
  onPress: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  unit: keyof IBitcoinUnits;
}
export const OnChainTransactionItem = ({ transaction, onPress, style, unit }: IOnChainTransactionItemProps) => {
  let icon;
  let text;
  if (transaction.amount === undefined) {
    icon = (<Icon type="MaterialIcons" name="error-outline" style={{color: blixtTheme.red }} />);
    text = (<Text>Error</Text>);
  }
  else if (transaction.type === "NORMAL" && transaction.amount!.isPositive()) {
    icon = (<Icon type="AntDesign" name="plus" style={{color: blixtTheme.green }} />);
    text = (<Text style={{ fontSize: 13 }} note={true}>Received Bitcoin</Text>);
  }
  else if (transaction.type === "NORMAL" && transaction.amount!.isNegative()) {
    icon = (<Icon type="AntDesign" name="minus" style={{color: blixtTheme.red }} />);
    text = (
      <Text style={{ fontSize: 12.5 }} note={true}>
        To {transaction!.destAddresses![transaction!.destAddresses!.length - 1]}
      </Text>
    );
  }
  else if (transaction.type === "CHANNEL_OPEN") {
    icon = (<Icon type="Entypo" name="circular-graph" style={{color: blixtTheme.primary }} />);
    text = (<Text>Opened a payment channel</Text>);
  }
  else if (transaction.type === "CHANNEL_CLOSE") {
    icon = (<Icon type="Entypo" name="circular-graph" style={{color: blixtTheme.primary }} />);
    text = (<Text>Closed a payment channel</Text>);
  }

  return (
    <ListItem onPress={() => onPress(transaction.txHash!)}>
      <View style={[{ flexDirection: "row", justifyContent: "center", alignItems: "center" }, style]}>
        {icon}
        <Body>
          <View style={{ flexDirection: "row" }}>
            <Text>{formatISO(fromUnixTime(transaction.timeStamp!.toNumber()))}</Text>
            <Right>
              {transaction.amount && <Text>{formatBitcoin(transaction.amount, unit)}</Text>}
            </Right>
          </View>
          {text}
        </Body>
      </View>
    </ListItem>
  );
};

export default OnChainTransactionItem;
