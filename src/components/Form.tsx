import React, { ReactNode } from "react";
import { StyleSheet, KeyboardAvoidingView, StyleProp, ViewStyle, StatusBar } from "react-native";
import { Content, View, Item, Text, Label } from "native-base";

const iconTopPadding = StatusBar.currentHeight ?? 0;

export interface IFormItem {
  title: string | null;
  component: ReactNode;
  key: string | number;
  success?: boolean;
  active?: boolean;
}

export interface IFormProps {
  buttons: ReactNode[];
  items: IFormItem[];
  style?: StyleProp<ViewStyle>;
}
export default function Form({ buttons, items, style }: IFormProps) {
  return (
    <View style={[styles.content, style]}>
      <View style={styles.itemContainer}>
        {items.map(({ key, title, component, success, active }, i) => (
          active ?? true
            ?
            <Item key={key} style={{
              marginTop: i > 0 ? 16 : 8
            }} success={success}>
              <Label style={{
                ...styles.itemLabel,
                fontSize: (title !== null && title.length) >= 14 ? 15 : 17,
              }}>{title}</Label>
              {component}
            </Item>
            :
            null
        ))}
      </View>
      <View style={styles.buttonContainer}>
        {buttons.map((button, i) => {
          return (<View key={i} style={{ marginTop: i > 0 ? 12 : 0 }}>{button}</View>);
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    height: "100%",
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
    padding: 16,
  },
  itemContainer: {
  },
  itemLabel: {
    width: 105,
  },
  buttonContainer: {
    marginBottom: 2,
  },
});
