package com.blixtwallet

import com.facebook.react.bridge.ReactApplicationContext

class LndMobileToolsTurboModule(reactContext: ReactApplicationContext) :
  NativeLndmobileToolsSpec(reactContext) {
  override fun getName() = NAME

  override fun getStatus(): Double {
    val lnd = LndNative()
    return lnd.getStatus().toDouble()
  }

  companion object {
    const val NAME = "LndMobileToolsTurbo"
  }
}
