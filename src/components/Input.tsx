import React from "react";
import { Input, NativeBase } from "native-base";

export default function BlixtInput(props: NativeBase.Input) {
  return (
    <Input
      enableFocusRing={false} // macOS prop
      {...props}
    />
  );
}
