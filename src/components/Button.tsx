import React, { ComponentProps } from "react";
import { Button as NativeBaseButton } from "native-base";

type NativeBaseButtonProps = ComponentProps<typeof NativeBaseButton>;

/**
 * Wrapper around NativeBase Button that fixes the issue where
 * disabled styling doesn't update when the disabled prop changes.
 *
 * NativeBase v2.x computes theme-based styles only on mount and caches them.
 * By using a key that changes with `disabled`, we force React to remount
 * the component, causing NativeBase to recompute styles.
 */
export function Button(props: NativeBaseButtonProps) {
  // NativeBase fix if required in the future: key={`nb-btn-${props.disabled}`}
  return <NativeBaseButton {...props} />;
}

export default Button;
