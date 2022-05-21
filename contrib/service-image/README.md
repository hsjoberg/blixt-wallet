# About

Scripts for creating images to be used in the webpage WebLN Stores & Services List.
It's also used to display service image in the transaction log.

# How to use

## Install Pre-requisites

### Cwebp

On **Linux/Ubuntu**:

```
sudo apt update && sudo apt install webp
```

On **MacOS**: 

```
brew install webp
```

## Run scripts

1. Run `./convert.sh` to generate the WebP files to used
2. Run `./generate-code.sh` to generate code to either be used in the WebLN list or
the transaction log.
  - For WebLN List, open `contrib/service-image/code/code.html` and copy the things you need
  - For Blixt transaction list etc, open `contrib/service-image/code/code.js` and copy the whole code and replace what's in lightning-services.ts
