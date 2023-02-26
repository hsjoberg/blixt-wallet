Make sure you have installed [Go](https://golang.org) before proceeding.

- Get lnd: `go get -d github.com/lightningnetwork/lnd`
- `cd src/github.com/lightningnetwork/lnd/`
- Get and init gomobile: `go get golang.org/x/tools/cmd/goimports`, `go get golang.org/x/tools/go/packages`, `go get golang.org/x/mobile/cmd/gomobile` and `gomobile init`
- Add router prefix by editing `mobile/gen_bindings.sh` on line 47
- Compile with `make android`
- Put `mobile/build/android/Lndmobile.aar` file inside `android/lndmobile`
