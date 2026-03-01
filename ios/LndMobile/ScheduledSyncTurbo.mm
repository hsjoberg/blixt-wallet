#import "ScheduledSyncTurbo.h"

@implementation ScheduledSyncTurbo

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

- (void)setupScheduledSyncWork:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
  resolve(@(YES));
}

- (void)removeScheduledSyncWork:(RCTPromiseResolveBlock)resolve
                          reject:(RCTPromiseRejectBlock)reject {
  resolve(@(YES));
}

- (void)checkScheduledSyncWorkStatus:(RCTPromiseResolveBlock)resolve
                               reject:(RCTPromiseRejectBlock)reject {
  resolve(@"WORK_NOT_EXIST");
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeScheduledSyncTurboSpecJSI>(params);
}

@end
