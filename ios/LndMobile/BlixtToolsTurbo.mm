#import "BlixtToolsBridge.m"
#import "BlixtTools.h"

@interface BlixtToolsTurbo ()
@property(nonatomic, strong) BlixtTools *gossipSyncBridge;
@end

@implementation BlixtToolsTurbo

RCT_EXPORT_MODULE(BlixtTools)

- (instancetype)init {
  self = [super init];
  if (self) {
    _gossipSyncBridge = [[BlixtTools alloc] init];
  }
  return self;
}

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

- (void)gossipSync:(NSString *)serviceUrl
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject {
  [self.gossipSyncBridge gossipSync:serviceUrl resolve:resolve reject:reject];
}

- (void)cancelGossipSync {
  [self.gossipSyncBridge cancelGossipSync];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeBlixtToolsSpecJSI>(params);
}

@end
