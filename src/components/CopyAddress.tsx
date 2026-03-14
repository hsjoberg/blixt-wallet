import React from "react";
import { Text, View, Icon } from "native-base";
import { StyleSheet } from "react-native";
import { smallScreen } from "../utils/device";
import { fontFactorNormalized } from "../utils/scale";

export interface ICopyAddressProps {
  onPress: () => void;
  text: string;
}
export default function CopyAddress({ text, onPress, ...props }: ICopyAddressProps) {
  return (
    <View onTouchStart={onPress} {...props} style={style.pressableView}>
      <View style={style.container}>
        <Text testID="BITCOIN_ADDRESS" style={style.text} numberOfLines={1} ellipsizeMode="middle">
          {text}
        </Text>
        <Text style={style.iconText}>
          <Icon
            type="MaterialCommunityIcons"
            name="content-copy"
            style={style.icon}
            onPress={onPress}
          />
        </Text>
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  pressableView: {
    width: "100%",
    flexDirection: "row",
    height: 35,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  container: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginRight: smallScreen ? 10 : 14,
    marginLeft: smallScreen ? 10 : 14,
  },
  text: {
    maxWidth: "85%",
    minWidth: 0,
    flexShrink: 1,
    fontSize: 15 * fontFactorNormalized,
  },
  iconText: {
    flexShrink: 0,
    width: 19,
    marginTop: 1,
    marginLeft: 4,
  },
  icon: {
    fontSize: 18 * fontFactorNormalized,
  },
});
