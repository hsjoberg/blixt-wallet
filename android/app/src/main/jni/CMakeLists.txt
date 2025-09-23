cmake_minimum_required(VERSION 3.13)

# Define the library name here.
project(appmodules)

set(CMAKE_CXX_STANDARD 20)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# This for the Speedloader TurboModule
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ../../../../../speedloader-turbomodule/NativeSpeedloader.cpp)

# This is JNI bindings for the TurboLndSyncWorker
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ./LndJNI.cpp)

# Define where CMake can find the additional header files. We need to crawl back the jni, main, src, app, android folders
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../speedloader-turbomodule)

# We need to make usage of the liblnd.so library for the `gossipSync` function
set(SPEEDLOADER_JNILIBS_PATH "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs")
set(SPEEDLOADER_LIBRARY_PATH "${SPEEDLOADER_JNILIBS_PATH}/${CMAKE_ANDROID_ARCH_ABI}/liblnd.so")
if(NOT EXISTS ${SPEEDLOADER_LIBRARY_PATH})
    message(FATAL_ERROR "liblnd.so not found at ${SPEEDLOADER_LIBRARY_PATH}")
endif()
add_library(lib_speedloader SHARED IMPORTED)
set_property(TARGET lib_speedloader PROPERTY IMPORTED_NO_SONAME 1)
set_target_properties(lib_speedloader PROPERTIES IMPORTED_LOCATION ${SPEEDLOADER_LIBRARY_PATH})

# Include the arch-specific liblnd.h header file
target_include_directories(${CMAKE_PROJECT_NAME} PUBLIC ../../../../../speedloader-turbomodule/liblnd/${CMAKE_ANDROID_ARCH_ABI})

# link_libraries(lib_speedloader)
target_link_libraries(${CMAKE_PROJECT_NAME} lib_speedloader)
