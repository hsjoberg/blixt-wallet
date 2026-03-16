import { cpSync, existsSync, mkdirSync } from "node:fs";
import { platform } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const NAPI_ADDON_FILENAME = "turbolnd_electrobun_napi.node";
const requireFromElectrobun = createRequire(import.meta.url);
const currentPlatform = platform();

function getLndLibraryFilename(): string {
  switch (currentPlatform) {
    case "win32":
      return "liblnd.dll";
    case "linux":
      return "liblnd.so";
    case "darwin":
      return "liblnd.dylib";
    default:
      throw new Error(`Unsupported platform for liblnd packaging: ${currentPlatform}`);
  }
}

function getNapiPlatformArchDir(): string {
  const arch = process.arch;
  if (
    (currentPlatform !== "win32" && currentPlatform !== "darwin" && currentPlatform !== "linux") ||
    (arch !== "x64" && arch !== "arm64")
  ) {
    throw new Error(
      `Unsupported platform/arch for Electrobun N-API addon: ${currentPlatform}-${arch}`,
    );
  }

  return `${currentPlatform}-${arch}`;
}

function stageNapiAddon() {
  const turboLndPackageJsonPath = requireFromElectrobun.resolve(
    "react-native-turbo-lnd/package.json",
  );
  const turboLndPackageRoot = dirname(turboLndPackageJsonPath);
  const addonPath = join(
    turboLndPackageRoot,
    "native",
    "electrobun-napi",
    getNapiPlatformArchDir(),
    NAPI_ADDON_FILENAME,
  );

  if (!existsSync(addonPath)) {
    throw new Error(
      [
        `Unable to find packaged Electrobun N-API addon: ${addonPath}`,
        "Build/sync the prebuilt in react-native-turbo-lnd first.",
      ].join("\n"),
    );
  }

  mkdirSync(resolve("vendor"), { recursive: true });
  cpSync(addonPath, resolve("vendor", NAPI_ADDON_FILENAME), { dereference: true });
}

stageNapiAddon();

const lndLibraryFilename = getLndLibraryFilename();
const repoLndLibraryPath = resolve("..", lndLibraryFilename);
const localLndLibraryPath = resolve("vendor", lndLibraryFilename);
if (existsSync(repoLndLibraryPath)) {
	mkdirSync(resolve("vendor"), { recursive: true });
	cpSync(repoLndLibraryPath, localLndLibraryPath, { dereference: true });
}

if (currentPlatform !== "win32") {
	process.exit(0);
}

const buildDirEnv = process.env.ELECTROBUN_BUILD_DIR;
if (!buildDirEnv) {
	process.exit(0);
}

const buildDir = resolve(buildDirEnv);
const normalizedBuildDir = buildDir.replace(/\//g, "\\").toLowerCase();
const escapedBuildDir = normalizedBuildDir.replace(/'/g, "''");

// In dev --watch mode on Windows, launcher children can outlive the parent briefly.
// That leaves open handles in buildFolder and Electrobun's recursive rmdir throws EPERM.
const killByBuildDirScript = `
$ErrorActionPreference = 'SilentlyContinue'
$buildDir = '${escapedBuildDir}'
$targets = @()

try {
	$targets += Get-Process | Where-Object {
		try {
			$path = $_.Path
			$path -and $path.ToLower().StartsWith($buildDir)
		} catch {
			$false
		}
	}
} catch {}

$targets = $targets | Sort-Object -Property Id -Unique
foreach ($proc in $targets) {
	try {
		Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
	} catch {}
}
`;

spawnSync(
  "powershell",
  ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", killByBuildDirScript],
  { stdio: "ignore" },
);

if (existsSync(buildDir)) {
  // Clear read-only attributes just in case copied files carry them.
  spawnSync("attrib", ["-R", `${buildDir}\\*`, "/S", "/D"], { stdio: "ignore" });
}

await Bun.sleep(350);
