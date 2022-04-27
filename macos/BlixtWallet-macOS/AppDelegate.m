#import "AppDelegate.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>

#import <React/RCTLinkingManager.h>

@interface AppDelegate () <RCTBridgeDelegate>

@end

@implementation AppDelegate


- (void)awakeFromNib {
  [super awakeFromNib];

  _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
}

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
  [[NSAppleEventManager sharedAppleEventManager]
   setEventHandler:self
   andSelector:@selector(getURL:withReplyEvent:)
   forEventClass:kInternetEventClass andEventID:kAEGetURL
  ];
  // Insert code here to initialize your application
}

- (void)getURL:(NSAppleEventDescriptor *)event withReplyEvent:(NSAppleEventDescriptor *)reply
{
  NSLog(@"Inside getURL");
  [RCTLinkingManager getUrlEventHandler:event withReplyEvent:reply];
}

- (void)applicationWillTerminate:(NSNotification *)aNotification {
  // Insert code here to tear down your application
}

#pragma mark - RCTBridgeDelegate Methods

- (NSURL *)sourceURLForBridge:(__unused RCTBridge *)bridge {
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index" fallbackResource:@"main"]; // .jsbundle;
}

@end
