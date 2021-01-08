// https://github.com/react-native-clipboard/clipboard/pull/59
export const Clipboard = {
  getString() {
    return navigator.clipboard.readText();
  },

  setString(content) {
    navigator.clipboard.writeText(content);
  },
};

export default Clipboard;