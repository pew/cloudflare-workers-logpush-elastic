# Logpush for Elastic (cloud)

This Cloudflare Worker takes incoming Cloudflare Logpush events and pushes them to an Elastic HTTP endpoint using the `_bulk` API endpoint. [There are several ways how data can be ingested into Elastic](https://docs.elastic.co/integrations/cloudflare_logpush#), however, even the native Elastic _HTTP destination_ might not work in every situation. Workers to the rescue. 🔧

## usage

1. clone this repo
2. edit `wrangler.toml` and replace the `elasticHost` with your own elastic (cloud) endpoint
3. profit:

```shell
npm install
npm run deploy
```

## example logpush job

create a logpush job, you need to replace your zone id, api key for cloudflare, and also the api key for your elastic endpoint, aaaaand finally the name of your elastic index where to write files to.

```shell
ZONE_ID=foobar2342 # your cloudflare zone id
CF_EMAIL=you@example.com # cloudflare e-mail address
CF_API_KEY=abc123 # cloudflare api key
WORKERS_ENDPOINT=logpush-elastic.abracadabra.workers.dev # the domain whwere this worker is being hosted
ELASTIC_API_KEY=123abc # elastic api key in base64
ELASTIC_INDEX="search-http_logs" # elastic index name where to store the files

JSON_PAYLOAD=$(jq -n \
  --arg WORKERS_ENDPOINT "$WORKERS_ENDPOINT" \
  --arg ELASTIC_API_KEY "$ELASTIC_API_KEY" \
  --arg ELASTIC_INDEX "$ELASTIC_INDEX" \
  '{
    "name": "http-elastic",
    "output_options": {
        "field_names": [
            "CacheCacheStatus",
            "ClientASN",
            "ClientCountry",
            "ClientDeviceType",
            "ClientIP",
            "ClientRequestHost",
            "ClientRequestMethod",
            "ClientRequestPath",
            "ClientRequestProtocol",
            "ClientRequestReferer",
            "ClientRequestScheme",
            "ClientRequestSource",
            "ClientRequestURI",
            "ClientRequestUserAgent",
            "EdgeColoCode",
            "EdgeEndTimestamp",
            "EdgePathingSrc",
            "EdgePathingStatus",
            "EdgeRateLimitAction",
            "EdgeRateLimitID",
            "EdgeRequestHost",
            "EdgeResponseBodyBytes",
            "EdgeResponseBytes",
            "EdgeResponseCompressionRatio",
            "EdgeResponseContentType",
            "EdgeResponseStatus",
            "EdgeServerIP",
            "EdgeStartTimestamp",
            "EdgeTimeToFirstByteMs",
            "FirewallMatchesActions",
            "FirewallMatchesRuleIDs",
            "FirewallMatchesSources",
            "JA3Hash",
            "OriginDNSResponseTimeMs",
            "OriginIP",
            "OriginRequestHeaderSendDurationMs",
            "OriginResponseBytes",
            "OriginResponseDurationMs",
            "OriginResponseHTTPExpires",
            "OriginResponseHTTPLastModified",
            "OriginResponseHeaderReceiveDurationMs",
            "OriginResponseStatus",
            "OriginResponseTime",
            "OriginSSLProtocol",
            "OriginTCPHandshakeDurationMs",
            "OriginTLSHandshakeDurationMs",
            "ParentRayID",
            "RayID",
            "RequestHeaders",
            "ResponseHeaders",
            "SecurityLevel",
            "SmartRouteColoID",
            "UpperTierColoID",
            "WAFAction",
            "WAFFlags",
            "WAFMatchedVar",
            "WAFProfile",
            "WAFRuleID",
            "WAFRuleMessage",
            "WorkerStatus",
            "WorkerSubrequest",
            "ZoneName"
        ],
        "timestamp_format": "rfc3339"
    },
    "destination_conf": ("https://" + $WORKERS_ENDPOINT + "?header_Authorization=ApiKey%20" + $ELASTIC_API_KEY + "&stream=" + $ELASTIC_INDEX),
    "max_upload_bytes": 5000000,
    "max_upload_records": 1000,
    "dataset": "http_requests",
    "frequency": "high",
    "enabled": true
  }'
)

curl --location "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/logpush/jobs" \
--header "X-Auth-Email: $CF_EMAIL" \
--header "X-Auth-Key: $CF_API_KEY" \
--header "Content-Type: application/json" \
--data "$JSON_PAYLOAD"
```
