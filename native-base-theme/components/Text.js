// @flow

import variable from "./../variables/commonColor";
import { blixtTheme } from "./../variables/commonColor";

export default (variables /*: * */ = variable) => {
  const textTheme = {
    fontSize: variables.DefaultFontSize,
    fontFamily: variables.fontFamily,
    color: variables.textColor,
    ".note": {
      color: blixtTheme.lightGray,
      fontSize: variables.noteFontSize
    }
  };

  return textTheme;
};
