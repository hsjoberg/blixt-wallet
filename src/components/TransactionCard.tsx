import React from "react";
import { StyleSheet, View } from "react-native";
import { Body, Card, CardItem, Text, Right, Icon } from "native-base";
import { Col, Row, Grid } from "react-native-easy-grid";
import { format, fromUnixTime } from "date-fns";
import { ITransaction } from "../storage/database/transaction";

interface IProps {
  onPress: (id: string) => void;
  transaction: ITransaction;
}
export default ({ onPress, transaction }: IProps) => {
  const {
    date,
    value,
    description,
    status,
  } = transaction;

  const positive = value > 0;

  return (
    <Card>
      <CardItem activeOpacity={1} button={true} onPress={() => onPress(transaction.rHash)}>
        <Body>
          <Row style={transactionStyle.transactionTop}>
            {/*<Icon type="AntDesign" name="pluscircleo" style={{ ...transaction.typeIcon, ...transaction.typeIconReceive}} />*/}
            <Text style={transactionStyle.transactionTopDate}>
              {format(fromUnixTime(date), "yyyy-MM-dd hh:mm")}
            </Text>
            <Right>
              <Text style={positive ? transactionStyle.transactionTopValuePositive : transactionStyle.transactionTopValueNegative}>
                {value !== 0 && (positive ? "+" : "-")}
                {value !== 0 && value + " Sat"}
              </Text>
            </Right>
          </Row>
          <View style={{ flex: 1, display: "flex", flexDirection: "row", justifyContent: "space-between", width: "100%" }}>
            <Text note={true}>
              {description || "No description"}
            </Text>
            <Text note={true} style={{ marginRight: 0 }}>
              {status !== "SETTLED" && capitalize(status)}
            </Text>
          </View>
        </Body>
      </CardItem>
    </Card>
  );
};

const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

// TODO this is so stupid
// Also cannot handle >= 1  || <= 1
function formatSatToBtc(sat: number) {
  if (sat < 0) {
    sat = Math.abs(sat);
  }

  let numZeroes;
  if (sat < 10) {
    numZeroes = 7;
  }
  else if (sat < 100) {
    numZeroes = 6;
  }
  else if (sat < 1000) {
    numZeroes = 5;
  }
  else if (sat < 10000) {
    numZeroes = 4;
  }
  else if (sat < 100000) {
    numZeroes = 3;
  }
  else if (sat < 1000000) {
    numZeroes = 2;
  }
  else if (sat < 10000000) {
    numZeroes = 1;
  }
  else {
    numZeroes = 0;
  }

  const str = ("0." + "0".repeat(numZeroes) + sat);
  return str;
}

const transactionStyle = StyleSheet.create({
  transactionTop: {
    marginBottom: 8,
  },
  transactionTopDate: {
    fontWeight: "bold",
    paddingRight: 4,
  },
  transactionTopValuePositive: {
    color: "green",
//    fontSize: 18
  },
  transactionTopValueNegative: {
    color: "red",
  },
  transactionOnChain: {
    fontSize: 13,
    marginTop: 3,
    paddingRight: 5,
  },
  typeIcon: {
    fontSize: 13,
    paddingTop: 5,
    paddingRight: 5,
  },
  typeIconSend: {
    color: "red",
  },
  typeIconReceive: {
    color: "green",
  },
});

// <Card>
//   <CardItem button={true} onPress={() => onPress("test")}>
//     <Body>
//       <Row style={transaction.transactionTop}>
//         {/*<Icon type="AntDesign" name="minuscircleo" style={{ ...transaction.typeIcon, ...transaction.typeIconSend}} />*/}
//         <Text style={transaction.transactionTopDate}>2019-01-01</Text>
//         <Right>
//           <Text style={transaction.transactionTopValueNegative}>
//             - 0 00000001 ₿
//           </Text>
//         </Right>
//       </Row>
//       <Text note={true}>
//          Satoshis.club article "Bitcoin Mining will help kickstart renewable energy projects"
//       </Text>
//     </Body>
//   </CardItem>
// </Card>
// <Card>
//   <CardItem button={true} onPress={() => onPress("test")}>
//     <Body>
//       <Row style={transaction.transactionTop}>
//         {/*<Icon type="AntDesign" name="pluscircleo" style={{ ...transaction.typeIcon, ...transaction.typeIconReceive}} />*/}
//         <Text style={transaction.transactionTopDate}>2019-01-01</Text>
//         <Right>
//           <Text style={transaction.transactionTopValuePositive}>
//             + 0 00000001 ₿
//           </Text>
//         </Right>
//       </Row>
//       <Text note={true}>
//          Lunch with Alice
//       </Text>
//     </Body>
//   </CardItem>
// </Card>
// <Card>
//   <CardItem button={true} onPress={() => onPress("test")}>
//     <Body>
//       <Row style={transaction.transactionTop}>
//         <Text style={transaction.transactionTopDate}>2019-01-01</Text>
//         <Right>
//           <View style={{flex: 1, flexDirection: "row"}}>
//             <Text style={transaction.transactionOnChain} note={true}>onchain</Text>
//             <Text style={transaction.transactionTopValuePositive}>
//               + 0 00000001 ₿
//             </Text>
//           </View>
//         </Right>
//       </Row>
//       <Text note={true}>
//          From 1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
//       </Text>
//     </Body>
//   </CardItem>
// </Card>
// <Card>
//   <CardItem button={true} onPress={() => onPress("test")}>
//     <Body>
//       <Row style={transaction.transactionTop}>
//         <Text style={transaction.transactionTopDate}>2019-01-01</Text>
//         <Right>
//           <View style={{flex: 1, flexDirection: "row"}}>
//             <Text style={transaction.transactionOnChain} note={true}>onchain 0/6</Text>
//             <Text style={transaction.transactionTopValuePositive}>
//               + 0 00000001 ₿
//             </Text>
//           </View>
//         </Right>
//       </Row>
//       <Text note={true}>
//          From 1F1tAaz5x1HUXrCNLbtMDqcw6o5GNn4xqX
//       </Text>
//     </Body>
//   </CardItem>
// </Card>
