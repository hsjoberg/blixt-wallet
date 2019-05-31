import "react-native";
import React from "react";
import App from "../src/App";

import renderer from "react-test-renderer";

jest.mock("react-native-camera", () => {
  return require("../mocks/react-native-camera");
});

jest.mock("@react-native-community/async-storage", () => {
  return require("../mocks/@react-native-community/async-storage");
});


it("renders correctly", () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toMatchSnapshot();
});
