// @flow

import variable, { blixtTheme } from './../variables/commonColor';

export default (variables /* : * */ = variable) => {
  let textTheme = {
    fontSize: variables.DefaultFontSize,
    fontFamily: variables.fontFamily,
    color: variables.textColor,
    '.note': {
      color: '#a7a7a7',
      fontSize: variables.noteFontSize
    }
  };

  // BLIXT
  textTheme[".note"].color = blixtTheme.lightGray;

  return textTheme;
};
