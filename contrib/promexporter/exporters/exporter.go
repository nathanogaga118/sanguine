// Package exporters contains the exporters for the prometheus exporter.
package exporters

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	"github.com/ipfs/go-log"
	"github.com/synapsecns/sanguine/contrib/promexporter/config"
	"github.com/synapsecns/sanguine/core/ginhelper"
	"github.com/synapsecns/sanguine/core/metrics"
	"github.com/synapsecns/sanguine/core/metrics/instrumentation/httpcapture"
	omnirpcClient "github.com/synapsecns/sanguine/services/omnirpc/client"
	"golang.org/x/sync/errgroup"
)

var logger = log.Logger("proxy-logger")

// meterName is the name of the meter used by this package.
// TODO: figure out how to autoset

const meterName = "github.com/synapsecns/sanguine/contrib/promexporter/exporters"

// makeHTTPClient makes a tracing http client.
func makeHTTPClient(handler metrics.Handler) *http.Client {
	httpClient := new(http.Client)
	handler.ConfigureHTTPClient(httpClient)

	httpClient.Transport = httpcapture.NewCaptureTransport(httpClient.Transport, handler)

	return httpClient
}

type exporter struct {
	client        *http.Client
	metrics       metrics.Handler
	cfg           config.Config
	omnirpcClient omnirpcClient.RPCClient

	otelRecorder iOtelRecorder
}

// StartExporterServer starts the exporter server.
// nolint: cyclop
func StartExporterServer(ctx context.Context, handler metrics.Handler, cfg config.Config) error {
	// the main server serves metrics since this is only a prom exporter
	_ = os.Setenv(metrics.MetricsPortEnabledEnv, "false")

	router := ginhelper.New(logger)
	router.Use(handler.Gin()...)
	router.GET(metrics.MetricsPathDefault, gin.WrapH(handler.Handler()))

	var lc net.ListenConfig
	listener, err := lc.Listen(ctx, "tcp", fmt.Sprintf(":%d", cfg.Port))
	if err != nil {
		return fmt.Errorf("could not listen on port %d", cfg.Port)
	}

	// TODO: this can probably be removed
	g, _ := errgroup.WithContext(ctx)

	g.Go(func() error {
		//nolint: gosec
		// TODO: consider setting timeouts here:  https://ieftimov.com/posts/make-resilient-golang-net-http-servers-using-timeouts-deadlines-context-cancellation/
		err := http.Serve(listener, router)
		if err != nil {
			return fmt.Errorf("could not serve http: %w", err)
		}

		return nil
	})

	exp := exporter{
		client:        makeHTTPClient(handler),
		metrics:       handler,
		cfg:           cfg,
		omnirpcClient: omnirpcClient.NewOmnirpcClient(cfg.OmnirpcURL, handler, omnirpcClient.WithCaptureReqRes()),
		otelRecorder:  newOtelRecorder(handler),
	}

	g.Go(func() error {
		err := exp.recordMetrics(ctx)
		if err != nil {
			return fmt.Errorf("could not record metrics: %w", err)
		}

		return nil
	})

	if err := g.Wait(); err != nil {
		return fmt.Errorf("could not start exporter server: %w", err)
	}

	return nil
}

const defaultMetricsInterval = 10

func (e *exporter) recordMetrics(ctx context.Context) (err error) {
	ticker := time.NewTicker(defaultMetricsInterval * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return fmt.Errorf("could not record metrics: %w", ctx.Err())
		case <-ticker.C:
			err = e.collectMetrics(ctx)
			if err != nil {
				logger.Errorf("could not collect metrics: %v", err)
			}
		}
	}
}

// nolint: cyclop
func (e *exporter) collectMetrics(parentCtx context.Context) (err error) {
	var errs []error
	ctx, span := e.metrics.Tracer().Start(parentCtx, "CollectMetrics")

	defer func() {
		metrics.EndSpanWithErr(span, combineErrors(errs))
	}()

	g, ctx := errgroup.WithContext(parentCtx)
	g.Go(func() error {
		return e.fetchRelayerBalances(ctx, e.cfg.RFQAPIUrl)
	})
	g.Go(func() error {
		return e.getTokenBalancesStats(ctx)
	})
	for _, pending := range e.cfg.DFKPending {
		pending := pending
		g.Go(func() error {
			return e.stuckHeroCountStats(ctx, common.HexToAddress(pending.Owner), pending.ChainName)
		})
	}
	for _, gasCheck := range e.cfg.SubmitterChecks {
		gasCheck := gasCheck
		for _, chainID := range gasCheck.ChainIDs {
			chainID := chainID
			g.Go(func() error {
				if err := e.submitterStats(common.HexToAddress(gasCheck.Address), chainID, gasCheck.Name); err != nil {
					span.AddEvent("could not get submitter stats")
					return fmt.Errorf("could not get submitter stats: %w", err)
				}
				return nil
			})
		}
	}

	for chainID := range e.cfg.BridgeChecks {
		chainID := chainID
		for _, token := range e.cfg.VpriceCheckTokens {
			token := token
			g.Go(
				func() error {
					if err := e.vpriceStats(ctx, chainID, token); err != nil && !errors.Is(err, errPoolNotExist) {
						span.AddEvent("could not get vprice stats")
						return fmt.Errorf("could not get vprice stats: %w", err)
					}
					return nil
				},
			)
		}
	}

	if err := g.Wait(); err != nil {
		span.AddEvent("could not collect metrics")
		errs = append(errs, err)
	}

	if len(errs) > 0 {
		span.AddEvent("could not collect metrics")
		return fmt.Errorf("could not collect metrics: %w", combineErrors(errs))
	}

	return nil
}

func combineErrors(errs []error) error {
	if len(errs) == 0 {
		return nil
	}

	// collect all error messages
	var errMessages []string
	for _, err := range errs {
		errMessages = append(errMessages, err.Error())
	}

	// join them into a single string and return a new error
	return errors.New(strings.Join(errMessages, "; "))
}
