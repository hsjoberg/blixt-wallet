#pragma once

#include <BlixtTurboModulesJSI.h>

#include <memory>
#include <string>

namespace facebook::react {

class NativeSpeedloaderModule : public NativeSpeedloaderCxxSpec<NativeSpeedloaderModule> {
public:
  NativeSpeedloaderModule(std::shared_ptr<CallInvoker> jsInvoker);

  facebook::react::AsyncPromise<std::string> gossipSync(jsi::Runtime& rt, std::string serviceUrl, std::string cacheDir, std::string filesDir);
  void cancelGossipSync(jsi::Runtime& rt);
};

} // namespace facebook::react
