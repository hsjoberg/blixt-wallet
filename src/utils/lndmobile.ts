import Log from "./log";
const log = Log("utils/lndmobile.ts");

export function checkLndStreamErrorResponse(name: string, event: any): Error | "EOF" | null {
  if (!event || typeof event !== "object") {
    return new Error(name + ": Got invalid response from lnd: " + JSON.stringify(event));
  }
  console.log("checkLndStreamErrorResponse error_desc:", event.error_desc);
  if (event.error_code) {
    // TODO SubscribeState for some reason
    // returns error code "error reading from server: EOF" instead of simply "EOF"
    if (
      event.error_desc === "EOF" ||
      event.error_desc === "error reading from server: EOF" ||
      event.error_desc === "channel event store shutting down"
    ) {
      log.i("Got EOF for stream: " + name);
      return "EOF";
    } else if (event.error_desc === "closed") {
      log.i("checkLndStreamErrorResponse: Got closed error");
    }
    return new Error(event.error_desc);
  }
  return null;
}
