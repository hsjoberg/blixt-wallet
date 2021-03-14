import { PixelRatio } from "react-native";

export const fontFactor = 1 / Math.max(PixelRatio.getFontScale() * 0.72, 1);

export const fontFactorNormalized = 1 / PixelRatio.getFontScale();
