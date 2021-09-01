import { useEffect, useState } from "react";
import { Dimensions, ScaledSize } from "react-native";

type LayoutMode = "mobile" | "full";

const evalutateMode = (width: number): LayoutMode => {
  return width > 1000 ? "full" : "mobile";
}

// 767

export default function useLayoutMode(): LayoutMode {
  const [mode, setMode] = useState<LayoutMode>(evalutateMode(Dimensions.get("screen").width));

  useEffect(() => {
    const onChange = (newDimensions: { window: ScaledSize; screen: ScaledSize }) => {
      setMode(evalutateMode(newDimensions.screen.width));
    };

    const listener = Dimensions.addEventListener("change", onChange);

    return () => Dimensions.removeEventListener("change", onChange);
  }, []);

  return mode;
}
