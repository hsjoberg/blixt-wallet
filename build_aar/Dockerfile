FROM ubuntu:18.04

LABEL Description="Blixt Wallet image, forked from gengjiawen/docker-android"
LABEL maintainer="Hampus Sjöberg  <hampus.sjoberg@protonmail.com>"

ENV LANG C.UTF-8

# Golang
RUN apt-get update && apt-get install -qq -y curl unzip
RUN curl -o go.tgz https://dl.google.com/go/go1.15.8.linux-amd64.tar.gz
RUN tar -C /usr/local -xzf go.tgz
ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 777 "$GOPATH"
# WORKDIR $GOPATH

# protoc
RUN curl -L -o protoc.zip https://github.com/protocolbuffers/protobuf/releases/download/v3.4.0/protoc-3.4.0-linux-x86_64.zip && unzip protoc.zip
RUN mv bin/protoc /usr/bin/ && mv include/* /usr/include/

# Java and Node
# set default build arguments
ARG SDK_VERSION=sdk-tools-linux-4333796.zip
ARG ANDROID_BUILD_VERSION=28
ARG ANDROID_TOOLS_VERSION=28.0.3
ARG BUCK_VERSION=2019.05.22.01
ARG NDK_VERSION=19c
ARG NODE_VERSION=10.x
ARG WATCHMAN_VERSION=4.9.0

# set default environment variables
ENV ADB_INSTALL_TIMEOUT=10
ENV ANDROID_HOME=/opt/android
ENV ANDROID_SDK_HOME=${ANDROID_HOME}
ENV ANDROID_NDK=/opt/ndk/android-ndk-r$NDK_VERSION
# TODO fix upstream:
ENV ANDROID_NDK_HOME=/opt/ndk/android-ndk-r$NDK_VERSION
ENV JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64

ENV PATH=${ANDROID_NDK}:${ANDROID_HOME}/emulator:${ANDROID_HOME}/tools:${ANDROID_HOME}/tools/bin:${ANDROID_HOME}/platform-tools:/opt/buck/bin/:${PATH}

# Install system dependencies
# See https://github.com/debuerreotype/docker-debian-artifacts/issues/24
RUN mkdir -p /usr/share/man/man1 \
    && apt-get update -qq && apt-get install -qq -y --no-install-recommends \
        apt-transport-https \
        curl \
        build-essential \
        file \
        git \
        gnupg2 \
        openjdk-8-jdk \
        python \
        openssh-client \
    && rm -rf /var/lib/apt/lists/*;

# install nodejs and yarn packages from nodesource and yarn apt sources
RUN echo "deb https://deb.nodesource.com/node_${NODE_VERSION} stretch main" > /etc/apt/sources.list.d/nodesource.list \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" > /etc/apt/sources.list.d/yarn.list \
    && curl -sS https://deb.nodesource.com/gpgkey/nodesource.gpg.key | apt-key add - \
    && curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && apt-get update -qq \
    && apt-get install -qq -y --no-install-recommends nodejs yarn \
    && rm -rf /var/lib/apt/lists/*

# download and unpack NDK
RUN curl -sS https://dl.google.com/android/repository/android-ndk-r$NDK_VERSION-linux-x86_64.zip -o /tmp/ndk.zip \
    && mkdir /opt/ndk \
    && unzip -q -d /opt/ndk /tmp/ndk.zip \
    && rm /tmp/ndk.zip

# download and install buck using debian package
RUN curl -sS -L https://github.com/facebook/buck/releases/download/v${BUCK_VERSION}/buck.${BUCK_VERSION}_all.deb -o /tmp/buck.deb \
    && dpkg -i /tmp/buck.deb \
    && rm /tmp/buck.deb

# Full reference at https://dl.google.com/android/repository/repository2-1.xml
# download and unpack android
RUN curl -sS https://dl.google.com/android/repository/${SDK_VERSION} -o /tmp/sdk.zip \
    && mkdir ${ANDROID_HOME} \
    && unzip -q -d ${ANDROID_HOME} /tmp/sdk.zip \
    && rm /tmp/sdk.zip \
    && yes | sdkmanager --licenses \
    && yes | sdkmanager "platform-tools" \
        "emulator" \
        "platforms;android-$ANDROID_BUILD_VERSION" \
        "build-tools;$ANDROID_TOOLS_VERSION" \
        "add-ons;addon-google_apis-google-23" \
        "system-images;android-19;google_apis;armeabi-v7a" \
        "extras;android;m2repository"

COPY build_aar.sh /build_aar.sh

ENTRYPOINT ["/build_aar.sh"]
