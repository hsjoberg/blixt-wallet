#import "LndMobileToolsTurbo.h"

@implementation LndMobileToolsTurbo

RCT_EXPORT_MODULE()

- (void)startSyncWorker {
  return;
}

- (void)scheduleSyncWorker {
  return;
}

- (void)stopScheduleSyncWorker {
  return;
}

- (NSNumber *)getStatus {
  return @0;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeLndmobileToolsSpecJSI>(params);
}

@end
