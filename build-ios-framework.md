Make sure you have installed [Go](https://golang.org) and relevant iOS development tools before proceeding.

- Get lnd: `go get -d github.com/lightningnetwork/lnd`
- `cd src/github.com/lightningnetwork/lnd/`
- Get and init gomobile: `go get golang.org/x/tools/cmd/goimports`, `go get golang.org/x/tools/go/packages`, `go get golang.org/x/mobile/cmd/gomobile` and `gomobile init`
- Compile with `make ios prefix="1" tags="routerrpc walletrpc signrpc invoicesrpc"`
- Put `mobile/build/ios/Lndmobile.framework` folder to `ios/`
