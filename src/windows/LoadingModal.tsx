import React from "react";
import { Spinner } from "native-base";

import { blixtTheme } from "../native-base-theme/variables/commonColor";
import Blurmodal from "../components/BlurModal";

export default function Loading() {
  return (
    <Blurmodal goBackByClickingOutside={false}>
      <Spinner color={blixtTheme.light} size={55} />
    </Blurmodal>
  );
};
