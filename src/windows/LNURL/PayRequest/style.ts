import Color from "color";
import { StyleSheet } from "react-native";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

export default StyleSheet.create({
  keyboardContainer: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
  card: {
    padding: 5,
    width: "100%",
    minHeight: "60%",
    flexDirection: "row",
  },
  cardItem: {
    flex: 1,
  },
  headerContainer: {
    display: "flex",
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems:"center",
    width: "100%"
  },
  header: {
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  contactContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  lightningAddress: {
    fontSize: 13,
  },
  contactAddIcon: {
    fontSize: 25,
    paddingLeft: 8,
  },
  actionBar: {
    width: "100%",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flexDirection: "row-reverse",
  },
  text: {
    marginBottom: 14,
  },
  boldText: {
    fontWeight: "bold",
  },
  iconText: {
  },
  icon: {
    fontSize: 18,
  },
  input: {
    height: 28,
    fontSize: 13,
    backgroundColor: Color(blixtTheme.gray).lighten(0.28).hex(),
    borderRadius: 32,
    paddingTop: 5,
    paddingBottom: 5,
    paddingLeft: 12,
    paddingRight: 8,
  }
});
