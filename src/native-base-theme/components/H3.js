// @flow

import variable from './../variables/commonColor';

export default (variables /* : * */ = variable) => {
  const h3Theme = {
    color: variables.textColor,
    fontSize: variables.fontSizeH3,
    lineHeight: variables.lineHeightH3,

    // BLIXT
    fontFamily: variables.titleFontfamily, // TODO: fix upstream, H1,H2,H3 weren't affected at all of font changes, had to add this property myself
  };

  return h3Theme;
};
