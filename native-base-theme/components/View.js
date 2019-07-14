// @flow

import variable from "./../variables/commonColor";

export default (variables /*: * */ = variable) => {
  const viewTheme = {
    ".padder": {
      padding: variables.contentPadding
    }
  };

  return viewTheme;
};
