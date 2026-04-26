export const RnTor = {
  async startTorIfNotRunning() {
    return {
      is_success: false,
      error_message: "Tor is not available on web",
      control: "",
    };
  },
};

export default {
  RnTor,
};
