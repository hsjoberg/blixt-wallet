const crypto = require("crypto");
const path = require("path");
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

function createDeterministicModuleIdFactory(projectRoot) {
  const fileToIdMap = new Map();
  const usedIds = new Set();

  return (modulePath) => {
    const cachedId = fileToIdMap.get(modulePath);
    if (cachedId != null) {
      return cachedId;
    }

    const relativePath = path
      .relative(projectRoot, modulePath)
      .split(path.sep)
      .join("/");

    let salt = 0;
    let id;
    do {
      const hash = crypto
        .createHash("sha1")
        .update(`${relativePath}:${salt}`)
        .digest("hex");
      id = Number.parseInt(hash.slice(0, 8), 16) & 0x7fffffff;
      salt += 1;
    } while (usedIds.has(id));

    fileToIdMap.set(modulePath, id);
    usedIds.add(id);
    return id;
  };
}

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    unstable_enablePackageExports: true,
  },
  serializer: {
    createModuleIdFactory: () => createDeterministicModuleIdFactory(__dirname),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
