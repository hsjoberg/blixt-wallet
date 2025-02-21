#include <jni.h>
#include <string>
#include <atomic>

#include "liblnd.h"
#include "blixtlog.h"
#include "JvmStore.h"

struct CallbackContext {
  jobject callback;
  std::atomic<bool> cleaned;
  bool isStart; // true if this is for start() operation. start is special in that its callbacks can be called multiple times
};

// Sync
/////////
// Response callback (matches ResponseFunc signature)
void handleOnResponse(void *context, const char *data, int length) {
  BLIXT_LOG_DEBUG("handleOnResponse " << data);

  auto ctx = reinterpret_cast<CallbackContext *>(context);

  JNIEnv *env;
  bool shouldDetach = false;
  jint getEnvResult = gJvm->GetEnv((void **)&env, JNI_VERSION_1_6);
  if (getEnvResult == JNI_EDETACHED) {
    gJvm->AttachCurrentThread(&env, nullptr);
    shouldDetach = true;
  }

  // Convert native data to Java byte[]
  jbyteArray jData = env->NewByteArray(length);
  env->SetByteArrayRegion(jData, 0, length, (const jbyte *)data);

  jclass cls = env->GetObjectClass(ctx->callback);
  jmethodID onResponse = env->GetMethodID(cls, "onResponse", "([B)V");
  env->CallVoidMethod(ctx->callback, onResponse, jData);

  // Cleanup
  env->DeleteLocalRef(jData);

  // Only delete the global ref if this isn't a start() operation
  // For start(), we'll let the error handler clean up
  if (!ctx->isStart) {
    if (!ctx->cleaned.exchange(true)) {
      env->DeleteGlobalRef(ctx->callback);
      delete ctx;
    }
  }

  if (shouldDetach) {
    gJvm->DetachCurrentThread();
  }
}

// Error callback (matches ErrorFunc signature)
void handleOnError(void *context, const char *error) {
  BLIXT_LOG_DEBUG("handleOnError " << error);

  auto ctx = reinterpret_cast<CallbackContext *>(context);

  JNIEnv *env;
  bool shouldDetach = false;
  jint getEnvResult = gJvm->GetEnv((void **)&env, JNI_VERSION_1_6);
  if (getEnvResult == JNI_EDETACHED) {
    gJvm->AttachCurrentThread(&env, nullptr);
    shouldDetach = true;
  }

  jstring jError = env->NewStringUTF(error ? error : "Unknown error");

  jclass cls = env->GetObjectClass(ctx->callback);
  jmethodID onError = env->GetMethodID(cls, "onError", "(Ljava/lang/String;)V");
  env->CallVoidMethod(ctx->callback, onError, jError);

  env->DeleteLocalRef(jError);

  // Clean up if not already done
  if (!ctx->cleaned.exchange(true)) {
    env->DeleteGlobalRef(ctx->callback);
    delete ctx;
  }

  if (shouldDetach) {
    gJvm->DetachCurrentThread();
  }
}

extern "C" JNIEXPORT void JNICALL Java_com_blixtwallet_LndNative_startLnd(
    JNIEnv *env,
    jobject /* this */,
    jstring jExtraArgs,
    jobject jCallback)
{
  const char *extraArgs = env->GetStringUTFChars(jExtraArgs, nullptr);

  // Context is used to keep track of the callback and whether it has been cleaned up
  auto *ctx = new CallbackContext {
    .callback = env->NewGlobalRef(jCallback),
    .cleaned = false,
    .isStart = true
  };

  // Configure C callback struct
  CCallback cCallback {
    .onResponse = handleOnResponse,
    .onError = handleOnError,
    .responseContext = ctx,
    .errorContext = ctx
  };

  // Call native function
  ::start(strdup(extraArgs), cCallback); // strdup to copy string TODO probably not needed

  // Release resources
  env->ReleaseStringUTFChars(jExtraArgs, extraArgs);
}

extern "C" JNIEXPORT void JNICALL Java_com_blixtwallet_LndNative_getInfo(
    JNIEnv *env,
    jobject /* this */,
    jbyteArray request,
    jobject jCallback)
{
  // Convert request
  jbyte *requestData = env->GetByteArrayElements(request, nullptr);
  jsize requestLength = env->GetArrayLength(request);

  // Context is used to keep track of the callback and whether it has been cleaned up
  auto *ctx = new CallbackContext {
    .callback = env->NewGlobalRef(jCallback),
    .cleaned = false,
    .isStart = true
  };

  // Configure C callback struct
  CCallback cCallback {
    .onResponse = handleOnResponse,
    .onError = handleOnError,
    .responseContext = ctx,
    .errorContext = ctx
  };


  ::getInfo(reinterpret_cast<char *>(requestData), static_cast<int>(requestLength), cCallback);

  // Release resources
  env->ReleaseByteArrayElements(request, requestData, JNI_ABORT);
}

extern "C" JNIEXPORT void JNICALL Java_com_blixtwallet_LndNative_unlockWallet(
    JNIEnv *env,
    jobject /* this */,
    jbyteArray request,
    jobject jCallback)
{
  // Convert request
  jbyte *requestData = env->GetByteArrayElements(request, nullptr);
  jsize requestLength = env->GetArrayLength(request);

  // Context is used to keep track of the callback and whether it has been cleaned up
  auto *ctx = new CallbackContext {
    .callback = env->NewGlobalRef(jCallback),
    .cleaned = false,
    .isStart = true
  };

  // Configure C callback struct
  CCallback cCallback {
    .onResponse = handleOnResponse,
    .onError = handleOnError,
    .responseContext = ctx,
    .errorContext = ctx
  };

  // Call native function with actual request data
  ::unlockWallet(reinterpret_cast<char *>(requestData), static_cast<int>(requestLength), cCallback);

  // Release resources
  env->ReleaseByteArrayElements(request, requestData, JNI_ABORT);
}

extern "C" JNIEXPORT void JNICALL Java_com_blixtwallet_LndNative_stopDaemon(
    JNIEnv *env,
    jobject /* this */,
    jbyteArray request,
    jobject jCallback)
{
  // Convert request
  jbyte *requestData = env->GetByteArrayElements(request, nullptr);
  jsize requestLength = env->GetArrayLength(request);

  // Context is used to keep track of the callback and whether it has been cleaned up
  auto *ctx = new CallbackContext {
    .callback = env->NewGlobalRef(jCallback),
    .cleaned = false,
    .isStart = true
  };

  // Configure C callback struct
  CCallback cCallback {
    .onResponse = handleOnResponse,
    .onError = handleOnError,
    .responseContext = ctx,
    .errorContext = ctx
  };

  // Call native function with actual request data
  ::stopDaemon(reinterpret_cast<char *>(requestData), static_cast<int>(requestLength), cCallback);

  // Release resources
  env->ReleaseByteArrayElements(request, requestData, JNI_ABORT);
}

// Stream
/////////
// Response callback (matches ResponseFunc)
void handleServerStreamOnResponse(void *context, const char *data, int length) {
  JNIEnv *env;
  bool shouldDetach = false;
  jint getEnvResult = gJvm->GetEnv((void **)&env, JNI_VERSION_1_6);
  if (getEnvResult == JNI_EDETACHED) {
    gJvm->AttachCurrentThread(&env, nullptr);
    shouldDetach = true;
  }

  auto callback = reinterpret_cast<jobject>(context);

  // Convert native data to Java byte[]
  jbyteArray jData = env->NewByteArray(length);
  env->SetByteArrayRegion(jData, 0, length, (const jbyte *)data);

  jclass cls = env->GetObjectClass(callback);
  jmethodID onResponse = env->GetMethodID(cls, "onResponse", "([B)V");
  env->CallVoidMethod(callback, onResponse, jData);

  env->DeleteLocalRef(jData);

  if (shouldDetach) {
    gJvm->DetachCurrentThread();
  }
}

// Error callback (matches ErrorFunc)
void handleServerStreamOnError(void *context, const char *error) {
  JNIEnv *env;
  bool shouldDetach = false;
  jint getEnvResult = gJvm->GetEnv((void **)&env, JNI_VERSION_1_6);
  if (getEnvResult == JNI_EDETACHED) {
    gJvm->AttachCurrentThread(&env, nullptr);
    shouldDetach = true;
  }

  auto listener = reinterpret_cast<jobject>(context);
  jstring jError = env->NewStringUTF(error);

  jclass cls = env->GetObjectClass(listener);
  jmethodID onError = env->GetMethodID(cls, "onError", "(Ljava/lang/String;)V");
  env->CallVoidMethod(listener, onError, jError);

  // Only cleanup global ref if error contains "EOF". We should expect that
  // the stream will be closed after the error is received.
  if (strstr(error, "EOF") != nullptr) {
    env->DeleteGlobalRef(listener);
  }
  env->DeleteLocalRef(jError);

  if (shouldDetach) {
    gJvm->DetachCurrentThread();
  }
}

extern "C" JNIEXPORT void JNICALL Java_com_blixtwallet_LndNative_subscribeState(
    JNIEnv *env,
    jobject /* this */,
    jbyteArray jRequest,
    jobject jListener)
{
  // Convert request
  jbyte *reqBytes = env->GetByteArrayElements(jRequest, nullptr);
  jsize reqLength = env->GetArrayLength(jRequest);

  jobject gListener = env->NewGlobalRef(jListener); // Prevent GC

  // Configure C stream
  CRecvStream stream {
    .onResponse = handleServerStreamOnResponse,
    .onError = handleServerStreamOnError,
    .responseContext = gListener,
    .errorContext = gListener
  };

  // Call native function
  ::subscribeState(reinterpret_cast<char *>(reqBytes), static_cast<int>(reqLength), stream);

  // Cleanup request
  env->ReleaseByteArrayElements(jRequest, reqBytes, JNI_ABORT);
}

extern "C" JNIEXPORT jint JNICALL Java_com_blixtwallet_LndNative_getStatus(
    JNIEnv *env,
    jobject /* this */)
{
  // Call the native getStatus function from liblnd
  return static_cast<jint>(::getStatus());
}
