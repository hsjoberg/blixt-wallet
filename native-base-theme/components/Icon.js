// @flow

import variable from "./../variables/commonColor";
import { blixtTheme } from "./../variables/commonColor";

export default (variables /*: * */ = variable) => {
  const iconTheme = {
    fontSize: variables.iconFontSize,
    color: blixtTheme.light // "#000"
  };

  return iconTheme;
};
