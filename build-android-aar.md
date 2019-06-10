* Get lnd: `go get -d github.com/lightningnetwork/lnd`
* Get gomobile: `go get golang.org/x/mobile/cmd/gomobile`
* Create blixt.go with this as content:
```Go
package lnd

import (
  "fmt"
  "os"
  "strings"

  "github.com/lightningnetwork/lnd/channeldb"
  "github.com/lightningnetwork/lnd/signal"
)

var (
   channelDB              *channeldb.DB
   shutdownSuccessChannel = make(chan bool, 1)
)

func Start(extraArgs string) string {
  os.Args = append(os.Args, strings.Fields(extraArgs)...)

  if err := Main(); err != nil {
    fmt.Fprintln(os.Stderr, err)
    return err.Error()
  }

  return ""
}

func Stop() {
  signal.RequestShutdown()
}
```
* Compile with `gomobile bind -target=android -tags="android" -o blixtlnd.aar .`
* Put blixtlnd.aar file inside android/blixtlnd/
