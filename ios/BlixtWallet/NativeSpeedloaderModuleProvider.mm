#import "NativeSpeedloaderModuleProvider.h"
#import <ReactCommon/CallInvoker.h>
#import <ReactCommon/TurboModule.h>
#import "NativeSpeedloader.h"

@implementation NativeSpeedloaderModuleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  NSLog(@"Trying to get module Speedloader");
  return std::make_shared<facebook::react::NativeSpeedloaderModule>(params.jsInvoker);
}

@end
