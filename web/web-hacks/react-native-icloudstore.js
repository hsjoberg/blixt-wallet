const storage = new Map();

const iCloudStorage = {
  async setItem(key, value) {
    storage.set(String(key), String(value));
    return null;
  },

  async getItem(key) {
    return storage.get(String(key)) ?? null;
  },

  async removeItem(key) {
    storage.delete(String(key));
    return null;
  },
};

export default iCloudStorage;
