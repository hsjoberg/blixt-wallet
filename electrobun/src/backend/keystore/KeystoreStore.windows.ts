import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { BlixtWindowsKeystorePath } from "../BlixtPaths";
import type { KeystoreStore } from "./KeystoreStore";
import { normalizeStore } from "./shared";

const encodePowerShellCommand = (script: string) => {
  return Buffer.from(script, "utf16le").toString("base64");
};

const runPowerShell = (script: string, input: string) => {
  const args = [
    "-NoProfile",
    "-NonInteractive",
    "-EncodedCommand",
    encodePowerShellCommand(script),
  ];

  for (const executable of ["pwsh", "powershell"]) {
    const result = spawnSync(executable, args, {
      encoding: "utf8",
      input,
    });

    if (result.error) {
      const error = result.error as NodeJS.ErrnoException;
      if (error.code === "ENOENT") {
        continue;
      }
      throw error;
    }

    if (result.status !== 0) {
      const stderr = result.stderr.trim();
      const stdout = result.stdout.trim();
      throw new Error(stderr || stdout || "PowerShell command failed.");
    }

    return result.stdout.trim();
  }

  throw new Error("Neither 'pwsh' nor 'powershell' is available for Windows keystore access.");
};

const dpapiEncrypt = (plaintext: string) => {
  const script = `
$ErrorActionPreference = 'Stop'
$plainBase64 = [Console]::In.ReadToEnd()
$plainBytes = [Convert]::FromBase64String($plainBase64)
$protectedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
  $plainBytes,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[Console]::Out.Write([Convert]::ToBase64String($protectedBytes))
`;

  return runPowerShell(script, Buffer.from(plaintext, "utf8").toString("base64"));
};

const dpapiDecrypt = (ciphertextBase64: string) => {
  const script = `
$ErrorActionPreference = 'Stop'
$cipherBase64 = [Console]::In.ReadToEnd()
$cipherBytes = [Convert]::FromBase64String($cipherBase64)
$plainBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
  $cipherBytes,
  $null,
  [System.Security.Cryptography.DataProtectionScope]::CurrentUser
)
[Console]::Out.Write([Convert]::ToBase64String($plainBytes))
`;

  const plaintextBase64 = runPowerShell(script, ciphertextBase64);
  return Buffer.from(plaintextBase64, "base64").toString("utf8");
};

export const createWindowsKeystoreStore = (): KeystoreStore => {
  return {
    path: BlixtWindowsKeystorePath,

    load() {
      if (!existsSync(BlixtWindowsKeystorePath)) {
        return {};
      }

      const ciphertextBase64 = readFileSync(BlixtWindowsKeystorePath, "utf8").trim();
      if (ciphertextBase64.length === 0) {
        throw new Error(`Windows keystore file is empty: ${BlixtWindowsKeystorePath}`);
      }

      try {
        const parsed = JSON.parse(dpapiDecrypt(ciphertextBase64));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Windows keystore payload must be a JSON object.");
        }

        return normalizeStore(parsed as Record<string, unknown>);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to load Windows keystore from ${BlixtWindowsKeystorePath}: ${message}`,
        );
      }
    },

    persist(nextStore) {
      writeFileSync(BlixtWindowsKeystorePath, dpapiEncrypt(JSON.stringify(nextStore)), "utf8");
    },
  };
};
