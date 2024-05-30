#!/bin/bash
# reactnativecommunity/react-native-android:13.0
BUILDER_IMAGE="reactnativecommunity/react-native-android@sha256:4ff9c9f80da57c72284900fcfdbd079183e735684c62d7fafd3df50fdb895453"
CONTAINER_NAME="blixt_builder_container"
BLIXT_PATH=/blixt

docker run --rm -it --name $CONTAINER_NAME -v `pwd`:$BLIXT_PATH $BUILDER_IMAGE bash -c \
     'echo -e "\n\n********************************\n*** Building Blixt...\n********************************\n" && \
      cd /blixt ; yarn install --frozen-lockfile && \
      cd /blixt/android ; ./gradlew app:assembleRelease && \

      echo -e "\n\n********************************\n**** APKs and SHA256 Hashes\n********************************\n" && \
      cd /blixt && \
      for f in android/app/build/outputs/apk/release/*.apk;
      do
	      RENAMED_FILENAME=$(echo $f | sed -e "s/app-/blixt-/" | sed -e "s/-release-unsigned//")
	      mv $f $RENAMED_FILENAME
	      sha256sum $RENAMED_FILENAME
      done && \
      echo -e "\n" ';
