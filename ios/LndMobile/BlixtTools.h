#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>

NS_ASSUME_NONNULL_BEGIN

@interface BlixtTools : NSObject

- (void)gossipSync:(NSString *)serviceUrl
           resolve:(RCTPromiseResolveBlock)resolve
            reject:(RCTPromiseRejectBlock)reject;

- (void)cancelGossipSync;

@end

NS_ASSUME_NONNULL_END
