import lightning, { ILightningModel } from "./Lightning";

export interface IStoreModel {
  lightning: ILightningModel;
}

const model: IStoreModel = {
  lightning,
};

export default model;
