#pragma once

#include <string>
#include <sstream>

#ifdef __ANDROID__
#include <android/log.h>
#define SPEEDLOADER_LOG_TAG "TurboSpeedloader"
#elif defined(__APPLE__)
#include <os/log.h>
#endif

// Define log levels
#define SPEEDLOADER_LOG_LEVEL_DEBUG 0
#define SPEEDLOADER_LOG_LEVEL_INFO 1
#define SPEEDLOADER_LOG_LEVEL_WARN 2
#define SPEEDLOADER_LOG_LEVEL_ERROR 3

// Main logging macro
#define SPEEDLOADER_LOG(level, ...) do { \
    std::ostringstream oss; \
    oss << __VA_ARGS__; \
    SPEEDLOADER_log_message(level, oss.str()); \
} while(0)

// Convenience macros for different log levels
#define SPEEDLOADER_LOG_DEBUG(...) SPEEDLOADER_LOG(SPEEDLOADER_LOG_LEVEL_DEBUG, __VA_ARGS__)
#define SPEEDLOADER_LOG_INFO(...)  SPEEDLOADER_LOG(SPEEDLOADER_LOG_LEVEL_INFO, __VA_ARGS__)
#define SPEEDLOADER_LOG_WARN(...)  SPEEDLOADER_LOG(SPEEDLOADER_LOG_LEVEL_WARN, __VA_ARGS__)
#define SPEEDLOADER_LOG_ERROR(...) SPEEDLOADER_LOG(SPEEDLOADER_LOG_LEVEL_ERROR, __VA_ARGS__)

// Platform-specific logging implementation
inline void SPEEDLOADER_log_message(int level, const std::string& message) {
#ifdef __ANDROID__
    android_LogPriority priority;
    switch (level) {
        case SPEEDLOADER_LOG_LEVEL_DEBUG: priority = ANDROID_LOG_DEBUG; break;
        case SPEEDLOADER_LOG_LEVEL_INFO:  priority = ANDROID_LOG_INFO;  break;
        case SPEEDLOADER_LOG_LEVEL_WARN:  priority = ANDROID_LOG_WARN;  break;
        case SPEEDLOADER_LOG_LEVEL_ERROR: priority = ANDROID_LOG_ERROR; break;
        default:                       priority = ANDROID_LOG_INFO;  break;
    }
    __android_log_write(priority, SPEEDLOADER_LOG_TAG, message.c_str());
#elif defined(__APPLE__)
    os_log_type_t log_type;
    switch (level) {
        case SPEEDLOADER_LOG_LEVEL_DEBUG: log_type = OS_LOG_TYPE_DEBUG; break;
        case SPEEDLOADER_LOG_LEVEL_INFO:  log_type = OS_LOG_TYPE_INFO;  break;
        case SPEEDLOADER_LOG_LEVEL_WARN:  log_type = OS_LOG_TYPE_DEFAULT; break;
        case SPEEDLOADER_LOG_LEVEL_ERROR: log_type = OS_LOG_TYPE_ERROR; break;
        default:                       log_type = OS_LOG_TYPE_DEFAULT; break;
    }
    os_log_with_type(OS_LOG_DEFAULT, log_type, "%{public}s", message.c_str());
#else
    // Fallback to console logging for other platforms
    const char* level_str;
    switch (level) {
        case SPEEDLOADER_LOG_LEVEL_DEBUG: level_str = "DEBUG"; break;
        case SPEEDLOADER_LOG_LEVEL_INFO:  level_str = "INFO";  break;
        case SPEEDLOADER_LOG_LEVEL_WARN:  level_str = "WARN";  break;
        case SPEEDLOADER_LOG_LEVEL_ERROR: level_str = "ERROR"; break;
        default:                       level_str = "INFO";  break;
    }
    fprintf(stderr, "[SPEEDLOADER_%s] %s\n", level_str, message.c_str());
#endif
}
