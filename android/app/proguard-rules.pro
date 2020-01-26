# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:
# MeiZu Fingerprint

-keep class com.fingerprints.service.** { *; }
-dontwarn com.fingerprints.service.**

# Samsung Fingerprint

-keep class com.samsung.android.sdk.** { *; }
-dontwarn com.samsung.android.sdk.**

# React-native Hermes
-keep class com.facebook.hermes.unicode.** { *; }
