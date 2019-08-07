import React from "react";
import { View } from "react-native";
import { Body, Text, Right, ListItem, Icon } from "native-base";
import { fromUnixTime } from "date-fns";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { IBlixtTransaction } from "../state/OnChain";
import { formatISO } from "../utils";

export interface IOnChainTransactionItemProps {
  transaction: IBlixtTransaction;
}
export const OnChainTransactionItem = ({ transaction }: IOnChainTransactionItemProps) => {
  let icon;
  let text;
  if (transaction.amount === undefined) {
    icon = (<Icon type="MaterialIcons" name="error-outline" style={{color: blixtTheme.red }} />);
    text = (<Text>Error</Text>);
  }
  else if (transaction.type === "NORMAL" && transaction.amount!.gte(0)) {
    icon = (<Icon type="AntDesign" name="plus" style={{color: blixtTheme.green }} />);
    text = (<Text style={{ fontSize: 13 }} note={true}>Received Bitcoin</Text>);
  }
  else if (transaction.type === "NORMAL" && transaction.amount!.lt(0)) {
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
    <ListItem>
      {icon}
      <Body>
        <View style={{ flexDirection: "row" }}>
          <Text>{formatISO(fromUnixTime(transaction.timeStamp!.toInt()))}</Text>
          <Right>
            {transaction.amount && <Text>{transaction.amount.toString()} Satoshi</Text>}
          </Right>
        </View>
        {text}
      </Body>
    </ListItem>
  );
};

export default OnChainTransactionItem;
