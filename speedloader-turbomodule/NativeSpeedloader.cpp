#include "NativeSpeedloader.h"

namespace facebook::react {

NativeSpeedloaderModule::NativeSpeedloaderModule(std::shared_ptr<CallInvoker> jsInvoker)
    : NativeSpeedloaderCxxSpec(std::move(jsInvoker)) {}

std::string NativeSpeedloaderModule::gossipSync(jsi::Runtime& rt, std::string serviceUrl) {
  return std::string(serviceUrl.rbegin(), serviceUrl.rend());
}

} // namespace facebook::react