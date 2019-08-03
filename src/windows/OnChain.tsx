import React, { useEffect } from "react";
import { FlatList, StyleSheet, View, Clipboard } from "react-native";
import { Body, Text, Header, Container, Content, H1, H3, Right, Left, ListItem, Button, Title, Icon, Toast } from "native-base";
import { NavigationScreenProp, createStackNavigator } from "react-navigation";
import { format, fromUnixTime } from "date-fns";
import * as QRCode from "qrcode";
import SvgUri from "react-native-svg-uri";

import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { useStoreState, useStoreActions } from "../state/store";
import { IBlixtTransaction } from "../state/OnChain";

export interface ITransactionItemProps {
  transaction: IBlixtTransaction;
}
export const TransactionItem = ({ transaction }: ITransactionItemProps) => {
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
          <Text>{format(fromUnixTime(transaction.timeStamp), "yyyy-MM-dd hh:mm")}</Text>
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

interface IOnChainTransactionLogProps {
  navigation: NavigationScreenProp<{}>;
}
const OnChainTransactionLog = ({ navigation }: IOnChainTransactionLogProps) => {
  const transactions = useStoreState((store) => store.onChain.transactions);
  const getTransactions = useStoreActions((store) => store.onChain.getTransactions);

  useEffect(() => {
    (async () => {
      await getTransactions(undefined);
    })();
  }, [getTransactions]);

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.pop()}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Transaction Log</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={async () => await getTransactions(undefined)}>
            <Icon name="sync" />
          </Button>
        </Right>
      </Header>
      <Content>
        <FlatList
          style={{ padding: 12 }}
          data={transactions.sort((tx1, tx2) => tx2.timeStamp - tx1.timeStamp)}
          renderItem={({ item: transaction }) => <TransactionItem key={transaction.txHash!} transaction={transaction} />}
          keyExtractor={(transaction, i) => transaction.txHash! + i}
        />
      </Content>
    </Container>
  );
};

interface IOnChainProps {
  navigation: NavigationScreenProp<{}>;
}
export const OnChain = ({ navigation }: IOnChainProps) => {
  const getBalance = useStoreActions((store) => store.onChain.getBalance);
  const getAddress = useStoreActions((store) => store.onChain.getAddress);
  const balance = useStoreState((store) => store.onChain.balance);
  const address = useStoreState((store) => store.onChain.address);

  useEffect(() => {
    (async () => {
      await getBalance(undefined);
      await getAddress(undefined);
    })();
  }, []);

  if (!address) {
    return (<></>);
  }

  const onGeneratePress = async () => await getAddress(undefined);

  const onBtcAddressPress = () => {
    Clipboard.setString(address);
    Toast.show({
      text: "Copied to clipboard.",
      type: "warning",
    });
  };

  return (
    <Container>
      <Header iosBarStyle="light-content" translucent={false}>
        <Left>
          <Button transparent={true} onPress={() => navigation.navigate("Main")}>
            <Icon name="arrow-back" />
          </Button>
        </Left>
        <Body>
          <Title>Bitcoin</Title>
        </Body>
        <Right>
          <Button transparent={true} onPress={() => navigation.navigate("OnChainTransactionLog")}>
            <Icon type="AntDesign" name="bars" />
          </Button>
        </Right>
      </Header>
      <View style={{ flex: 1 }}>
        <View style={style.fundsInfo}>
          <H1 style={{ textAlign: "center" }}>On-chain funds:{"\n"}{balance.toString()} Satoshi</H1>
        </View>

        <View style={style.qrContainer}>
          <View style={style.qr}>
            <H3 style={{ marginBottom: 8 }}>Send Bitcoin on-chain to this address:</H3>
            <SvgUri
              width={340}
              height={340}
              fill={blixtTheme.light}
              svgXmlData={(QRCode as any).toString(address.toUpperCase())._55}
            />
            <Text
              style={{ paddingTop: 6, paddingLeft: 18, paddingRight: 18, paddingBottom: 20 }}
              numberOfLines={1}
              lineBreakMode="middle"
              onPress={onBtcAddressPress}>
                {address}
            </Text>
          </View>
          <Button block={true} primary={true} onPress={onGeneratePress}>
            <Text>Generate new address</Text>
          </Button>
        </View>
      </View>
    </Container>
  );
};

const style = StyleSheet.create({
  fundsInfo: {
    flex: 0.25,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  qrContainer: {
    flex: 0.75,
    paddingLeft: 24,
    paddingRight: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  qr: {
    flex: 1,
    width: "100%",
    alignItems: "center",
  },
});

export default createStackNavigator({
  OnChain,
  OnChainTransactionLog,
}, {
  headerMode: "none",
  initialRouteName: "OnChain",
});
