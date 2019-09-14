Make sure Go and environment vars are set up before proceeding.

* Get lnd: `go get -d github.com/lightningnetwork/lnd`
* `cd src/github.com/lightningnetwork/lnd/`
* Get and init gomobile: `go get golang.org/x/mobile/cmd/gomobile` and `gomobile init`
* Compile with `make android`
* Put Lndmobile.aar file inside android/lndmobile
