export class VisionCamera {
  static getAvailableCameraDevices() {
    return [
      {
        position: "back",
      },
    ];
  }

  static async getCameraPermissionStatus() {
    return "granted";
  }

  static async requestCameraPermission() {
    return "granted";
  }

  async takePhoto() {
    const writePath = `simulated_camera_photo.png`;

    // const imageDataBase64 = "some_large_base_64_encoded_simulated_camera_photo";
    // await writeFile(writePath, imageDataBase64, "base64");

    return { path: writePath };
  }

  render() {
    return null;
  }
}

// useCodeScanner,
// CameraPosition,
// useCameraDevice,
// useCameraPermission,
export const useCodeScanner = () => {};

export const useCameraDevice = () => {};

export const useCameraPermission = () => ({
  hasPermission: true,
  requestPermission: () => {},
});
