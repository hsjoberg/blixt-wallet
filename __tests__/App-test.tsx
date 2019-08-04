import "react-native";
import React from "react";
import App from "../src/App";

import renderer from "react-test-renderer";

import { advanceBy, advanceTo, clear } from 'jest-date-mock';
advanceTo(new Date(2019, 0, 1, 1, 0, 0))

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
