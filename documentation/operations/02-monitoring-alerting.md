# Monitoring and Alerting

## Overview

This document defines the monitoring and alerting strategy, including SLIs, SLOs, alert definitions, and dashboard configurations.

## Service Level Objectives (SLOs)

### SLI/SLO Framework

| Service | SLI | SLO Target | Measurement Window | Error Budget |
|---------|-----|------------|-------------------|--------------|
| API Gateway | Request Success Rate | 99.9% | 30 days | 0.1% (43.2 min/month) |
| API Gateway | Request Latency (P95) | < 200ms | 30 days | - |
| API Gateway | Request Latency (P99) | < 500ms | 30 days | - |
| Auth Service | Authentication Success | 99.95% | 30 days | 0.05% (21.6 min/month) |
| Payment Service | Payment Processing | 99.99% | 30 days | 0.01% (4.32 min/month) |
| Database | Query Success Rate | 99.95% | 30 days | 0.05% |
| Database | Query Latency (P95) | < 50ms | 30 days | - |
| Message Queue | Message Delivery | 99.9% | 30 days | 0.1% |
| CDN | Asset Availability | 99.99% | 30 days | 0.01% |

### Error Budget Policy

```yaml
# Error budget consumption triggers progressive actions
100% - 80% remaining: Normal operations
80% - 50% remaining:  Warning alerts to team
50% - 20% remaining:  Freeze on risky changes
20% - 0% remaining:   All hands on deck, feature freeze
0% consumed:          Postmortem required, executive review
```

## Prometheus Metrics

### Golden Signals

#### 1. Latency

```promql
# Request duration histogram - P50, P95, P99
histogram_quantile(0.50,
  sum(rate(http_request_duration_seconds_bucket{job="api-service"}[5m])) by (le, method, route)
)

histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket{job="api-service"}[5m])) by (le, method, route)
)

histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket{job="api-service"}[5m])) by (le, method, route)
)

# Average latency by endpoint
avg(rate(http_request_duration_seconds_sum{job="api-service"}[5m])) by (route, method)
/
avg(rate(http_request_duration_seconds_count{job="api-service"}[5m])) by (route, method)

# Slow requests (> 1s) rate
sum(rate(http_request_duration_seconds_count{job="api-service",le="1.0"}[5m])) by (route)
-
sum(rate(http_request_duration_seconds_count{job="api-service"}[5m])) by (route)
```

#### 2. Traffic

```promql
# Requests per second
sum(rate(http_requests_total{job="api-service"}[5m])) by (method, route)

# Total throughput
sum(rate(http_requests_total{job="api-service"}[5m]))

# Traffic by status code
sum(rate(http_requests_total{job="api-service"}[5m])) by (status_code)

# Traffic growth rate
(
  sum(rate(http_requests_total{job="api-service"}[5m]))
  -
  sum(rate(http_requests_total{job="api-service"}[5m] offset 1h))
)
/
sum(rate(http_requests_total{job="api-service"}[5m] offset 1h))
* 100
```

#### 3. Errors

```promql
# Error rate (4xx and 5xx)
sum(rate(http_requests_total{job="api-service",status_code=~"4..|5.."}[5m]))
/
sum(rate(http_requests_total{job="api-service"}[5m]))
* 100

# 5xx error rate only
sum(rate(http_requests_total{job="api-service",status_code=~"5.."}[5m]))
/
sum(rate(http_requests_total{job="api-service"}[5m]))
* 100

# Error rate by endpoint
sum(rate(http_requests_total{job="api-service",status_code=~"5.."}[5m])) by (route, method)
/
sum(rate(http_requests_total{job="api-service"}[5m])) by (route, method)
* 100

# Error count spike detection
(
  sum(rate(http_requests_total{job="api-service",status_code=~"5.."}[5m]))
  /
  sum(rate(http_requests_total{job="api-service",status_code=~"5.."}[5m] offset 1h))
) > 2
```

#### 4. Saturation

```promql
# CPU utilization
100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

# Memory utilization
(
  node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes
)
/
node_memory_MemTotal_bytes
* 100

# Disk utilization
(
  node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_avail_bytes{mountpoint="/"}
)
/
node_filesystem_size_bytes{mountpoint="/"}
* 100

# Network saturation
rate(node_network_receive_bytes_total[5m]) / node_network_speed_bytes

# Database connection pool utilization
pg_stat_database_numbackends / pg_settings_max_connections * 100
```

### Application-Specific Metrics

#### Database Queries

```promql
# Query duration P95
histogram_quantile(0.95,
  sum(rate(db_query_duration_seconds_bucket{job="api-service"}[5m])) by (le, query_type)
)

# Slow query count
sum(rate(db_query_duration_seconds_count{job="api-service",le="0.1"}[5m]))
-
sum(rate(db_query_duration_seconds_count{job="api-service"}[5m]))

# Query error rate
sum(rate(db_query_errors_total{job="api-service"}[5m])) by (error_type)

# Active connections
sum(db_connections_active{job="api-service"}) by (state)

# Connection pool wait time
histogram_quantile(0.95,
  sum(rate(db_connection_wait_duration_seconds_bucket[5m])) by (le)
)
```

#### Cache Performance

```promql
# Cache hit rate
sum(rate(cache_requests_total{job="api-service",result="hit"}[5m]))
/
sum(rate(cache_requests_total{job="api-service"}[5m]))
* 100

# Cache miss rate
sum(rate(cache_requests_total{job="api-service",result="miss"}[5m]))
/
sum(rate(cache_requests_total{job="api-service"}[5m]))
* 100

# Cache operation latency
histogram_quantile(0.95,
  sum(rate(cache_operation_duration_seconds_bucket[5m])) by (le, operation)
)

# Cache eviction rate
rate(cache_evictions_total[5m])

# Cache memory usage
cache_memory_bytes / cache_memory_limit_bytes * 100
```

#### Message Queue

```promql
# Queue depth
rabbitmq_queue_messages{queue="orders"}

# Message processing rate
rate(rabbitmq_queue_messages_delivered_total{queue="orders"}[5m])

# Message publish rate
rate(rabbitmq_queue_messages_published_total{queue="orders"}[5m])

# Consumer lag
rabbitmq_queue_messages{queue="orders"}
/
rate(rabbitmq_queue_messages_delivered_total{queue="orders"}[5m])

# Dead letter queue depth
rabbitmq_queue_messages{queue="orders_dlq"}

# Message processing duration
histogram_quantile(0.95,
  sum(rate(message_processing_duration_seconds_bucket[5m])) by (le, queue)
)
```

#### Business Metrics

```promql
# Order completion rate
sum(rate(orders_completed_total[5m]))
/
sum(rate(orders_created_total[5m]))
* 100

# Revenue per minute
sum(rate(order_value_total[1m]))

# Active users
sum(users_active) by (tier)

# Conversion rate
sum(rate(conversions_total[5m]))
/
sum(rate(page_views_total{page="/checkout"}[5m]))
* 100

# Cart abandonment rate
(
  sum(rate(carts_created_total[5m]))
  -
  sum(rate(orders_completed_total[5m]))
)
/
sum(rate(carts_created_total[5m]))
* 100
```

## Alert Rules

### Critical Alerts (Page Immediately)

```yaml
# prometheus/rules/critical.yml
groups:
- name: critical_alerts
  interval: 30s
  rules:

  # High error rate
  - alert: HighErrorRate
    expr: |
      (
        sum(rate(http_requests_total{status_code=~"5.."}[5m]))
        /
        sum(rate(http_requests_total[5m]))
      ) > 0.05
    for: 2m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High error rate detected"
      description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
      runbook: "https://wiki.company.com/runbooks/high-error-rate"
      dashboard: "https://grafana.company.com/d/api-overview"

  # Service down
  - alert: ServiceDown
    expr: up{job="api-service"} == 0
    for: 1m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "Service {{ $labels.instance }} is down"
      description: "Service has been down for more than 1 minute"
      runbook: "https://wiki.company.com/runbooks/service-down"

  # Database connection failure
  - alert: DatabaseConnectionFailure
    expr: |
      sum(rate(db_connection_errors_total[5m])) by (database)
      > 10
    for: 2m
    labels:
      severity: critical
      team: database
    annotations:
      summary: "Database connection failures on {{ $labels.database }}"
      description: "{{ $value }} connection errors per second"
      runbook: "https://wiki.company.com/runbooks/db-connection-failure"

  # High latency
  - alert: HighLatency
    expr: |
      histogram_quantile(0.95,
        sum(rate(http_request_duration_seconds_bucket{job="api-service"}[5m])) by (le, route)
      ) > 1
    for: 5m
    labels:
      severity: critical
      team: platform
    annotations:
      summary: "High latency on {{ $labels.route }}"
      description: "P95 latency is {{ $value }}s (threshold: 1s)"
      runbook: "https://wiki.company.com/runbooks/high-latency"

  # Disk space critical
  - alert: DiskSpaceCritical
    expr: |
      (
        node_filesystem_avail_bytes{mountpoint="/"}
        /
        node_filesystem_size_bytes{mountpoint="/"}
      ) < 0.1
    for: 5m
    labels:
      severity: critical
      team: infrastructure
    annotations:
      summary: "Critical disk space on {{ $labels.instance }}"
      description: "Only {{ $value | humanizePercentage }} disk space remaining"
      runbook: "https://wiki.company.com/runbooks/disk-space"

  # Memory pressure
  - alert: MemoryPressure
    expr: |
      (
        node_memory_MemAvailable_bytes
        /
        node_memory_MemTotal_bytes
      ) < 0.1
    for: 5m
    labels:
      severity: critical
      team: infrastructure
    annotations:
      summary: "Memory pressure on {{ $labels.instance }}"
      description: "Only {{ $value | humanizePercentage }} memory available"
      runbook: "https://wiki.company.com/runbooks/memory-pressure"
```

### Warning Alerts (Notify Team)

```yaml
# prometheus/rules/warnings.yml
groups:
- name: warning_alerts
  interval: 1m
  rules:

  # Elevated error rate
  - alert: ElevatedErrorRate
    expr: |
      (
        sum(rate(http_requests_total{status_code=~"5.."}[5m]))
        /
        sum(rate(http_requests_total[5m]))
      ) > 0.01
    for: 5m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "Elevated error rate"
      description: "Error rate is {{ $value | humanizePercentage }} (threshold: 1%)"

  # High cache miss rate
  - alert: HighCacheMissRate
    expr: |
      (
        sum(rate(cache_requests_total{result="miss"}[5m]))
        /
        sum(rate(cache_requests_total[5m]))
      ) > 0.3
    for: 10m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "High cache miss rate"
      description: "Cache miss rate is {{ $value | humanizePercentage }}"

  # Queue depth growing
  - alert: QueueDepthGrowing
    expr: |
      deriv(rabbitmq_queue_messages{queue="orders"}[10m]) > 10
    for: 5m
    labels:
      severity: warning
      team: platform
    annotations:
      summary: "Queue {{ $labels.queue }} depth growing"
      description: "Queue depth increasing at {{ $value }} messages/second"

  # Disk space warning
  - alert: DiskSpaceWarning
    expr: |
      (
        node_filesystem_avail_bytes{mountpoint="/"}
        /
        node_filesystem_size_bytes{mountpoint="/"}
      ) < 0.2
    for: 10m
    labels:
      severity: warning
      team: infrastructure
    annotations:
      summary: "Low disk space on {{ $labels.instance }}"
      description: "Only {{ $value | humanizePercentage }} disk space remaining"

  # SSL certificate expiring
  - alert: SSLCertificateExpiring
    expr: |
      (ssl_certificate_expiry_seconds - time()) / 86400 < 30
    for: 1h
    labels:
      severity: warning
      team: infrastructure
    annotations:
      summary: "SSL certificate expiring soon"
      description: "Certificate {{ $labels.cn }} expires in {{ $value }} days"
```

### SLO Alerts

```yaml
# prometheus/rules/slo.yml
groups:
- name: slo_alerts
  interval: 30s
  rules:

  # API availability SLO
  - alert: APIAvailabilitySLOBreach
    expr: |
      (
        sum(rate(http_requests_total{status_code!~"5.."}[30d]))
        /
        sum(rate(http_requests_total[30d]))
      ) < 0.999
    for: 5m
    labels:
      severity: critical
      team: platform
      slo: availability
    annotations:
      summary: "API availability SLO breach"
      description: "30-day availability is {{ $value | humanizePercentage }} (SLO: 99.9%)"
      error_budget: "{{ 1 - $value | humanizePercentage }}"

  # Error budget burn rate (fast)
  - alert: ErrorBudgetBurnRateFast
    expr: |
      (
        sum(rate(http_requests_total{status_code=~"5.."}[1h]))
        /
        sum(rate(http_requests_total[1h]))
      ) > (14.4 * 0.001)  # 14.4x burn rate
    for: 5m
    labels:
      severity: critical
      team: platform
      slo: error_budget
    annotations:
      summary: "Fast error budget burn detected"
      description: "Error budget will be exhausted in 2 hours at current rate"

  # Error budget burn rate (slow)
  - alert: ErrorBudgetBurnRateSlow
    expr: |
      (
        sum(rate(http_requests_total{status_code=~"5.."}[6h]))
        /
        sum(rate(http_requests_total[6h]))
      ) > (3 * 0.001)  # 3x burn rate
    for: 30m
    labels:
      severity: warning
      team: platform
      slo: error_budget
    annotations:
      summary: "Slow error budget burn detected"
      description: "Error budget will be exhausted in 10 hours at current rate"
```

## Grafana Dashboards

### API Overview Dashboard

```json
{
  "dashboard": {
    "title": "API Service Overview",
    "tags": ["api", "overview"],
    "timezone": "browser",
    "refresh": "30s",
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "graph",
        "gridPos": { "x": 0, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"api-service\"}[5m])) by (method)",
            "legendFormat": "{{method}}",
            "refId": "A"
          }
        ],
        "yaxes": [
          { "format": "reqps", "label": "Requests/sec" },
          { "format": "short" }
        ]
      },
      {
        "id": 2,
        "title": "Error Rate",
        "type": "graph",
        "gridPos": { "x": 12, "y": 0, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"api-service\",status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"api-service\"}[5m])) * 100",
            "legendFormat": "Error Rate %",
            "refId": "A"
          }
        ],
        "thresholds": [
          { "value": 1, "color": "yellow" },
          { "value": 5, "color": "red" }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": { "type": "gt", "params": [5] },
              "query": { "params": ["A", "5m", "now"] }
            }
          ]
        }
      },
      {
        "id": 3,
        "title": "Response Time (P95)",
        "type": "graph",
        "gridPos": { "x": 0, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job=\"api-service\"}[5m])) by (le, route))",
            "legendFormat": "{{route}}",
            "refId": "A"
          }
        ],
        "yaxes": [
          { "format": "s", "label": "Duration" },
          { "format": "short" }
        ]
      },
      {
        "id": 4,
        "title": "Status Code Distribution",
        "type": "piechart",
        "gridPos": { "x": 12, "y": 8, "w": 12, "h": 8 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"api-service\"}[5m])) by (status_code)",
            "legendFormat": "{{status_code}}",
            "refId": "A"
          }
        ]
      },
      {
        "id": 5,
        "title": "Top 10 Slowest Endpoints",
        "type": "table",
        "gridPos": { "x": 0, "y": 16, "w": 24, "h": 8 },
        "targets": [
          {
            "expr": "topk(10, avg(rate(http_request_duration_seconds_sum{job=\"api-service\"}[5m])) by (route, method) / avg(rate(http_request_duration_seconds_count{job=\"api-service\"}[5m])) by (route, method))",
            "format": "table",
            "refId": "A"
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {},
              "indexByName": {},
              "renameByName": {
                "route": "Endpoint",
                "method": "Method",
                "Value": "Avg Duration (s)"
              }
            }
          }
        ]
      }
    ]
  }
}
```

### SLO Dashboard

```json
{
  "dashboard": {
    "title": "SLO Dashboard",
    "tags": ["slo", "reliability"],
    "panels": [
      {
        "id": 1,
        "title": "Availability SLO (30 days)",
        "type": "stat",
        "gridPos": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code!~\"5..\"}[30d])) / sum(rate(http_requests_total[30d])) * 100",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 99.9, "color": "yellow" },
                { "value": 99.95, "color": "green" }
              ]
            },
            "unit": "percent",
            "decimals": 3
          }
        },
        "options": {
          "reduceOptions": {
            "values": false,
            "calcs": ["lastNotNull"]
          },
          "text": {
            "titleSize": 18,
            "valueSize": 40
          },
          "colorMode": "background"
        }
      },
      {
        "id": 2,
        "title": "Error Budget Remaining",
        "type": "gauge",
        "gridPos": { "x": 6, "y": 0, "w": 6, "h": 4 },
        "targets": [
          {
            "expr": "(0.001 - (sum(rate(http_requests_total{status_code=~\"5..\"}[30d])) / sum(rate(http_requests_total[30d])))) / 0.001 * 100",
            "refId": "A"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "percentage",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 20, "color": "orange" },
                { "value": 50, "color": "yellow" },
                { "value": 80, "color": "green" }
              ]
            },
            "unit": "percent",
            "max": 100,
            "min": 0
          }
        }
      },
      {
        "id": 3,
        "title": "Error Budget Burn Rate (1h)",
        "type": "graph",
        "gridPos": { "x": 0, "y": 4, "w": 24, "h": 8 },
        "targets": [
          {
            "expr": "(sum(rate(http_requests_total{status_code=~\"5..\"}[1h])) / sum(rate(http_requests_total[1h]))) / 0.001",
            "legendFormat": "Burn Rate (1x = normal)",
            "refId": "A"
          }
        ],
        "yaxes": [
          { "format": "short", "label": "Burn Rate Multiplier" },
          { "format": "short" }
        ],
        "thresholds": [
          { "value": 1, "color": "green" },
          { "value": 3, "color": "yellow" },
          { "value": 10, "color": "red" }
        ]
      }
    ]
  }
}
```

## Alert Routing

### AlertManager Configuration

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

route:
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'default'
  routes:

  # Critical alerts page immediately
  - match:
      severity: critical
    receiver: 'pagerduty-critical'
    continue: true

  - match:
      severity: critical
    receiver: 'slack-critical'

  # Warning alerts notify team
  - match:
      severity: warning
    receiver: 'slack-warnings'

  # Team-specific routing
  - match:
      team: platform
    receiver: 'slack-platform'

  - match:
      team: database
    receiver: 'slack-database'

receivers:
- name: 'default'
  slack_configs:
  - channel: '#alerts'
    title: 'Alert: {{ .GroupLabels.alertname }}'
    text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: 'pagerduty-critical'
  pagerduty_configs:
  - service_key: 'YOUR_PAGERDUTY_KEY'
    description: '{{ .GroupLabels.alertname }}'
    details:
      firing: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

- name: 'slack-critical'
  slack_configs:
  - channel: '#critical-alerts'
    color: 'danger'
    title: 'CRITICAL: {{ .GroupLabels.alertname }}'
    text: |
      {{ range .Alerts }}
      *Summary:* {{ .Annotations.summary }}
      *Description:* {{ .Annotations.description }}
      *Runbook:* {{ .Annotations.runbook }}
      *Dashboard:* {{ .Annotations.dashboard }}
      {{ end }}

- name: 'slack-warnings'
  slack_configs:
  - channel: '#warnings'
    color: 'warning'
    title: 'Warning: {{ .GroupLabels.alertname }}'

- name: 'slack-platform'
  slack_configs:
  - channel: '#platform-team'

- name: 'slack-database'
  slack_configs:
  - channel: '#database-team'
```

## On-Call Runbook Integration

Each alert includes:
- `runbook`: Link to troubleshooting steps
- `dashboard`: Link to relevant Grafana dashboard
- `summary`: Brief description of the issue
- `description`: Detailed context with current values

Example alert annotation:
```yaml
annotations:
  summary: "High error rate detected"
  description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
  runbook: "https://wiki.company.com/runbooks/high-error-rate"
  dashboard: "https://grafana.company.com/d/api-overview"
```

## Summary

This monitoring and alerting system provides:

- **Comprehensive metrics** covering golden signals and business KPIs
- **SLO-based alerting** with error budget tracking
- **Multi-tier alerts** (critical, warning) with appropriate routing
- **Rich dashboards** for visualization and investigation
- **Runbook integration** for efficient incident response
- **Team-based routing** to the right responders
