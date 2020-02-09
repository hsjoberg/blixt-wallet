import React from "react";
import { NavigationContainerRef } from "@react-navigation/native";

export const navigator = React.createRef<NavigationContainerRef>();

export function getNavigator(): NavigationContainerRef | null {
  return navigator.current || null;
}

export function navigate(routeName: string, params?: any) {
  if (!navigator.current) {
    console.warn("Warning: navigate() called without navigator properly set up");
    return;
  }

  navigator.current.navigate(routeName, params);
}
