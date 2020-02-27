import { Dimensions, StyleProp, ViewStyle, TextStyle } from "react-native";
import { blixtTheme } from "../../../native-base-theme/variables/commonColor";
const smallScreen = Dimensions.get("window").height < 700;

export default {
  content: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    margin: 0,
  } as StyleProp<ViewStyle>,
  upperContent: {
    flex: 1.6,
    width: "100%",
  } as StyleProp<ViewStyle>,
  lowerContent: {
    paddingRight: 19,
    paddingBottom: 24,
    paddingLeft: 19,
    paddingTop: 0,
    flex: 2,
    width: "100%",
  } as StyleProp<ViewStyle>,
  buttons: {
    flexDirection: "row",
    backgroundColor: blixtTheme.dark,
  } as StyleProp<ViewStyle>,
  button: {
    width: "100%",
  } as StyleProp<ViewStyle>,
  text: {
    flex: 1,
    marginTop: smallScreen ? 10 : 24,
    width: "100%",
  } as StyleProp<TextStyle>,
  headerView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as StyleProp<ViewStyle>,
  textHeader: {
    marginBottom: 3,
  } as StyleProp<TextStyle>,
  card: {
    flex: 1,
    margin: 0,
    padding: 0,
  } as StyleProp<ViewStyle>,
  cardItem: {
    width: "100%",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
  } as StyleProp<ViewStyle>,
  wordColumn: {
    flex: 1,
    height: "100%",
    justifyContent: "space-around",
  } as StyleProp<ViewStyle>,
};
