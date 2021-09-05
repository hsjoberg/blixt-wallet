import { useWindowDimensions } from "react-native";
import { PLATFORM } from "../utils/constants";

type LayoutMode = "mobile" | "full";

const evalutateMode = (width: number): LayoutMode => {
  if (PLATFORM === "web" && WEB_DEMO) {
    return "mobile";
  }
  return width > 1000 ? "full" : "mobile";
}

// 767

export default function useLayoutMode(): LayoutMode {
  const windowDimensions = useWindowDimensions();
  return evalutateMode(windowDimensions.width);
}
