import { Thunk, Action, thunk, action } from "easy-peasy";


interface ITestModel {
  a: Thunk<ITestModel, void>;
  b: Action<ITestModel, void>;
}

export const test: ITestModel = {
  a: thunk(async (actions) => {
    actions.b();
  }),
  b: action(() => {

  }),
};
