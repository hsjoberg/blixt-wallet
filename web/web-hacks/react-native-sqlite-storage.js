export default {
  enablePromise: (enable) => {},
  DEBUG: (enable) => {},
  openDatabase: () => {
    return {
      executeSql: () => [],
      // transaction: (...args2) => {
      //   executeSql: (query) => []
      // }
    };
  },
};

const mockSQLite = {
  openDatabase: (...args) => {
    return {
      transaction: (...args) => {
        executeSql: (query) => { return []; }
      }
    };
  }
}
