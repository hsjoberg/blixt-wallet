// @flow

import variable from "./../variables/commonColor";

export default (variables /*: * */ = variable) => {
  const h3Theme = {
    fontFamily: variables.titleFontfamily,
    color: variables.textColor,
    fontSize: variables.fontSizeH3,
    lineHeight: variables.lineHeightH3
  };

  return h3Theme;
};
