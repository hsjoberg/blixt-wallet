export const types = {
  allFiles: "*/*",
};

export const isCancel = (error) => {
  return Boolean(error && error.code === "DOCUMENT_PICKER_CANCELED");
};

const unsupported = () => {
  const error = new Error("Document picker is not supported on web demo");
  error.code = "DOCUMENT_PICKER_UNSUPPORTED";
  throw error;
};

export const pick = async () => unsupported();
export const pickSingle = async () => unsupported();
export const pickDirectory = async () => unsupported();
export const keepLocalCopy = async () => [];
export const LocalCopyResponse = {};

export default {
  types,
  isCancel,
  pick,
  pickSingle,
  pickDirectory,
  keepLocalCopy,
};
