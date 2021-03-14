import { PixelRatio } from "react-native";

export const zoomed = PixelRatio.getFontScale() >= 1.2;

export const fontFactor = 1 / Math.max(PixelRatio.getFontScale() * 0.77, 1);

export const fontFactorSubtle = 1 / Math.max(PixelRatio.getFontScale() * 0.88, 1);

export const fontFactorNormalized = 1 / PixelRatio.getFontScale();
