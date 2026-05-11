import * as base64 from "base64-js";

import { unicodeStringToUint8Array } from "./index";

export interface IWebDavCredentials {
  username?: string;
  password?: string;
}

const getAuthorizationHeader = ({ username, password }: IWebDavCredentials) => {
  if (!username && !password) {
    return undefined;
  }

  const encodedCredentials = base64.fromByteArray(
    unicodeStringToUint8Array(`${username ?? ""}:${password ?? ""}`),
  );
  return `Basic ${encodedCredentials}`;
};

const getHeaders = (credentials: IWebDavCredentials, contentType?: string) => {
  const headers: Record<string, string> = {};
  const authorization = getAuthorizationHeader(credentials);
  if (authorization) {
    headers.Authorization = authorization;
  }
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
};

export const getWebDavBackupUrl = (url: string, fileName: string) => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) {
    throw new Error("Missing WebDAV backup URL");
  }

  if (trimmedUrl.endsWith(".b64")) {
    return trimmedUrl;
  }

  return `${trimmedUrl.replace(/\/+$/, "")}/${encodeURIComponent(fileName)}`;
};

const throwOnFailedResponse = async (response: Response, action: string) => {
  if (response.ok) {
    return;
  }

  let body = "";
  try {
    body = await response.text();
  } catch {
    body = "";
  }

  throw new Error(`WebDAV ${action} failed with HTTP ${response.status}${body ? `: ${body}` : ""}`);
};

export const uploadWebDavFile = async (
  url: string,
  contents: string,
  credentials: IWebDavCredentials,
) => {
  const response = await fetch(url, {
    method: "PUT",
    headers: getHeaders(credentials, "application/base64"),
    body: contents,
  });

  await throwOnFailedResponse(response, "upload");
};

export const downloadWebDavFile = async (url: string, credentials: IWebDavCredentials) => {
  const response = await fetch(url, {
    method: "GET",
    headers: getHeaders(credentials),
  });

  await throwOnFailedResponse(response, "download");
  return await response.text();
};
