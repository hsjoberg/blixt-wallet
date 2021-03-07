// @flow

import variable, { blixtTheme } from './../variables/commonColor';

export default (variables /* : * */ = variable) => {
  const iconTheme = {
    fontSize: variables.iconFontSize,
    // color: variable.textColor,

    // BLIXT:
    color: blixtTheme.light,
  };

  return iconTheme;
};
