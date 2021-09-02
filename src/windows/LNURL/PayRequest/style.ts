import Color from "color";
import { StyleSheet } from "react-native";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";

export default StyleSheet.create({
  card: {
    padding: 5,
    width: "100%",
    height: "auto",
    minHeight: "55%",
  },
  cardItem: {
    flexGrow: 1,
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
    flexGrow: 1,
    width: "100%",
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
    alignItems:"flex-end",
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
    flexGrow: 1,
    flexBasis: "auto",
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
