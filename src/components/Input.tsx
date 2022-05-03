import React from "react";
import { Input } from "native-base";

export default function BlixtInput(props: any) {
  return (
    <Input
      enableFocusRing={false} // macOS prop
      {...props}
    />
  );
}
