# Kafka Topics Design

## Executive Summary

This document outlines the comprehensive Kafka topic architecture, including topic design patterns, partitioning strategies, retention policies, consumer group configurations, and best practices for high-throughput event-driven architecture.

## Table of Contents

1. [Kafka Cluster Architecture](#kafka-cluster-architecture)
2. [Topic Design Patterns](#topic-design-patterns)
3. [Topic Configurations](#topic-configurations)
4. [Partitioning Strategy](#partitioning-strategy)
5. [Consumer Groups](#consumer-groups)
6. [Schema Management](#schema-management)
7. [Monitoring and Operations](#monitoring-and-operations)
8. [Disaster Recovery](#disaster-recovery)

---

## Kafka Cluster Architecture

### Strimzi (Kafka on GKE) Configuration

**Strategy**: Self-hosted Apache Kafka using Strimzi operator on Google Kubernetes Engine (GKE) for cost efficiency (~70% savings vs Confluent Cloud) with no vendor lock-in.

#### Install Strimzi Operator

```bash
# Install Strimzi operator via Helm
helm repo add strimzi https://strimzi.io/charts/
helm repo update

helm install strimzi-kafka-operator strimzi/strimzi-kafka-operator \
  --namespace kafka \
  --create-namespace \
  --set watchNamespaces="{kafka}" \
  --version 0.39.0
```

#### Kafka Cluster Custom Resource

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: Kafka
metadata:
  name: production-kafka
  namespace: kafka
spec:
  kafka:
    version: 3.6.0
    replicas: 6 # 3 brokers per zone, 2 zones minimum

    listeners:
      - name: plain
        port: 9092
        type: internal
        tls: false
      - name: tls
        port: 9093
        type: internal
        tls: true
        authentication:
          type: tls

    config:
      # Broker settings
      num.network.threads: 8
      num.io.threads: 16
      socket.send.buffer.bytes: 1048576
      socket.receive.buffer.bytes: 1048576
      socket.request.max.bytes: 104857600

      # Log settings
      log.retention.hours: 168 # 7 days
      log.segment.bytes: 1073741824 # 1GB
      log.retention.check.interval.ms: 300000

      # Replication settings
      default.replication.factor: 3
      min.insync.replicas: 2
      replica.lag.time.max.ms: 30000
      num.replica.fetchers: 4

      # Leader election
      unclean.leader.election.enable: false
      auto.leader.rebalance.enable: true
      leader.imbalance.check.interval.seconds: 300

      # Compression
      compression.type: lz4

      # Consumer group settings
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2

      # Partition settings
      num.partitions: 12
      auto.create.topics.enable: false

      # Performance tuning
      message.max.bytes: 10485760 # 10MB
      replica.fetch.max.bytes: 10485760
      fetch.message.max.bytes: 10485760

      # Connection limits
      max.connections.per.ip: 1000

    storage:
      type: persistent-claim
      size: 1000Gi # 1TB per broker
      class: pd-ssd # GCP Persistent Disk SSD
      deleteClaim: false

    resources:
      requests:
        memory: 8Gi
        cpu: "4"
      limits:
        memory: 16Gi
        cpu: "8"

    jvmOptions:
      -Xms: 4096m
      -Xmx: 8192m

    # Rack awareness for zone distribution
    rack:
      topologyKey: topology.kubernetes.io/zone

    # Metrics for Prometheus
    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: kafka-metrics-config.yml

  zookeeper:
    replicas: 3 # Odd number for quorum

    storage:
      type: persistent-claim
      size: 100Gi
      class: pd-ssd
      deleteClaim: false

    resources:
      requests:
        memory: 2Gi
        cpu: "1"
      limits:
        memory: 4Gi
        cpu: "2"

    jvmOptions:
      -Xms: 1024m
      -Xmx: 2048m

    metricsConfig:
      type: jmxPrometheusExporter
      valueFrom:
        configMapKeyRef:
          name: kafka-metrics
          key: zookeeper-metrics-config.yml

  entityOperator:
    topicOperator:
      resources:
        requests:
          memory: 512Mi
          cpu: "0.5"
        limits:
          memory: 1Gi
          cpu: "1"

    userOperator:
      resources:
        requests:
          memory: 512Mi
          cpu: "0.5"
        limits:
          memory: 1Gi
          cpu: "1"

  kafkaExporter:
    topicRegex: ".*"
    groupRegex: ".*"
```

#### Prometheus Metrics ConfigMap

```yaml
# kafka-metrics-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-metrics
  namespace: kafka
data:
  kafka-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
    - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), topic=(.+), partition=(.*)><>Value
      name: kafka_server_$1_$2
      type: GAUGE
      labels:
       clientId: "$3"
       topic: "$4"
       partition: "$5"
    - pattern: kafka.server<type=(.+), name=(.+), clientId=(.+), brokerHost=(.+), brokerPort=(.+)><>Value
      name: kafka_server_$1_$2
      type: GAUGE
      labels:
       clientId: "$3"
       broker: "$4:$5"

  zookeeper-metrics-config.yml: |
    lowercaseOutputName: true
    rules:
    - pattern: "org.apache.ZooKeeperService<name0=ReplicatedServer_id(\\d+)><>(\\w+)"
      name: "zookeeper_$2"
      type: GAUGE
```

#### Logging to Google Cloud Logging

```yaml
# kafka-logging.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-logging
  namespace: kafka
data:
  log4j.properties: |
    log4j.rootLogger=INFO, CONSOLE, GCS

    # Console appender
    log4j.appender.CONSOLE=org.apache.log4j.ConsoleAppender
    log4j.appender.CONSOLE.layout=org.apache.log4j.PatternLayout
    log4j.appender.CONSOLE.layout.ConversionPattern=%d{ISO8601} %p %c: %m%n

    # Cloud Logging appender (via fluentd sidecar)
    log4j.appender.GCS=org.apache.log4j.FileAppender
    log4j.appender.GCS.File=/var/log/kafka/server.log
    log4j.appender.GCS.layout=org.apache.log4j.PatternLayout
    log4j.appender.GCS.layout.ConversionPattern=%d{ISO8601} %p %c: %m%n
```

#### GCS Bucket for Kafka Logs (Optional)

```hcl
# terraform/modules/kafka/gcs-logs.tf
resource "google_storage_bucket" "kafka_logs" {
  name          = "${var.project_id}-${var.environment}-kafka-logs"
  location      = var.region
  storage_class = "STANDARD"
  force_destroy = false

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access {
    enabled = true
  }

  labels = {
    environment = var.environment
    component   = "kafka"
  }
}
```

### Kafka Connect Configuration (Strimzi on GKE)

```yaml
# Strimzi KafkaConnect cluster with Debezium
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnect
metadata:
  name: debezium-connect-cluster
  namespace: kafka
  annotations:
    strimzi.io/use-connector-resources: "true"
spec:
  version: 3.6.0
  replicas: 3
  bootstrapServers: production-kafka-bootstrap:9092

  config:
    group.id: debezium-connect-cluster
    offset.storage.topic: connect-cluster-offsets
    config.storage.topic: connect-cluster-configs
    status.storage.topic: connect-cluster-status
    config.storage.replication.factor: 3
    offset.storage.replication.factor: 3
    status.storage.replication.factor: 3

  build:
    output:
      type: docker
      image: europe-west1-docker.pkg.dev/PROJECT_ID/kafka-connect/debezium-connect:latest
    plugins:
      - name: debezium-postgres-connector
        artifacts:
          - type: tgz
            url: https://repo1.maven.org/maven2/io/debezium/debezium-connector-postgres/2.4.0.Final/debezium-connector-postgres-2.4.0.Final-plugin.tar.gz
            sha512sum: <checksum>

  resources:
    requests:
      memory: 2Gi
      cpu: 1000m
    limits:
      memory: 4Gi
      cpu: 2000m

---
# Debezium PostgreSQL CDC connector
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaConnector
metadata:
  name: postgres-cdc-connector
  namespace: kafka
  labels:
    strimzi.io/cluster: debezium-connect-cluster
spec:
  class: io.debezium.connector.postgresql.PostgresConnector
  tasksMax: 4

  config:
    database.hostname: "{{ .Values.database.host }}"
    database.port: "5432"
    database.user: "{{ .Values.database.user }}"
    database.password: "{{ .Values.database.password }}"
    database.dbname: "{{ .Values.database.name }}"
    database.server.name: "production-postgres"

    table.include.list: "app.tasks,app.projects,app.organizations"
    plugin.name: "pgoutput"
    slot.name: "debezium_slot"
    publication.name: "debezium_publication"
    topic.prefix: "cdc"
    schema.include.list: "app"

    time.precision.mode: "adaptive"
    decimal.handling.mode: "precise"
    include.schema.changes: "false"

    # Transform to route to simplified topic names
    transforms: "route"
    transforms.route.type: "org.apache.kafka.connect.transforms.RegexRouter"
    transforms.route.regex: "([^.]+)\\.([^.]+)\\.([^.]+)"
    transforms.route.replacement: "$3-changes"
```

---

## Topic Design Patterns

### Core Event Topics

```yaml
# kafka-topics.yaml - Topic Definitions

topics:
  # User Events
  - name: user.events
    description: User lifecycle events (created, updated, deleted)
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000     # 1 day
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 1048576  # 1 MB

  - name: user.login.events
    description: User login/logout events
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Organization Events
  - name: organization.events
    description: Organization lifecycle events
    partitions: 6
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Project Events
  - name: project.events
    description: Project lifecycle events
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Task Events (High Volume)
  - name: task.events
    description: Task lifecycle events (created, updated, completed)
    partitions: 48
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 3600000      # 1 hour
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 2097152  # 2 MB

  - name: task.comments
    description: Task comment events
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Analytics Events (Very High Volume)
  - name: analytics.events
    description: User interaction and analytics events
    partitions: 96
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 259200000   # 3 days
    segment_ms: 3600000       # 1 hour
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 524288  # 512 KB

  - name: analytics.page_views
    description: Page view tracking events
    partitions: 96
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 259200000   # 3 days
    segment_ms: 3600000
    compression_type: lz4
    cleanup_policy: delete

  # Notification Events
  - name: notifications.email
    description: Email notification requests
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: notifications.push
    description: Push notification requests
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 259200000  # 3 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: notifications.in_app
    description: In-app notification events
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Change Data Capture (CDC) Topics
  - name: cdc.tasks-changes
    description: PostgreSQL tasks table changes (Debezium)
    partitions: 48
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 3600000
    compression_type: lz4
    cleanup_policy: delete

  - name: cdc.projects-changes
    description: PostgreSQL projects table changes
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 3600000
    compression_type: lz4
    cleanup_policy: delete

  # Audit Log Events
  - name: audit.events
    description: Audit log events (immutable)
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 7776000000  # 90 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete
    configs:
      min_compaction_lag_ms: 86400000

  # Dead Letter Queue
  - name: dlq.processing_errors
    description: Failed message processing events
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # System Health
  - name: system.health_checks
    description: System health check results
    partitions: 6
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Compacted Topics (State Stores)
  - name: user.profile.snapshots
    description: Latest user profile state
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: -1  # Infinite retention
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: compact
    configs:
      min_compaction_lag_ms: 3600000    # 1 hour
      delete_retention_ms: 86400000     # 1 day
      segment_ms: 86400000              # 1 day
      min_cleanable_dirty_ratio: 0.5

  - name: task.state.snapshots
    description: Latest task state snapshots
    partitions: 48
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: -1
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: compact
    configs:
      min_compaction_lag_ms: 3600000
      delete_retention_ms: 86400000
      min_cleanable_dirty_ratio: 0.5

  # =====================================================================
  # SALES INTEGRATION TOPICS (Multi-Sales-System Architecture)
  # =====================================================================

  # Pyxis Sales System Integration
  - name: sales.pyxis.order.created
    description: Incoming service orders from Pyxis sales system
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 2097152  # 2 MB (product configurations can be large)

  - name: sales.pyxis.order.updated
    description: Order updates from Pyxis (modifications, cancellations)
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: sales.pyxis.order.cancelled
    description: Order cancellation events from Pyxis
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Tempo Sales System Integration
  - name: sales.tempo.service.requested
    description: Incoming service requests from Tempo sales system
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 2097152  # 2 MB

  - name: sales.tempo.service.updated
    description: Service request updates from Tempo
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: sales.tempo.service.cancelled
    description: Service cancellation events from Tempo
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # SAP Sales System Integration (Future)
  - name: sales.sap.order.created
    description: Incoming enterprise orders from SAP sales system
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete
    configs:
      max_message_bytes: 5242880  # 5 MB (SAP orders can be very large)

  # Generic Sales Channel Events (Multi-Channel Support)
  - name: sales.channel.store.order
    description: Orders from physical store channel (all sales systems)
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: sales.channel.web.order
    description: Orders from web channel (all sales systems)
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: sales.channel.callcenter.order
    description: Orders from call center channel (all sales systems)
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # FSM → Sales System Output Topics
  - name: fsm.order.status_updated
    description: Service order status updates sent back to sales systems
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: fsm.order.assigned
    description: Assignment confirmations sent to sales systems
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: fsm.order.scheduled
    description: Scheduling confirmations with date/time sent to sales systems
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: fsm.order.completed
    description: Service completion confirmations sent to sales systems
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: fsm.tv.outcome_recorded
    description: Technical Visit outcomes sent to sales systems
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: fsm.tv.modifications_required
    description: Scope modification requests from TV sent to sales systems
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  # Sales Integration Internal Events
  - name: integration.sales.order.received
    description: Internal event when sales order is received (any system)
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: integration.sales.order.normalized
    description: Internal event when sales order is successfully normalized to FSM model
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: integration.sales.order.failed
    description: Internal event when sales order normalization/processing fails
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days (keep failures longer for analysis)
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: integration.sales.status.sent
    description: Internal event when status update is sent to sales system
    partitions: 24
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 604800000  # 7 days
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete

  - name: integration.sales.status.failed
    description: Internal event when status update send fails
    partitions: 12
    replication_factor: 3
    min_insync_replicas: 2
    retention_ms: 2592000000  # 30 days (keep failures longer)
    segment_ms: 86400000
    compression_type: lz4
    cleanup_policy: delete
```

### Topic Creation Script

```bash
#!/bin/bash
# create-kafka-topics.sh

set -e

KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"
KAFKA_CONFIG_RETENTION_MS="${KAFKA_CONFIG_RETENTION_MS:-604800000}"

# Function to create topic
create_topic() {
    local topic_name=$1
    local partitions=$2
    local replication_factor=$3
    local retention_ms=$4
    local compression=$5
    local cleanup_policy=$6
    local extra_configs=$7

    echo "Creating topic: $topic_name"

    kafka-topics.sh --create \
        --bootstrap-server $KAFKA_BOOTSTRAP_SERVERS \
        --topic $topic_name \
        --partitions $partitions \
        --replication-factor $replication_factor \
        --config retention.ms=$retention_ms \
        --config compression.type=$compression \
        --config cleanup.policy=$cleanup_policy \
        $extra_configs \
        --if-not-exists

    echo "Topic $topic_name created successfully"
}

# User Events
create_topic "user.events" 12 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "user.login.events" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Organization Events
create_topic "organization.events" 6 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Project Events
create_topic "project.events" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Task Events
create_topic "task.events" 48 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=3600000 --config max.message.bytes=2097152"

create_topic "task.comments" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Analytics Events
create_topic "analytics.events" 96 3 259200000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=3600000 --config max.message.bytes=524288"

create_topic "analytics.page_views" 96 3 259200000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=3600000"

# Notifications
create_topic "notifications.email" 12 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "notifications.push" 24 3 259200000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "notifications.in_app" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# CDC Topics
create_topic "cdc.tasks-changes" 48 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=3600000"

create_topic "cdc.projects-changes" 12 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=3600000"

# Audit
create_topic "audit.events" 24 3 7776000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# DLQ
create_topic "dlq.processing_errors" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# System Health
create_topic "system.health_checks" 6 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Compacted Topics
create_topic "user.profile.snapshots" 12 3 -1 "lz4" "compact" \
    "--config min.insync.replicas=2 --config segment.ms=86400000 --config min.compaction.lag.ms=3600000 --config delete.retention.ms=86400000"

create_topic "task.state.snapshots" 48 3 -1 "lz4" "compact" \
    "--config min.insync.replicas=2 --config segment.ms=86400000 --config min.compaction.lag.ms=3600000 --config delete.retention.ms=86400000"

# =====================================================================
# SALES INTEGRATION TOPICS (Multi-Sales-System Architecture)
# =====================================================================

# Pyxis Sales System Integration
create_topic "sales.pyxis.order.created" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000 --config max.message.bytes=2097152"

create_topic "sales.pyxis.order.updated" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "sales.pyxis.order.cancelled" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Tempo Sales System Integration
create_topic "sales.tempo.service.requested" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000 --config max.message.bytes=2097152"

create_topic "sales.tempo.service.updated" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "sales.tempo.service.cancelled" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# SAP Sales System Integration (Future)
create_topic "sales.sap.order.created" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000 --config max.message.bytes=5242880"

# Generic Sales Channel Events
create_topic "sales.channel.store.order" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "sales.channel.web.order" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "sales.channel.callcenter.order" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# FSM → Sales System Output Topics
create_topic "fsm.order.status_updated" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "fsm.order.assigned" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "fsm.order.scheduled" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "fsm.order.completed" 24 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "fsm.tv.outcome_recorded" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "fsm.tv.modifications_required" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

# Sales Integration Internal Events
create_topic "integration.sales.order.received" 24 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "integration.sales.order.normalized" 24 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "integration.sales.order.failed" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "integration.sales.status.sent" 24 3 604800000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

create_topic "integration.sales.status.failed" 12 3 2592000000 "lz4" "delete" \
    "--config min.insync.replicas=2 --config segment.ms=86400000"

echo "All topics created successfully!"
```

---

## Topic Configurations

### Producer Configuration

```javascript
// src/lib/kafka/producer.ts
import { Kafka, Producer, ProducerRecord, CompressionTypes } from 'kafkajs';

class KafkaProducerService {
  private kafka: Kafka;
  private producer: Producer;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'fsm-producer',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME!,
        password: process.env.KAFKA_SASL_PASSWORD!,
      } : undefined,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        multiplier: 2,
        factor: 0.2,
      },
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });

    this.producer = this.kafka.producer({
      allowAutoTopicCreation: false,
      transactionalId: process.env.KAFKA_TRANSACTIONAL_ID,
      maxInFlightRequests: 5,
      idempotent: true,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
      compression: CompressionTypes.LZ4,
    });
  }

  async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.producer.connect();
      this.isConnected = true;
      console.log('Kafka producer connected');
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await this.producer.disconnect();
      this.isConnected = false;
      console.log('Kafka producer disconnected');
    }
  }

  async sendMessage(
    topic: string,
    key: string,
    value: any,
    headers?: Record<string, string>
  ): Promise<void> {
    await this.connect();

    const message = {
      key,
      value: JSON.stringify(value),
      headers: {
        ...headers,
        timestamp: Date.now().toString(),
        source: 'fsm-api',
      },
      timestamp: Date.now().toString(),
    };

    await this.producer.send({
      topic,
      messages: [message],
      acks: -1, // Wait for all in-sync replicas
      timeout: 30000,
      compression: CompressionTypes.LZ4,
    });
  }

  async sendBatch(records: ProducerRecord[]): Promise<void> {
    await this.connect();

    await this.producer.sendBatch({
      topicMessages: records.map(record => ({
        ...record,
        messages: record.messages.map(msg => ({
          ...msg,
          value: typeof msg.value === 'string' ? msg.value : JSON.stringify(msg.value),
          headers: {
            ...msg.headers,
            timestamp: Date.now().toString(),
            source: 'fsm-api',
          },
        })),
      })),
      acks: -1,
      timeout: 30000,
      compression: CompressionTypes.LZ4,
    });
  }

  async sendTransactional(
    topic: string,
    messages: Array<{ key: string; value: any }>
  ): Promise<void> {
    await this.connect();

    const transaction = await this.producer.transaction();

    try {
      await transaction.send({
        topic,
        messages: messages.map(msg => ({
          key: msg.key,
          value: JSON.stringify(msg.value),
          timestamp: Date.now().toString(),
        })),
        acks: -1,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.abort();
      throw error;
    }
  }
}

export const kafkaProducer = new KafkaProducerService();
```

### Consumer Configuration

```javascript
// src/lib/kafka/consumer.ts
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';

interface ConsumerConfig {
  groupId: string;
  topics: string[];
  fromBeginning?: boolean;
  autoCommit?: boolean;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
}

class KafkaConsumerService {
  private kafka: Kafka;
  private consumers: Map<string, Consumer> = new Map();

  constructor() {
    this.kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID || 'fsm-consumer',
      brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
      ssl: process.env.KAFKA_SSL === 'true',
      sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME!,
        password: process.env.KAFKA_SASL_PASSWORD!,
      } : undefined,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
      connectionTimeout: 10000,
      requestTimeout: 30000,
    });
  }

  async createConsumer(config: ConsumerConfig): Promise<Consumer> {
    const consumer = this.kafka.consumer({
      groupId: config.groupId,
      sessionTimeout: config.sessionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 3000,
      maxBytesPerPartition: config.maxBytesPerPartition || 1048576, // 1 MB
      minBytes: config.minBytes || 1,
      maxBytes: config.maxBytes || 10485760, // 10 MB
      maxWaitTimeInMs: config.maxWaitTimeInMs || 5000,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
      },
      allowAutoTopicCreation: false,
      readUncommitted: false,
    });

    await consumer.connect();
    await consumer.subscribe({
      topics: config.topics,
      fromBeginning: config.fromBeginning || false,
    });

    this.consumers.set(config.groupId, consumer);

    console.log(`Consumer created for group: ${config.groupId}`);
    return consumer;
  }

  async consumeMessages(
    groupId: string,
    handler: (payload: EachMessagePayload) => Promise<void>
  ): Promise<void> {
    const consumer = this.consumers.get(groupId);

    if (!consumer) {
      throw new Error(`Consumer not found for group: ${groupId}`);
    }

    await consumer.run({
      autoCommit: true,
      autoCommitInterval: 5000,
      eachMessage: async (payload) => {
        const { topic, partition, message } = payload;

        try {
          console.log(`Processing message from ${topic}[${partition}] @ offset ${message.offset}`);

          await handler(payload);

          console.log(`Successfully processed message from ${topic}[${partition}] @ offset ${message.offset}`);
        } catch (error) {
          console.error(`Error processing message from ${topic}[${partition}] @ offset ${message.offset}:`, error);

          // Send to DLQ
          await this.sendToDLQ(topic, message, error);

          // Don't throw - continue processing
        }
      },
    });
  }

  private async sendToDLQ(topic: string, message: any, error: any): Promise<void> {
    // Implement DLQ logic
    console.error(`Sending message to DLQ. Original topic: ${topic}`, error);
  }

  async disconnect(groupId: string): Promise<void> {
    const consumer = this.consumers.get(groupId);

    if (consumer) {
      await consumer.disconnect();
      this.consumers.delete(groupId);
      console.log(`Consumer disconnected for group: ${groupId}`);
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [groupId, consumer] of this.consumers.entries()) {
      await consumer.disconnect();
      console.log(`Consumer disconnected for group: ${groupId}`);
    }

    this.consumers.clear();
  }
}

export const kafkaConsumer = new KafkaConsumerService();
```

---

## Partitioning Strategy

### Partition Key Selection

```javascript
// src/lib/kafka/partition-strategy.ts

export class PartitionKeyStrategy {
  /**
   * User-related events: Partition by user_id
   * Ensures all events for a user go to the same partition (ordering)
   */
  static forUserEvent(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * Organization-related events: Partition by org_id
   */
  static forOrganizationEvent(orgId: string): string {
    return `org:${orgId}`;
  }

  /**
   * Project-related events: Partition by project_id
   * Ensures all project events are ordered
   */
  static forProjectEvent(projectId: string): string {
    return `project:${projectId}`;
  }

  /**
   * Task-related events: Partition by task_id
   * For high-volume, distribute across many partitions
   */
  static forTaskEvent(taskId: string): string {
    return `task:${taskId}`;
  }

  /**
   * Analytics events: Partition by session_id for session-level ordering
   * Or by user_id for user-level analytics
   */
  static forAnalyticsEvent(sessionId: string, userId?: string): string {
    return sessionId ? `session:${sessionId}` : `user:${userId}`;
  }

  /**
   * Notification events: Partition by user_id
   * Ensures notifications for a user are processed in order
   */
  static forNotificationEvent(userId: string): string {
    return `user:${userId}`;
  }

  /**
   * CDC events: Partition by record primary key
   * Maintains ordering for changes to the same record
   */
  static forCDCEvent(tableName: string, recordId: string): string {
    return `${tableName}:${recordId}`;
  }

  /**
   * Audit events: Partition by entity_id
   */
  static forAuditEvent(entityType: string, entityId: string): string {
    return `${entityType}:${entityId}`;
  }
}

// Example usage
/*
await kafkaProducer.sendMessage(
  'task.events',
  PartitionKeyStrategy.forTaskEvent(task.id),
  {
    event_type: 'task.created',
    task_id: task.id,
    project_id: task.project_id,
    created_by: task.created_by,
    created_at: task.created_at,
    payload: task,
  }
);
*/
```

### Custom Partitioner

```javascript
// src/lib/kafka/custom-partitioner.ts
import { Partitioners } from 'kafkajs';
import MurmurHash3 from 'imurmurhash';

export const customPartitioner = Partitioners.DefaultPartitioner;

// Alternative: Consistent hashing partitioner
export const consistentHashPartitioner = () => {
  return ({ topic, partitionMetadata, message }) => {
    const key = message.key?.toString() || '';
    const numPartitions = partitionMetadata.length;

    // Use MurmurHash3 for consistent hashing
    const hash = MurmurHash3(key).result();
    const partition = Math.abs(hash) % numPartitions;

    return partition;
  };
};

// Time-based partitioner for analytics
export const timeBasedPartitioner = () => {
  return ({ topic, partitionMetadata, message }) => {
    const numPartitions = partitionMetadata.length;

    // Extract timestamp from message
    const timestamp = message.timestamp
      ? parseInt(message.timestamp, 10)
      : Date.now();

    // Partition based on hour of day for even distribution
    const hour = new Date(timestamp).getHours();
    const partition = hour % numPartitions;

    return partition;
  };
};
```

---

## Consumer Groups

### Consumer Group Configuration

```yaml
# consumer-groups.yaml

consumer_groups:
  # Task Event Processors
  - group_id: task-event-processor
    topics:
      - task.events
      - task.comments
    instances: 12
    max_poll_records: 500
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: true
    auto_commit_interval_ms: 5000

  # Analytics Processors (High Throughput)
  - group_id: analytics-processor
    topics:
      - analytics.events
      - analytics.page_views
    instances: 48
    max_poll_records: 1000
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: latest
    enable_auto_commit: true
    auto_commit_interval_ms: 5000

  # Notification Dispatchers
  - group_id: email-notification-dispatcher
    topics:
      - notifications.email
    instances: 4
    max_poll_records: 100
    max_poll_interval_ms: 600000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: false  # Manual commit after successful send

  - group_id: push-notification-dispatcher
    topics:
      - notifications.push
    instances: 8
    max_poll_records: 200
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: false

  # CDC Processors
  - group_id: cdc-processor
    topics:
      - cdc.tasks-changes
      - cdc.projects-changes
    instances: 12
    max_poll_records: 500
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: true

  # Audit Log Processor
  - group_id: audit-log-processor
    topics:
      - audit.events
    instances: 6
    max_poll_records: 200
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: true

  # Search Index Updater
  - group_id: search-index-updater
    topics:
      - task.events
      - project.events
      - user.events
    instances: 8
    max_poll_records: 200
    max_poll_interval_ms: 600000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: earliest
    enable_auto_commit: false

  # Cache Invalidator
  - group_id: cache-invalidator
    topics:
      - task.events
      - project.events
      - user.events
      - organization.events
    instances: 4
    max_poll_records: 500
    max_poll_interval_ms: 300000
    session_timeout_ms: 30000
    heartbeat_interval_ms: 3000
    auto_offset_reset: latest
    enable_auto_commit: true
```

---

## Schema Management

### Avro Schema Registry Configuration (Strimzi on GKE)

```yaml
# Deploy Confluent Schema Registry on Kubernetes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schema-registry
  namespace: kafka
spec:
  replicas: 3
  selector:
    matchLabels:
      app: schema-registry
  template:
    metadata:
      labels:
        app: schema-registry
    spec:
      containers:
        - name: schema-registry
          image: confluentinc/cp-schema-registry:7.5.0
          ports:
            - containerPort: 8081
          env:
            - name: SCHEMA_REGISTRY_HOST_NAME
              value: "schema-registry"
            - name: SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS
              value: "production-kafka-bootstrap:9092"
            - name: SCHEMA_REGISTRY_LISTENERS
              value: "http://0.0.0.0:8081"
            - name: SCHEMA_REGISTRY_SCHEMA_REGISTRY_GROUP_ID
              value: "schema-registry"
          resources:
            requests:
              memory: 1Gi
              cpu: 500m
            limits:
              memory: 2Gi
              cpu: 1000m

---
apiVersion: v1
kind: Service
metadata:
  name: schema-registry
  namespace: kafka
spec:
  selector:
    app: schema-registry
  ports:
    - port: 8081
      targetPort: 8081
  type: ClusterIP
```

### Example Avro Schemas

```json
// schemas/task-event.avsc
{
  "type": "record",
  "name": "TaskEvent",
  "namespace": "com.fsm.events",
  "doc": "Schema for task lifecycle events",
  "fields": [
    {
      "name": "event_id",
      "type": "string",
      "doc": "Unique event identifier"
    },
    {
      "name": "event_type",
      "type": {
        "type": "enum",
        "name": "TaskEventType",
        "symbols": [
          "TASK_CREATED",
          "TASK_UPDATED",
          "TASK_COMPLETED",
          "TASK_DELETED",
          "TASK_ASSIGNED",
          "TASK_STATUS_CHANGED"
        ]
      },
      "doc": "Type of task event"
    },
    {
      "name": "task_id",
      "type": "string",
      "doc": "Task identifier"
    },
    {
      "name": "project_id",
      "type": "string",
      "doc": "Associated project identifier"
    },
    {
      "name": "organization_id",
      "type": "string",
      "doc": "Associated organization identifier"
    },
    {
      "name": "user_id",
      "type": ["null", "string"],
      "default": null,
      "doc": "User who triggered the event"
    },
    {
      "name": "timestamp",
      "type": "long",
      "logicalType": "timestamp-millis",
      "doc": "Event timestamp in milliseconds"
    },
    {
      "name": "payload",
      "type": {
        "type": "map",
        "values": "string"
      },
      "doc": "Event payload as key-value pairs"
    },
    {
      "name": "metadata",
      "type": {
        "type": "record",
        "name": "EventMetadata",
        "fields": [
          {"name": "source", "type": "string"},
          {"name": "version", "type": "string"},
          {"name": "correlation_id", "type": ["null", "string"], "default": null},
          {"name": "causation_id", "type": ["null", "string"], "default": null}
        ]
      },
      "doc": "Event metadata"
    }
  ]
}
```

---

## Monitoring and Operations

### Kafka Monitoring with Prometheus

```yaml
# prometheus-kafka-exporter.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kafka-exporter
  namespace: kafka
spec:
  replicas: 2
  selector:
    matchLabels:
      app: kafka-exporter
  template:
    metadata:
      labels:
        app: kafka-exporter
    spec:
      containers:
      - name: kafka-exporter
        image: danielqsj/kafka-exporter:latest
        args:
        - --kafka.server=kafka-broker-1:9092
        - --kafka.server=kafka-broker-2:9092
        - --kafka.server=kafka-broker-3:9092
        - --web.listen-address=:9308
        - --log.level=info
        ports:
        - name: metrics
          containerPort: 9308
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
---
apiVersion: v1
kind: Service
metadata:
  name: kafka-exporter
  namespace: kafka
  labels:
    app: kafka-exporter
spec:
  selector:
    app: kafka-exporter
  ports:
  - name: metrics
    port: 9308
    targetPort: 9308
```

### Consumer Lag Monitoring

```bash
#!/bin/bash
# monitor-consumer-lag.sh

KAFKA_BOOTSTRAP_SERVERS="${KAFKA_BOOTSTRAP_SERVERS:-localhost:9092}"

echo "Checking consumer group lag..."

kafka-consumer-groups.sh \
    --bootstrap-server $KAFKA_BOOTSTRAP_SERVERS \
    --all-groups \
    --describe \
    --state

kafka-consumer-groups.sh \
    --bootstrap-server $KAFKA_BOOTSTRAP_SERVERS \
    --all-groups \
    --describe \
    | grep -v "CONSUMER-ID" \
    | awk '{if ($6 > 1000) print "HIGH LAG:", $1, $2, "Partition:", $3, "Lag:", $6}'
```

---

## Disaster Recovery

### Topic Backup with MirrorMaker 2

```properties
# mm2.properties - MirrorMaker 2 Configuration

# Cluster definitions
clusters = primary, secondary

primary.bootstrap.servers = kafka-primary:9092
secondary.bootstrap.servers = kafka-secondary:9092

# Replication flows
primary->secondary.enabled = true
primary->secondary.topics = .*

# Replication settings
replication.factor = 3
offset.syncs.topic.replication.factor = 3
checkpoints.topic.replication.factor = 3
heartbeats.topic.replication.factor = 3

# Sync configuration
sync.topic.configs.enabled = true
sync.topic.acls.enabled = false

# Consumer settings
consumer.max.poll.records = 500
consumer.max.poll.interval.ms = 300000

# Producer settings
producer.acks = all
producer.compression.type = lz4
producer.max.in.flight.requests.per.connection = 5
producer.enable.idempotence = true
```

---

## Summary

This Kafka topics design provides a robust event-driven architecture with:

- **Scalability**: 96 partitions for high-volume topics, 6-48 for others
- **Reliability**: Replication factor of 3, min in-sync replicas of 2
- **Performance**: LZ4 compression, optimized retention policies
- **Data Integrity**: Idempotent producers, transactional consumers
- **Monitoring**: Comprehensive metrics and lag monitoring
- **Disaster Recovery**: Cross-region replication with MirrorMaker 2

### Key Metrics:

- **Expected Throughput**: 100,000+ messages/second
- **Latency**: < 10ms p99
- **Retention**: 3 days to 90 days (configurable per topic)
- **Storage Efficiency**: 70% with LZ4 compression
- **Availability**: 99.99% with multi-AZ deployment
