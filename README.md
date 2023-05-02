# Logpush for Elastic (cloud)

This Cloudflare Worker takes incoming Cloudflare Logpush events and pushes them to an Elastic HTTP endpoint using the `_bulk` API endpoint. [There are several ways how data can be ingested into Elastic](https://docs.elastic.co/integrations/cloudflare_logpush#), however, even the native Elastic _HTTP destination_ might not work in every situation. Workers to the rescue. 🔧

## Usage

1. clone this repo
2. edit `wrangler.toml` and replace the `elasticHost` with your own Elastic (Cloud) endpoint
3. install and deploy the Worker:

```shell
npm install
npm run deploy
```

The `wrangler.toml` config uses Workers Unbound to deploy this Worker, which has more resources in terms of available CPU time.

## Setup Logpush Job

Create a Logpush job, you need to replace your zone ID, API Key for Cloudflare, and also the API key for your Elastic endpoint. Finally, update the name of your Elastic Index or Stream where to send logs to.

Below is an example to set up a Logpush job. Please see the [API configuration docs](https://developers.cloudflare.com/logs/get-started/api-configuration/) to create a job which fits your needs. You might want to update the `max_upload_records` and/or `max_upload_bytes` fields as well in order to keep either the Worker requests low, or spend less CPU time per request.

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
            "RayID",
            "RequestHeaders",
            "ResponseHeaders",
            "WorkerStatus",
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
