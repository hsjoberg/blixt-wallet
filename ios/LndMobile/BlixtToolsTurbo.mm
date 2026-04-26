#import <BlixtTurboModules/BlixtTurboModules.h>
#import <objc/runtime.h>

@interface BlixtTools : NSObject <NativeBlixtToolsSpec>
@end

@implementation BlixtTools (TurboModule)

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeBlixtToolsSpecJSI>(params);
}

@end

static const void *kBlixtToolsEventEmitterCallbackKey = &kBlixtToolsEventEmitterCallbackKey;

@implementation BlixtTools (TurboEvents)

- (void)setEventEmitterCallback:(EventEmitterCallbackWrapper *)eventEmitterCallbackWrapper
{
  objc_setAssociatedObject(
      self,
      kBlixtToolsEventEmitterCallbackKey,
      eventEmitterCallbackWrapper,
      OBJC_ASSOCIATION_RETAIN_NONATOMIC);
}

- (void)emitOnLndLog:(NSString *_Nonnull)value
{
  EventEmitterCallbackWrapper *wrapper =
      (EventEmitterCallbackWrapper *)objc_getAssociatedObject(self, kBlixtToolsEventEmitterCallbackKey);

  if (wrapper && wrapper->_eventEmitterCallback) {
    wrapper->_eventEmitterCallback("onLndLog", value);
  }
}

@end
