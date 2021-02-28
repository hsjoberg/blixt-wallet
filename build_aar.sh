go get golang.org/x/tools/go/packages
go get golang.org/x/tools/cmd/goimports
go get golang.org/x/mobile/cmd/gomobile
gomobile init
GO111MODULE=on go get github.com/golang/protobuf/protoc-gen-go@v1.3.2
GO111MODULE=on go get github.com/grpc-ecosystem/grpc-gateway/protoc-gen-grpc-gateway@v1.14.3
GO111MODULE=on go get github.com/grpc-ecosystem/grpc-gateway/protoc-gen-swagger@v1.14.3
GO111MODULE=on go get -u -v github.com/lightninglabs/falafel
go get -d github.com/lightningnetwork/lnd
cd $GOPATH/src/github.com/lightningnetwork/lnd
cd $GOPATH/src/github.com/lightningnetwork/lnd && git checkout v0.12.0-beta && sed -i 's/use_prefix="0"/use_prefix="1"/g' mobile/gen_bindings.sh && make android tags="routerrpc walletrpc signrpc invoicesrpc"
