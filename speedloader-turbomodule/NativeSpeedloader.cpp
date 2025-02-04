#include "NativeSpeedloader.h"

#include "liblnd.h"
#include "log.h"

// Store global ref to the promise so that we can use it later in the callbacks from speedloader
facebook::react::AsyncPromise<std::string>* promise = nullptr;

void onResponse(void* context, const char* data, int length) {
  SPEEDLOADER_LOG_DEBUG("onResponse");
  promise->resolve(std::string(data, length));
}

void onError(void* context, const char* message) {
  SPEEDLOADER_LOG_DEBUG("onError " << message);
  promise->reject(facebook::react::Error(message));
}

namespace facebook::react {

NativeSpeedloaderModule::NativeSpeedloaderModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSpeedloaderCxxSpec(std::move(jsInvoker)) {}

facebook::react::AsyncPromise<std::string> NativeSpeedloaderModule::gossipSync(jsi::Runtime& rt, std::string serviceUrl, std::string cacheDir, std::string filesDir) {
  SPEEDLOADER_LOG_DEBUG("gossipSync");
  AsyncPromise<std::string>* p = new AsyncPromise<std::string>(rt, jsInvoker_);

  // Store the promise globally
  promise = p;

  CCallback callback = {
      .onResponse = &onResponse,
      .onError = &onError,
      .responseContext = nullptr,
      .errorContext = nullptr
  };
  const char* networkType = "wifi";

  ::gossipSync((char*)serviceUrl.c_str(),  (char*)cacheDir.c_str(),  (char*)filesDir.c_str(), (char*)networkType, callback);

  return *p;
}

} // namespace facebook::react