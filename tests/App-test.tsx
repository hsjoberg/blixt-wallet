import "react-native";
import React from "react";
import App from "../src/App";

import renderer from "react-test-renderer";

import { advanceBy, advanceTo, clear } from "jest-date-mock";
advanceTo(new Date(2019, 0, 1, 1, 0, 0));

it("renders correctly", () => {
  const tree = renderer.create(<App />).toJSON();
  expect(tree).toMatchSnapshot();
});
