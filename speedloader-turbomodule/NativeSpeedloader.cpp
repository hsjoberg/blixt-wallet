#include "NativeSpeedloader.h"

#include "liblnd.h"
#include "blixtlog.h"

// Store global ref to the promise so that we can use it later in the callbacks from speedloader
facebook::react::AsyncPromise<std::string>* promise = nullptr;
bool isCancelled = false;

void onResponse(void* context, const char* data, int length) {
  BLIXT_LOG_DEBUG("onResponse");
  if (promise != nullptr && !isCancelled) {
    promise->resolve(std::string(data, length));
    promise = nullptr;
  }
}

void onError(void* context, const char* message) {
  BLIXT_LOG_DEBUG("onError " << message);
  if (promise != nullptr && !isCancelled) {
    promise->reject(facebook::react::Error(message));
    promise = nullptr;
  }
}

namespace facebook::react {

NativeSpeedloaderModule::NativeSpeedloaderModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSpeedloaderCxxSpec(std::move(jsInvoker)) {}

facebook::react::AsyncPromise<std::string> NativeSpeedloaderModule::gossipSync(jsi::Runtime& rt, std::string serviceUrl, std::string cacheDir, std::string filesDir) {
  BLIXT_LOG_DEBUG("gossipSync");
  AsyncPromise<std::string>* p = new AsyncPromise<std::string>(rt, jsInvoker_);

  // Store the promise globally and reset cancelled state
  promise = p;
  isCancelled = false;

  CCallback callback = {
      .onResponse = &onResponse,
      .onError = &onError,
      .responseContext = static_cast<uintptr_t>(0),
      .errorContext = static_cast<uintptr_t>(0)
  };
  const char* networkType = "wifi";

  ::gossipSync((char*)serviceUrl.c_str(),  (char*)cacheDir.c_str(), (char*)filesDir.c_str(), (char*)networkType, callback);

  return *p;
}

void NativeSpeedloaderModule::cancelGossipSync(jsi::Runtime& rt) {
  BLIXT_LOG_DEBUG("cancelGossipSync");
  isCancelled = true;
  ::cancelGossipSync();
  if (promise != nullptr) {
    promise->reject(facebook::react::Error("Gossip sync cancelled by user"));
    promise = nullptr;
  }
}

} // namespace facebook::react
