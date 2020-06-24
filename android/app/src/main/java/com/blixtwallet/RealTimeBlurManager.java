package com.blixtwallet;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.annotations.ReactProp;

import com.github.mmin18.widget.RealtimeBlurView;

public class RealTimeBlurManager extends SimpleViewManager<RealtimeBlurView> {

  public static final String REACT_CLASS = "RCTRealTimeBlur";
  ReactApplicationContext mCallerContext;

  public RealTimeBlurManager(ReactApplicationContext reactContext) {
    mCallerContext = reactContext;
  }

  @Override
  public String getName() {
    return REACT_CLASS;
  }

  @Override
  public RealtimeBlurView createViewInstance(ThemedReactContext context) {
    return new RealtimeBlurView(context, null);
  }

  @ReactProp(name = "overlayColor")
  public void setOverlayColor(RealtimeBlurView view, @Nullable String overlayColor) {
    if (overlayColor == null) {
      overlayColor = "#aaffffff";
    }
    view.setOverlayColor(android.graphics.Color.parseColor(overlayColor));
  }

  @ReactProp(name = "blurRadius", defaultFloat = 10f)
  public void setBlurRadius(RealtimeBlurView view, float blurRadius) {
    view.setBlurRadius(blurRadius);
  }

  @ReactProp(name = "downsampleFactor", defaultFloat = 4f)
  public void setDownsampleFactor(RealtimeBlurView view, float downsampleFactor) {
    view.setDownsampleFactor(downsampleFactor);
  }

}

