let string = "";

export default {
  setString: (str: string) => {
    string = str;
  },

  getString: async () => {
    return string;
  }
}
