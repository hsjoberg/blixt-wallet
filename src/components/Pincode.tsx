import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, Vibration } from "react-native";
import { View, Text, Icon } from "native-base";
import { Button } from "./Button";
import color from "color";
import * as Animatable from "react-native-animatable";
import Container from "../components/Container";

let ReactNativeHapticFeedback;
if (PLATFORM === "android" || PLATFORM === "ios") {
  ReactNativeHapticFeedback = require("react-native-haptic-feedback");
}

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { smallScreen } from "../utils/device";
import { PLATFORM } from "../utils/constants";

const hapticFeedbackOptions: HapticOptions = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

export interface IPincode {
  textAction: string;
  onTryCode: (code: string) => Promise<boolean>;
}
export default function Pincode({ onTryCode, textAction }: IPincode) {
  const pincodeText = useRef<Animatable.View>();
  const [code, setCode] = useState<number[]>([]);

  const onNumberPress = (n: number) => {
    setCode((code) => {
      if (code.length < 6) {
        return [...code, n];
      }
      return code;
    });

    if (PLATFORM === "android") {
      Vibration.vibrate(32);
    } else if (PLATFORM === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight", hapticFeedbackOptions);
    }
  };

  const onBackspacePress = () => {
    setCode((c) => {
      const tmp = c.slice(0);
      tmp.pop();
      return tmp;
    });
    if (PLATFORM === "android") {
      Vibration.vibrate(32);
    } else if (PLATFORM === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight", hapticFeedbackOptions);
    }
  };

  const onClearPress = () => {
    setCode([]);
    if (PLATFORM === "android") {
      Vibration.vibrate(35);
    } else if (PLATFORM === "ios") {
      ReactNativeHapticFeedback.trigger("impactLight", hapticFeedbackOptions);
    }
  };

  useEffect(() => {
    if (code.length === 6) {
      (async () => {
        if (!(await onTryCode(code.join("")))) {
          setTimeout(() => pincodeText!.current!.shake!(950), 1);
          if (PLATFORM === "android") {
            Vibration.vibrate(300);
          } else if (PLATFORM === "ios") {
            Vibration.vibrate(300);
          }
        }
        setCode([]);
      })();
    }
  }, [code]);

  const pincodeInput = "⬤".repeat(code.length);
  const pincodeInputPlaceholder = "⬤".repeat(6 - code.length);

  return (
    <Container>
      <View style={style.pincodeInput}>
        <Text style={style.enterPincodeText}>{textAction}</Text>
        <View style={style.pincodeInputContainer}>
          <Animatable.Text style={style.pincodeInputText} ref={pincodeText as any}>
            <Text style={style.pincodeInputText}>{pincodeInput}</Text>
            <Text style={[style.pincodeInputText, style.pincodeInputPlaceholderText]}>
              {pincodeInputPlaceholder}
            </Text>
          </Animatable.Text>
        </View>
      </View>
      <View style={style.pincodeButtons}>
        <View style={style.buttonRow}>
          {[1, 2, 3].map((n) => (
            <Button
              key={n}
              onPress={() => onNumberPress(n)}
              style={style.pincodeButton}
              rounded={false}
            >
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
              <Icon
                style={style.buttonClearIcon}
                type="MaterialCommunityIcons"
                name="delete-forever"
              />
            </Text>
          </Button>
          <Button onPress={() => onNumberPress(0)} style={style.pincodeButton} rounded={false}>
            <Text style={style.pincodeButtonText}>0</Text>
          </Button>
          <Button onPress={onBackspacePress} style={[style.pincodeButton, style.buttonBackspace]}>
            <Text style={style.pincodeButtonText}>
              {PLATFORM === "macos" && (
                <Icon style={style.buttonBackspaceIcon} type="Entypo" name="erase" />
              )}
              {PLATFORM !== "macos" && (
                <Icon style={style.buttonBackspaceIcon} type="FontAwesome5" name="backspace" />
              )}
            </Text>
          </Button>
        </View>
      </View>
    </Container>
  );
}

const style = StyleSheet.create({
  pincodeInput: {
    flex: 1,
    justifyContent: "flex-end",
  },
  enterPincodeText: {
    textAlign: "center",
    marginBottom: 8,
    textTransform: "uppercase",
    backgroundColor: blixtTheme.dark, // Bug: Text disappears without this
  },
  pincodeInputContainer: {
    backgroundColor: blixtTheme.gray,
    paddingVertical: 3,
  },
  pincodeInputText: {
    textAlign: "center",
    fontSize: PLATFORM === "android" ? 35 : 24,
    lineHeight: 44,
    letterSpacing: 4,
  },
  pincodeInputPlaceholderText: {
    color: color(blixtTheme.lightGray).darken(0.6).hex(),
  },
  pincodeButtons: {
    flex: smallScreen ? 1.6 : 1.2,
    justifyContent: "center",
    paddingTop: smallScreen ? 32 : 64,
    paddingRight: smallScreen ? 32 : 64,
    paddingBottom: smallScreen ? 8 : 16,
    paddingLeft: smallScreen ? 32 : 64,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  pincodeButton: {
    margin: 10,
    width: smallScreen ? 62 : 72,
    height: smallScreen ? 62 : 72,
    justifyContent: "center",
    borderRadius: 12,
  },
  pincodeButtonText: {
    fontSize: smallScreen ? 24 : 32,
    lineHeight: smallScreen ? 34 : 42,
  },
  buttonBackspace: {
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    backgroundColor: "transparent",
  },
  buttonDelete: {
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
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
