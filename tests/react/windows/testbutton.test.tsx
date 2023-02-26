import React from "react";
import { TouchableOpacity, Button } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";

it("test", async () => {
  const { findByTestId } = render(
    <TouchableOpacity testID="button" onPress={() => console.log("TEST")} />,
  );
  const button = await findByTestId("button");
  fireEvent.press(button);
});
