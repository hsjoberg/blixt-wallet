import React from "react";
import { Text, View, Icon } from "native-base";
import { StyleSheet } from "react-native";
import { smallScreen } from "../utils/device";

export interface ICopyAddressProps {
  onPress: () => void;
  text: string;
}
export default function CopyAddress({ text, onPress, ...props }: ICopyAddressProps) {
  return (
    <View onTouchStart={onPress} {...props}>
      <View style={style.container}>
        <Text testID="BITCOIN_ADDRESS" style={style.text} numberOfLines={1} lineBreakMode="middle">
          {text}
        </Text>
        <Text style={style.iconText}>
          <Icon type="MaterialCommunityIcons" name="content-copy" style={style.icon} />
        </Text>
      </View>
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 6,
    marginRight: smallScreen ? -6 : 15,
    width: "100%",
  },
  text: {
  },
  iconText: {
    width: 19,
    marginLeft: 4,
  },
  icon: {
    fontSize: 18,
  }
});