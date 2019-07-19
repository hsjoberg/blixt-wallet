Make sure Go and environment vars are set up before proceeding.

* Get lnd: `go get -d github.com/lightningnetwork/lnd`
* `cd src/github.com/lightningnetwork/lnd/`
* Build lnd from a different branch in halseth's repo (PR not merged yet: https://github.com/lightningnetwork/lnd/pull/3282):
* * `git remote add halseth https://github.com/halseth/lnd`
* * `git fetch halseth mobile-rpcs`
* * `git checkout halseth/mobile-rpcs`
* Get and init gomobile: `go get golang.org/x/mobile/cmd/gomobile` and `gomobile init`
* Compile with `make android`
* Put Lndmobile.aar file inside android/lightninglnd
