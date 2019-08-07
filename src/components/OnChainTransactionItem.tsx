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
  return (
    <ListItem>
      {transaction.type === "CHANNEL_OPEN" &&
        <Icon type="Entypo" name="circular-graph" style={{color: blixtTheme.primary }} />
      }
      {transaction.type === "CHANNEL_CLOSE" &&
        <Icon type="Entypo" name="circular-graph" style={{color: blixtTheme.primary }} />
      }
      {transaction.type === "NORMAL" && transaction.amount! >= 0 &&
        <Icon type="AntDesign" name="plus" style={{color: blixtTheme.green }} />
      }
      {transaction.type === "NORMAL" && transaction.amount! < 0 &&
        <Icon type="AntDesign" name="minus" style={{color: blixtTheme.red }} />
      }
      {transaction.amount === undefined &&
        <Icon type="MaterialIcons" name="error-outline" style={{color: blixtTheme.red }} />
      }
      <Body>
        <View style={{ flexDirection: "row" }}>
          <Text>{formatISO(fromUnixTime(transaction.timeStamp))}</Text>
          <Right>
            {transaction.amount && <Text>{transaction.amount} Satoshi</Text>}
          </Right>
        </View>
        {transaction.type === "CHANNEL_OPEN" &&
          <Text>Opened a payment channel</Text>
        }
        {transaction.type === "CHANNEL_CLOSE" &&
          <Text>Closed a payment channel</Text>
        }
        {transaction.type === "NORMAL" && transaction.amount! >= 0 &&
          <Text style={{ fontSize: 13 }} note={true}>Received Bitcoin</Text>
        }
        {transaction.type === "NORMAL" && transaction.amount! < 0 && transaction!.destAddresses!.length > 0 &&
          <Text style={{ fontSize: 12.5 }} note={true}>
            To {transaction!.destAddresses![transaction!.destAddresses!.length - 1]}
          </Text>
        }
        {transaction.amount === undefined &&
          <Text>Error</Text>
        }
      </Body>
    </ListItem>
  );
};

export default OnChainTransactionItem;
