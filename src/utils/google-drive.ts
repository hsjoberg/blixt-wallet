// Functions for talking to the Google Drive API
// NOT a generic API as it assumes you want to access
// appDataFolder and want to upload and download a text file.

export const GDRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files";
export const GDRIVE_UPLOAD_FILES_URL = "https://www.googleapis.com/upload/drive/v3/files";

export interface IGoogleDriveFile {
  mimeType: string;
  kind:string;
  id: string;
  name: string;
}

export interface IGoogleDriveAPIGetFiles {
  incompleteSearch: boolean;
  files: IGoogleDriveFile[];
}

export type IGoogleDriveAPIDeleteFile = "";

export interface IGoogleDriveAPIError {
  error: {
    code: number;
    message: string;
    errors: {
      locationType: string;
      domain: string;
      message: string;
      reason: string;
      location: string;
    }[];
  };
}

export interface GoogleDriveUploadFileMetaData {
  name: string;
  description?: string;
  mimeType?: string;
  parents?: string[];
}

/**
 * Get metadata for files
 * Assumes the files' parent is `appDataFolder`.
 *
 * Function can be used to get
 * actual FileId of files.
 *
 * @param bearer Google Drive Access Token
 * @param search Name of the file
 *
 * @returns IGoogleDriveFile[] Array of matching files
 */
export const getFiles = async (bearer: string, search?: string[]): Promise<IGoogleDriveAPIGetFiles | IGoogleDriveAPIError> => {
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${bearer}`);

  const url = new URL(GDRIVE_FILES_URL);
  url.searchParams.append("spaces", "appDataFolder");
  if (search && search.length > 0) {
    url.searchParams.append("q", `name = "${search.join(",")}"`);
  }
  url.searchParams.append("fields", "kind,incompleteSearch,files/kind,files/id,files/name,files/mimeType,files/createdTime,files/modifiedTime");

  const getFilesResult = await fetch(url.toString(), { headers });
  if (!expectContentType(getFilesResult, "application/json")) {
    throw new Error(
      `Unexpected response Content-type (${getFilesResult.headers.get("Content-type")}) from getFiles.\n` +
      `Data: ${await getFilesResult.text()}`
    );
  }
  const filesJSON = await getFilesResult.json();
  return getFilesResult.ok
    ? filesJSON as IGoogleDriveAPIGetFiles
    : filesJSON as IGoogleDriveAPIError;
};

/**
 * Downloads a file as a text string.
 *
 * @param bearer Google Drive Access Token
 * @param fileId
 */
export const downloadFileAsString = async (bearer: string, fileId: string): Promise<string | IGoogleDriveAPIError> => {
  const headers = new Headers();
  headers.append("Authorization", `Bearer ${bearer}`);

  const url = new URL(`${GDRIVE_FILES_URL}/${fileId}`);
  url.searchParams.append("alt", "media");

  const result = await fetch(url.toString(), { headers });
  if (result.ok) {
    return result.text();
  }

  if (!expectContentType(result, "application/json")) {
    throw new Error(
      `Unexpected response Content-type (${result.headers.get("Content-type")}) from downloadFileAsString.\n` +
      `Data: ${await result.text()}`
    );
  }
  return result.json() as unknown as IGoogleDriveAPIError;
};

/**
 * Uploads a file as a text string.
 *
 * If `fileId` is not provided,
 * a new file would be created,
 * otherwise the existing file will
 * be replaced.
 *
 * @param bearer Google Drive Access Token
 * @param metaData Metadata associated with the file
 * @param data text-based data
 * @param fileId Google Drive File to replace, leave blank if new file
 */
export const uploadFileAsString = async (bearer: string, metaData: GoogleDriveUploadFileMetaData, data: string, fileId?: string): Promise<IGoogleDriveFile | IGoogleDriveAPIError> => {
  // Provide the path to the file  if this is
  // the first time the file is uploaded
  if (!fileId) {
    metaData.parents = ["appDataFolder"];
  }

  const multipartBoundary = "blixt_googledrive_upload";
  const multipartBody = `\r\n--${multipartBoundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`
  + `${JSON.stringify(metaData)}\r\n`
  + `--${multipartBoundary}\r\nContent-Type: text/plain\r\n\r\n`
  + `${data}\r\n`
  + `--${multipartBoundary}--`;

  const headers = new Headers();
  headers.append('Authorization', `Bearer ${bearer}`);
  headers.append('Content-Type', `multipart/related; boundary=${multipartBoundary}`);
  headers.append('Content-Length', `${multipartBody.length}`);

  const result = await fetch(
    `${GDRIVE_UPLOAD_FILES_URL}${fileId ? "/" + fileId : ""}?uploadType=multipart`, {
      headers,
      method: fileId ? "PATCH" : "POST",
      body: multipartBody,
    },
  );
  if (!expectContentType(result, "application/json")) {
    throw new Error(
      `Unexpected response Content-type (${result.headers.get("Content-type")}) from uploadFileAsString.\n` +
      `Data: ${await result.text()}`
    );
  }

  const resultJSON = await result.json();
  return result.ok
    ? resultJSON as unknown as IGoogleDriveFile
    : resultJSON as unknown as IGoogleDriveAPIError;
};

export const deleteFile = async (bearer: string, fileId: string): Promise<IGoogleDriveAPIDeleteFile | IGoogleDriveAPIError>  => {
  const headers = new Headers();
  headers.append('Authorization', `Bearer ${bearer}`);

  const result = await fetch(`${GDRIVE_FILES_URL}/${fileId}`, { method: "DELETE", headers });
  if (result.ok) {
    return result.text() as unknown as IGoogleDriveAPIDeleteFile;
  }

  if (!expectContentType(result, "application/json")) {
    throw new Error(
      `Unexpected response Content-type (${result.headers.get("Content-type")}) from deleteFile.\n` +
      `Data: ${await result.text()}`
    );
  }
  return result.json() as unknown as IGoogleDriveAPIError;
}

/**
 * Checks whether returned result an error.
 *
 * @param subject API result
 */
export const checkResponseIsError = (subject: any): subject is IGoogleDriveAPIError => {
  if (subject.error) {
    return true;
  }
  return false;
};

const expectContentType = (fetchResult: Response, expectedContentType: string): boolean => {
  const contentType = fetchResult.headers.get("Content-type");
  return (!!contentType) && contentType.includes(expectedContentType);
}