VERSION=v0.18.2-beta-blixt

ANDROID_FILE=Lndmobile.aar

ANDROID_SHA256='fd392400f80f1e91beac0dd926350119df50f30324c01e134a7afff1deadaee0'

FILE_PATH=https://github.com/hsjoberg/lnd/releases/download/$VERSION/

ANDROID_LINK=$FILE_PATH$ANDROID_FILE

###########
# Android #
###########

# delete old instance of library file
rm -rf android/app/lndmobile/$ANDROID_FILE

# download Android LND library file
curl -L $ANDROID_LINK > android/app/lndmobile/$ANDROID_FILE

# check checksum
if ! echo "$ANDROID_SHA256 android/app/lndmobile/$ANDROID_FILE" | sha256sum -c -; then
    echo "Android checksum failed" >&2
    exit 1
fi