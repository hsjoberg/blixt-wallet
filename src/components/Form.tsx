import React, { ReactNode } from "react";
import { StyleSheet, KeyboardAvoidingView, StyleProp, ViewStyle, InputAccessoryView } from "react-native";
import { View, Item, Text, Label, Icon } from "native-base";
import { blixtTheme } from "../native-base-theme/variables/commonColor";
import { MathPad, IMathPadProps } from "../components/MathPad";
import { MATH_PAD_NATIVE_ID, PLATFORM } from "../utils/constants";

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
  noticeText?: string;
  mathPadVisible?: boolean;
  mathPadProps?: IMathPadProps;
}
export default function Form({ buttons, items, style, noticeText, mathPadProps }: IFormProps) {
  return (
    <KeyboardAvoidingView style={[styles.content, style]}>
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
        {noticeText &&
          <View style={styles.notice}>
            <Icon style={styles.noticeIcon} type="AntDesign" name="exclamationcircleo" />
            <Text style={styles.noticeText}>{noticeText}</Text>
          </View>
        }
      </View>
      <View style={styles.buttonContainer}>
        <>
          {buttons.map((button, i) => {
            return (<View key={i} style={{ marginTop: i > 0 ? 6 : 0, padding: 16, }}>{button}</View>);
          })}
          {PLATFORM === "android" && mathPadProps &&
            <MathPad
              {...mathPadProps}
            />
          }
        </>
      </View>
      {PLATFORM === "ios" &&
        <InputAccessoryView nativeID={MATH_PAD_NATIVE_ID}>
          <MathPad {...mathPadProps} />
        </InputAccessoryView>
      }
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: {
    height: "100%",
    flex: 1,
    display: "flex",
    justifyContent: "space-between",
  },
  itemContainer: {
    padding: 16,
  },
  itemLabel: {
    width: 105,
  },
  buttonContainer: {
    marginHorizontal: 2,
    marginBottom: 10,
  },
  error: {
    marginTop: 22,
    marginLeft: 3,
  },
  errorText: {
    color: blixtTheme.red
  },
  notice: {
    marginTop: 24,
    marginLeft: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeIcon: {
    marginRight: 18,
    color: blixtTheme.light,
  },
  noticeText: {
    fontSize: 14,
    color: blixtTheme.lightGray,
    marginRight: 60,
    justifyContent: "center",
    lineHeight: 20
  },
});
