VERSION=v0.18.0-beta-blixt

ANDROID_FILE=Lndmobile.aar

ANDROID_SHA256='c0f8e77da00795a370ef2a1c5ba9d413707c52226c33c2ef1e272007c2f30149'

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