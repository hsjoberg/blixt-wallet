#import "LndMobileToolsTurbo.h"

@implementation LndMobileToolsTurbo

RCT_EXPORT_MODULE()

- (NSString *)hello {
  return @"Hello from TurboModule!";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeLndmobileToolsSpecJSI>(params);
}

@end
