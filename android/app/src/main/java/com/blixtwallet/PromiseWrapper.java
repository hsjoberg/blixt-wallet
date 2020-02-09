package com.blixtwallet;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Promise;

public abstract class PromiseWrapper implements Promise {
  abstract void onSuccess(@Nullable Object value);

  abstract void onFail();

  @Override
  public void resolve(@Nullable Object value) { onSuccess(value); }
  @Override
  public void reject(String code, String message) { onFail(); }
  @Override
  public void reject(String code, Throwable throwable) { onFail(); }
  @Override
  public void reject(String code, String message, Throwable throwable) { onFail(); }
  @Override
  public void reject(Throwable throwable) { onFail(); }
  @Override
  public void reject(Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, @NonNull WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, String message, @NonNull WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String code, String message, Throwable throwable, WritableMap userInfo) { onFail(); }
  @Override
  public void reject(String message) { onFail(); }
}