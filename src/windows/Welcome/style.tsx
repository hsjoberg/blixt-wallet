import { Dimensions, StyleProp, ViewStyle, TextStyle, StatusBar } from "react-native";
import { getStatusBarHeight } from "react-native-status-bar-height";
import { blixtTheme } from "../../native-base-theme/variables/commonColor";
import { PLATFORM } from "../../utils/constants";
const smallScreen = Dimensions.get("window").height < 700;

export default {
  content: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 0,
    marginTop: getStatusBarHeight(true) + (StatusBar.currentHeight ?? 0) + (PLATFORM !== "android" ? 40 : 0),
    marginLeft: 0,
    marginRight: 0,
    marginBottom: 0,
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
    marginBottom: 7,
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
  goBack: {
    paddingHorizontal: 20,
    marginLeft: -20,
    paddingVertical: 6,
    marginTop: -1 + getStatusBarHeight(true),
    top: 5,
    left: 0,
    position: "absolute",
  } as StyleProp<ViewStyle>,
};
