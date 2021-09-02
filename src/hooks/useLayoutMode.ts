import { useWindowDimensions } from "react-native";

type LayoutMode = "mobile" | "full";

const evalutateMode = (width: number): LayoutMode => {
  return width > 1000 ? "full" : "mobile";
}

// 767

export default function useLayoutMode(): LayoutMode {
  const windowDimensions = useWindowDimensions();
  return evalutateMode(windowDimensions.width);
}
