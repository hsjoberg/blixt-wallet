import React from "react";
import { Text, View, StyleSheet } from "react-native";

export default function MnemonicKeyboard() {
  return (
    <View>
      <View style={styles.row}>
        <Text style={styles.key}>q</Text>
        <Text style={styles.key}>w</Text>
        <Text style={styles.key}>e</Text>
        <Text style={styles.key}>r</Text>
        <Text style={styles.key}>t</Text>
        <Text style={styles.key}>y</Text>
        <Text style={styles.key}>u</Text>
        <Text style={styles.key}>i</Text>
        <Text style={styles.key}>o</Text>
        <Text style={styles.key}>p</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.key}>a</Text>
        <Text style={styles.key}>s</Text>
        <Text style={styles.key}>e</Text>
        <Text style={styles.key}>d</Text>
        <Text style={styles.key}>f</Text>
        <Text style={styles.key}>g</Text>
        <Text style={styles.key}>h</Text>
        <Text style={styles.key}>j</Text>
        <Text style={styles.key}>k</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.key}>z</Text>
        <Text style={styles.key}>x</Text>
        <Text style={styles.key}>c</Text>
        <Text style={styles.key}>v</Text>
        <Text style={styles.key}>b</Text>
        <Text style={styles.key}>n</Text>
        <Text style={styles.key}>m</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    display: "flex",
    flexDirection: "row",
    alignContent: "center",
    justifyContent: "center",
  },
  key: {
    color: "#1a1a1a",
    marginTop: 0,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 0,
    width: 60,
    paddingTop: 6,
    paddingRight: 5,
    paddingBottom: 6,
    paddingLeft: 5,
    height: 40,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderBottomLeftRadius: 8,
    shadowOffset: {
      width: 5,
      height: 5,
    },
    shadowRadius: 10,
    shadowColor: "lightgray",
    shadowOpacity: 1,
    borderWidth: 1,
    borderColor: "rgba(44, 62, 80, 0.5)",
    borderStyle: "solid",
  },
});
