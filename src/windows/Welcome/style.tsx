import { Dimensions, StyleProp, ViewStyle, TextStyle } from "react-native";
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
    flex: 2.15,
    width: "100%",
  } as StyleProp<ViewStyle>,
  lowerContent: {
    paddingRight: 24,
    paddingBottom: 24,
    paddingLeft: 24,
    paddingTop: 0,
    flex: 2,
    width: "100%",
  } as StyleProp<ViewStyle>,
  buttons: {
    width: "100%",
    flexDirection: "row",
  } as StyleProp<ViewStyle>,
  button: {
    width: "100%",
  } as StyleProp<ViewStyle>,
  text: {
    flex: 1,
    marginTop: smallScreen ? 10 : 24,
    width: "100%",
  } as StyleProp<TextStyle>,
  textHeader: {
    marginBottom: 3,
  },
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