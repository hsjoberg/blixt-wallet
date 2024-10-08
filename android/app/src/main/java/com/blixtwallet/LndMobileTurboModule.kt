package com.blixtwallet

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.blixtwallet.NativeLndmobileToolsSpec

class LndMobileToolsTurboModule(reactContext: ReactApplicationContext) : NativeLndmobileToolsSpec(reactContext) {
  override fun getName() = NAME

  override fun hello(): String {
    return "world"
  }

  companion object {
    const val NAME = "LndMobileToolsTurbo"
  }
}