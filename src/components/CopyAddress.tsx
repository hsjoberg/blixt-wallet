import React from "react";
import { Text, View, Icon } from "native-base";
import { StyleSheet } from "react-native";

export interface ICopyAddressProps {
  onPress: () => void;
  text: string;
}
export default ({ text, onPress, ...props }: ICopyAddressProps) => (
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
)

const style = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 10,
    marginRight: 15,

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