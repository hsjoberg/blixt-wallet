cmake_minimum_required(VERSION 3.13)

# Define the library name here.
project(appmodules)

set(CMAKE_CXX_STANDARD 20)

# This file includes all the necessary to let you build your React Native application
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# This is JNI bindings for the LndMobileScheduledSyncWorker
target_sources(${CMAKE_PROJECT_NAME} PRIVATE ./LndJNI.cpp)

# LndJNI.cpp depends on liblnd headers from react-native-turbo-lnd and liblnd.so from jniLibs.
set(
  LND_HEADERS_DIR
  "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../node_modules/react-native-turbo-lnd/cpp/liblnd/${CMAKE_ANDROID_ARCH_ABI}"
)
set(
  LND_CPP_DIR
  "${CMAKE_CURRENT_SOURCE_DIR}/../../../../../node_modules/react-native-turbo-lnd/cpp"
)
set(LND_SO_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../jniLibs/${CMAKE_ANDROID_ARCH_ABI}")

if(NOT EXISTS "${LND_HEADERS_DIR}/liblnd.h")
  message(FATAL_ERROR "Missing liblnd.h in ${LND_HEADERS_DIR}")
endif()
if(NOT EXISTS "${LND_CPP_DIR}/utils/log.h")
  message(FATAL_ERROR "Missing utils/log.h in ${LND_CPP_DIR}")
endif()
if(NOT EXISTS "${LND_SO_DIR}/liblnd.so")
  message(FATAL_ERROR "Missing liblnd.so in ${LND_SO_DIR}")
endif()
target_include_directories(
  ${CMAKE_PROJECT_NAME}
  PRIVATE
  "${LND_HEADERS_DIR}"
  "${LND_CPP_DIR}"
)

add_library(liblnd SHARED IMPORTED)
set_target_properties(
  liblnd
  PROPERTIES
  IMPORTED_NO_SONAME 1
  IMPORTED_LOCATION "${LND_SO_DIR}/liblnd.so"
)
target_link_libraries(${CMAKE_PROJECT_NAME} liblnd)

find_library(LOG_LIB log)
target_link_libraries(${CMAKE_PROJECT_NAME} ${LOG_LIB})
