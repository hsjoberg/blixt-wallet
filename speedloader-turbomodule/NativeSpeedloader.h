#pragma once

#include <BlixtTurboModulesJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

class NativeSpeedloaderModule : public NativeSpeedloaderCxxSpec<NativeSpeedloaderModule> {
public:
  NativeSpeedloaderModule(std::shared_ptr<CallInvoker> jsInvoker);

  std::string gossipSync(jsi::Runtime& rt, std::string serviceUrl);
};

} // namespace facebook::react
