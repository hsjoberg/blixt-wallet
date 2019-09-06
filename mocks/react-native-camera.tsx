// https://stackoverflow.com/a/41818992
/*import React from "react";

const constants = {
  Aspect: {},
  BarCodeType: {},
  Type: {},
  CaptureMode: {},
  CaptureTarget: {},
  CaptureQuality: {},
  Orientation: {},
  FlashMode: {},
  TorchMode: {},
};

class Camera extends React.Component {
  public static constants = constants;

  public render() {
    return null;
  }
}

Camera.constants = constants;

export default Camera;
*/

import React from "react";

const timeout = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const Constants = {
  BarCode: {},
  CameraType: {},

  Aspect: {},
  BarCodeType: {},
  Type: { back: "back", front: "front" },
  CaptureMode: {},
  CaptureTarget: {},
  CaptureQuality: {},
  Orientation: {},
  FlashMode: {},
  TorchMode: {},
};

export class RNCamera extends React.Component {
  public static Constants = {
    BarCode: {},
    CameraType: {},

    Aspect: {},
    BarCodeType: {},
    Type: { back: "back", front: "front" },
    CaptureMode: {},
    CaptureTarget: {},
    CaptureQuality: {},
    Orientation: {},
    FlashMode: {},
    TorchMode: {},
  };

  public takePictureAsync = async () => {
    await timeout(2000);
    return {
      base64: "base64string",
    };
  }

  public render() {
    if (!this.props.children) {
      return (<></>);
    }
    return (
      this.props.children({
        status: "AUTHORIZED",
      })
    );
  }
}

export default RNCamera;

//export const {BarCode, CameraType} = Constants;
