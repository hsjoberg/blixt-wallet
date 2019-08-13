import React, { useState } from "react";
import { StyleSheet, StatusBar, Vibration } from "react-native";
import { Container, Content, View, Text, Button, Icon } from "native-base";
import { NavigationScreenProp } from "react-navigation";
import color from "color";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

interface IProps {
  navigation: NavigationScreenProp<{}>;
}
export default ({ navigation }: IProps) => {
  const [code, setCode] = useState<number[]>([]);

  const onNumberPress = (n: number) => {
    setCode([...code, n]);
    Vibration.vibrate(32);
  };

  const onBackspacePress = () => {
    const tmp = code.slice();
    tmp.pop();
    setCode(tmp);
    Vibration.vibrate(32);
  };

  const onClearPress = () => {
    setCode([]);
    Vibration.vibrate(34);
  };

  if (code.length === 6) {
    setTimeout(() => navigation.navigate("InitLightning"), 0);
  }

  return (
    <Container>
      <StatusBar
        backgroundColor="transparent"
        hidden={false}
        translucent={true}
        networkActivityIndicatorVisible={true}
        barStyle="light-content"
      />
      <Content contentContainerStyle={style.content}>
        <View style={style.pincodeInput}>
          <Text style={style.enterPincodeText}>Enter pincode</Text>
          <Text style={style.pincodeInputText}>
            <Text style={style.pincodeInputText}>{"●".repeat(code.length)}</Text>
            <Text style={{...style.pincodeInputText, color: color(blixtTheme.lightGray).darken(0.6).hex()}}>{"●".repeat(6 - code.length)}</Text>
          </Text>
        </View>
        <View style={style.pincodeButtons}>
          <View style={style.buttonRow}>
            {[1, 2, 3].map((n) => (
              <Button key={n} onPress={() => onNumberPress(n)} style={style.pincodeButton} rounded={false}>
                <Text style={style.pincodeButtonText}>{n}</Text>
              </Button>
            ))}
          </View>
          <View style={style.buttonRow}>
            {[4, 5, 6].map((n) => (
              <Button key={n} onPress={() => onNumberPress(n)} style={style.pincodeButton}>
                <Text style={style.pincodeButtonText}>{n}</Text>
              </Button>
            ))}
          </View>
          <View style={style.buttonRow}>
            {[7, 8, 9].map((n) => (
              <Button key={n} onPress={() => onNumberPress(n)} style={style.pincodeButton}>
                <Text style={style.pincodeButtonText}>{n}</Text>
              </Button>
            ))}
          </View>
          <View style={style.buttonRow}>
            <Button onPress={onClearPress} style={[style.buttonDelete, style.pincodeButton]}>
              <Text style={style.pincodeButtonText}>
                <Icon style={style.buttonClearIcon} type="MaterialCommunityIcons" name="delete-forever" />
              </Text>
            </Button>
            <Button onPress={() => onNumberPress(0)} style={style.pincodeButton} rounded={false}>
              <Text style={style.pincodeButtonText}>0</Text>
            </Button>
            <Button onPress={onBackspacePress} style={[style.pincodeButton, style.buttonBackspace]}>
              <Text style={style.pincodeButtonText}>
                <Icon style={style.buttonBackspaceIcon} type="FontAwesome5" name="backspace" />
              </Text>
            </Button>
          </View>
        </View>
      </Content>
    </Container>
  )
}

const style = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: "center",
  },
  pincodeInput: {
    flex: 1,
    justifyContent: "flex-end",
  },
  enterPincodeText: {
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  pincodeInputText: {
    textAlign: "center",
    backgroundColor: blixtTheme.gray,
    fontSize: 44,
    lineHeight: 54,
    marginBottom: 40,
  },
  pincodeButtons: {
    flex: 1.25,
    justifyContent: "center",
    paddingTop: 64,
    paddingRight: 64,
    paddingBottom: 32,
    paddingLeft: 64,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  pincodeButton: {
    margin: 10,
    width: 72,
    height: 72,
    justifyContent: "center",
    borderRadius: 12,
  },
  pincodeButtonText: {
    fontSize: 32,
    lineHeight: 42,
  },
  buttonBackspace: {
    elevation: null,
    shadowColor: undefined,
    shadowOffset: undefined,
    shadowOpacity: undefined,
    shadowRadius: undefined,
    backgroundColor: "transparent",
  },
  buttonDelete: {
    elevation: null,
    shadowColor: undefined,
    shadowOffset: undefined,
    shadowOpacity: undefined,
    shadowRadius: undefined,
    backgroundColor: "transparent",
  },
  buttonBackspaceIcon: {
    color: blixtTheme.light,
    fontSize: 23,
  },
  buttonClearIcon: {
    color: blixtTheme.light,
    fontSize: 34,
  },
});
