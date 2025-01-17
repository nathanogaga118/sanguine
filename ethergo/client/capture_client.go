package client

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/ethereum/go-ethereum/rpc"
	"github.com/lmittmann/w3"
	"github.com/synapsecns/sanguine/core/metrics"
	"github.com/synapsecns/sanguine/core/metrics/instrumentation/httpcapture"
)

// captureClient is a wrapper around ethclient that can (but doesn't have to) captures requests and responses.
type captureClient struct {
	ethClient *ethclient.Client
	w3Client  *w3.Client
	rpcClient *rpc.Client
}

var defaultTimeout = 30 * time.Second

func newCaptureClient(ctx context.Context, url string, handler metrics.Handler, capture bool) (*captureClient, error) {
	client := new(http.Client)
	client.Timeout = defaultTimeout

	if capture {
		client.Transport = httpcapture.NewCaptureTransport(client.Transport, handler)
	}
	c, err := metrics.RPCClient(ctx, handler, url, client)
	if err != nil {
		return nil, fmt.Errorf("failed to create rpc client: %w", err)
	}
	// capture config goes here

	ethClient := ethclient.NewClient(c)
	w3Client := w3.NewClient(c)

	return &captureClient{
		ethClient: ethClient,
		w3Client:  w3Client,
		rpcClient: c,
	}, nil
}
