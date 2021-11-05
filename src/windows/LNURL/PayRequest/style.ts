import Color from "color";
import { StyleSheet } from "react-native";

import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
import { PLATFORM } from "../../../utils/constants";

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
  inputLabel: {
    marginBottom: 9,
  },
  boldText: {
    fontWeight: "bold",
  },
  iconText: {
  },
  icon: {
    fontSize: 18,
  },
  inputAmountContainer: {
    width: "100%",
    flexDirection: "row",
    marginBottom: 10,
    position: "relative",
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
  },
  inputCurrencyButton: {
    borderRadius: 10,
    position: "absolute",
    right: 5,
    top: 4,
    padding: 0,
    justifyContent: "center",
    height: 20
  },
  metadataSection: {
    marginBottom: 32,
    width: "100%",
  },
  metadataSectionCheckbox: {
    marginRight: 18,
  },
  metadataSectionCheckboxLabel: {
    flex: 1,
    fontSize: 13,
    marginTop: PLATFORM === "ios" ? 2 : 0,
  },
});
