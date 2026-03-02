const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const turboLndRoot = path.join(repoRoot, "node_modules", "react-native-turbo-lnd");
const turboLndPackagePath = path.join(turboLndRoot, "package.json");
const turboLndFetchPath = path.join(turboLndRoot, "fetch-lnd.js");
const markerPath = path.join(repoRoot, ".react-native-turbo-lnd-version");

try {
  if (!fs.existsSync(turboLndPackagePath) || !fs.existsSync(turboLndFetchPath)) {
    console.warn(
      "[postinstall] react-native-turbo-lnd is not available yet; skipping LND binary fetch.",
    );
    process.exit(0);
  }

  const { version: installedVersion } = JSON.parse(fs.readFileSync(turboLndPackagePath, "utf8"));
  if (!installedVersion) {
    console.warn(
      "[postinstall] Unable to read react-native-turbo-lnd version; skipping LND binary fetch.",
    );
    process.exit(0);
  }

  const markerVersion = fs.existsSync(markerPath) ? fs.readFileSync(markerPath, "utf8").trim() : "";
  if (markerVersion === installedVersion) {
    console.log(
      `[postinstall] LND binaries already prepared for react-native-turbo-lnd@${installedVersion}.`,
    );
    process.exit(0);
  }

  console.log(
    `[postinstall] Fetching LND binaries (react-native-turbo-lnd ${markerVersion || "none"} -> ${installedVersion}).`,
  );
  const result = spawnSync(process.execPath, [turboLndFetchPath], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`react-native-turbo-lnd fetch script failed with exit code ${result.status}`);
  }

  fs.writeFileSync(markerPath, installedVersion, "utf8");
  console.log(`[postinstall] Saved LND marker for react-native-turbo-lnd@${installedVersion}.`);
} catch (error) {
  console.error(`[postinstall] ${error.message}`);
  process.exit(1);
}
