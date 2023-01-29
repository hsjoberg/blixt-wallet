import React from "react";
import { Text, View, StyleSheet } from "react-native";

export default function MnemonicKeyboard(props: {
  seedText: string,
  setSeedText: React.Dispatch<React.SetStateAction<string>>,
}) {
  return (
    <View>
      <View style={styles.row}>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}q`)}
        >
          q
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}w`)}
        >
          w
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}e`)}
        >
          e
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}r`)}
        >
          r
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}t`)}
        >
          t
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}y`)}
        >
          y
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}u`)}
        >
          u
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}i`)}
        >
          i
        </Text>
        <Text
          style={styles.backspace}
          onPress={() =>
            props.setSeedText(
              props.seedText.substring(0, props.seedText.length - 1)
            )
          }
        >
          backspace
        </Text>
      </View>
      <View style={styles.row}>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}o`)}
        >
          o
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}p`)}
        >
          p
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}e`)}
        >
          e
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}d`)}
        >
          d
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}f`)}
        >
          f
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}g`)}
        >
          g
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}h`)}
        >
          h
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}j`)}
        >
          j
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}k`)}
        >
          k
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}z`)}
        >
          z
        </Text>
      </View>
      <View style={styles.row}>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}x`)}
        >
          x
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}c`)}
        >
          c
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}v`)}
        >
          v
        </Text>
        <Text
          style={styles.space}
          onPress={() => props.setSeedText(`${props.seedText} `)}
        >
          &nbsp;
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}b`)}
        >
          b
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}n`)}
        >
          n
        </Text>
        <Text
          style={styles.key}
          onPress={() => props.setSeedText(`${props.seedText}m`)}
        >
          m
        </Text>
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
  space: {
    color: "#1a1a1a",
    marginTop: 0,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 0,
    width: 385,
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
  backspace: {
    color: "#1a1a1a",
    marginTop: 0,
    marginRight: 5,
    marginBottom: 5,
    marginLeft: 0,
    width: 120,
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
