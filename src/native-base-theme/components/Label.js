// @flow

import variable from './../variables/commonColor';

export default (variables /* : * */ = variable) => {
  const labelTheme = {
    '.focused': {
      width: 0
    },
    fontSize: 17,

    // Blixt
    fontFamily: variables.fontFamily,
  };

  return labelTheme;
};
