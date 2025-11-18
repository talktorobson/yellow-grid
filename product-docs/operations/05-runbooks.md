# Operational Runbooks

## Overview

This document provides step-by-step troubleshooting and remediation procedures for common operational issues.

## Table of Contents

1. [High Error Rate](#high-error-rate)
2. [High Latency](#high-latency)
3. [Service Down](#service-down)
4. [Database Issues](#database-issues)
5. [Cache Problems](#cache-problems)
6. [Message Queue Issues](#message-queue-issues)
7. [Deployment Rollback](#deployment-rollback)
8. [Resource Exhaustion](#resource-exhaustion)
9. [Security Incidents](#security-incidents)
10. [Third-Party Service Failures](#third-party-service-failures)

---

## High Error Rate

### Symptoms
- Alert: "HighErrorRate" triggered
- Error rate >5% on critical endpoints
- Status page showing elevated errors

### Diagnostic Steps

```bash
# 1. Check current error rate
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100'

# 2. Identify which endpoints are failing
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=topk(10, sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (route, method))'

# 3. Check recent logs for errors
kubectl logs -l app=api-service --tail=100 --since=10m | grep -i error

# 4. Check application health
kubectl get pods -l app=api-service
curl https://api.example.com/health

# 5. Check recent deployments
kubectl rollout history deployment/api-service

# 6. Check dependencies
curl https://api.stripe.com/healthcheck
redis-cli ping
psql -h db-primary -U app -c "SELECT 1"
```

### Common Causes & Solutions

#### Cause 1: Recent Deployment Issue

**Solution: Rollback**
```bash
# Check deployment history
kubectl rollout history deployment/api-service

# Rollback to previous version
kubectl rollout undo deployment/api-service

# Monitor rollback
kubectl rollout status deployment/api-service

# Verify error rate decreased
watch 'curl -s http://prometheus:9090/api/v1/query?query=rate(http_requests_total{status_code=~"5.."}[1m]) | jq'
```

#### Cause 2: Database Connection Issues

**Solution: Check and Restart Connections**
```bash
# Check active connections
psql -h db-primary -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check connection pool status
curl http://api-service:9090/metrics | grep db_connections

# Restart API service to reset connection pool
kubectl rollout restart deployment/api-service

# Scale down/up as last resort
kubectl scale deployment api-service --replicas=0
sleep 10
kubectl scale deployment api-service --replicas=3
```

#### Cause 3: Third-Party Service Failure

**Solution: Enable Circuit Breaker / Fallback**
```bash
# Check third-party service status
curl https://status.stripe.com/api/v2/status.json

# Enable circuit breaker via feature flag
curl -X POST http://feature-flags:8080/flags/stripe-circuit-breaker \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Or enable fallback mode
kubectl set env deployment/api-service PAYMENT_FALLBACK_MODE=true
```

#### Cause 4: Memory Leak

**Solution: Identify and Restart**
```bash
# Check memory usage
kubectl top pods -l app=api-service

# Check for OOMKilled pods
kubectl get pods -l app=api-service -o json | jq '.items[] | select(.status.containerStatuses[].lastState.terminated.reason == "OOMKilled")'

# Gracefully restart high-memory pods
kubectl delete pod <pod-name>

# If widespread, rolling restart
kubectl rollout restart deployment/api-service
```

### Escalation Criteria

Escalate to L2 if:
- Error rate >20% after 15 minutes
- Rollback doesn't resolve issue
- Multiple services affected
- Data corruption suspected

---

## High Latency

### Symptoms
- Alert: "HighLatency" triggered
- P95 latency >1s on critical endpoints
- Users reporting slow page loads

### Diagnostic Steps

```bash
# 1. Check current latency
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))'

# 2. Identify slowest endpoints
curl -G 'http://prometheus:9090/api/v1/query' \
  --data-urlencode 'query=topk(10, histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route)))'

# 3. Check slow queries
psql -h db-primary -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds' ORDER BY duration DESC;"

# 4. Check database performance
psql -h db-primary -U postgres -c "SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch FROM pg_stat_user_tables WHERE seq_scan > 0 ORDER BY seq_tup_read DESC LIMIT 10;"

# 5. Check cache hit rate
redis-cli info stats | grep keyspace

# 6. Check resource utilization
kubectl top nodes
kubectl top pods -l app=api-service
```

### Common Causes & Solutions

#### Cause 1: Database Slow Queries

**Solution: Kill Slow Queries / Add Indexes**
```bash
# Kill slow queries
psql -h db-primary -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds';"

# Identify missing indexes
psql -h db-primary -U postgres -c "SELECT schemaname, tablename, seq_scan, seq_tup_read FROM pg_stat_user_tables WHERE seq_scan > 100 AND seq_tup_read > 10000 ORDER BY seq_tup_read DESC LIMIT 10;"

# Add missing index (example)
psql -h db-primary -U app -c "CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);"

# Update query planner statistics
psql -h db-primary -U postgres -c "ANALYZE;"
```

#### Cause 2: Cache Miss Storm

**Solution: Warm Cache / Scale Redis**
```bash
# Check cache hit rate
redis-cli info stats | grep keyspace_hits
redis-cli info stats | grep keyspace_misses

# If hit rate low, warm critical caches
curl -X POST http://api-service:8080/admin/cache/warm

# Scale Redis if needed
kubectl scale statefulset redis --replicas=3

# Increase cache TTL temporarily
kubectl set env deployment/api-service CACHE_TTL=3600
```

#### Cause 3: High CPU Usage

**Solution: Scale Horizontally**
```bash
# Check CPU usage
kubectl top pods -l app=api-service

# Scale up immediately
kubectl scale deployment api-service --replicas=10

# Enable autoscaling for future
kubectl autoscale deployment api-service --min=3 --max=20 --cpu-percent=70
```

#### Cause 4: External API Latency

**Solution: Increase Timeouts / Enable Caching**
```bash
# Check external API latency
curl -w "@curl-format.txt" https://api.stripe.com/v1/charges

# Increase timeout temporarily
kubectl set env deployment/api-service STRIPE_TIMEOUT=10000

# Enable response caching
kubectl set env deployment/api-service ENABLE_API_CACHE=true
```

### Performance Investigation

```bash
# Generate flame graph for CPU profiling
kubectl exec -it api-service-pod -- curl http://localhost:6060/debug/pprof/profile?seconds=30 > cpu.prof
go tool pprof -http=:8080 cpu.prof

# Trace a specific request
curl -H "X-Trace: true" https://api.example.com/api/orders/123

# Check APM traces in Grafana
# Navigate to: Grafana → Explore → Tempo → Query by trace ID
```

### Escalation Criteria

Escalate to L2 if:
- Latency >5s after 15 minutes
- Scaling doesn't improve performance
- Database queries cannot be optimized quickly
- External dependency causing delays

---

## Service Down

### Symptoms
- Alert: "ServiceDown" triggered
- Health check endpoint returning errors
- Pods not in Running state

### Diagnostic Steps

```bash
# 1. Check pod status
kubectl get pods -l app=api-service

# 2. Check pod events
kubectl describe pod <pod-name>

# 3. Check recent logs
kubectl logs <pod-name> --tail=50

# 4. Check previous pod logs (if crashlooping)
kubectl logs <pod-name> --previous

# 5. Check node status
kubectl get nodes
kubectl describe node <node-name>

# 6. Check deployment status
kubectl get deployment api-service
kubectl describe deployment api-service
```

### Common Causes & Solutions

#### Cause 1: Pod CrashLoopBackOff

**Solution: Fix Configuration / Rollback**
```bash
# Check why pod is crashing
kubectl logs <pod-name> --previous

# Common issues:
# - Missing environment variables
# - Invalid configuration
# - Port already in use
# - Application crash on startup

# Fix environment variable
kubectl set env deployment/api-service DATABASE_URL=postgresql://...

# Or rollback if due to recent deployment
kubectl rollout undo deployment/api-service

# Monitor recovery
kubectl rollout status deployment/api-service
```

#### Cause 2: ImagePullBackOff

**Solution: Fix Image Reference**
```bash
# Check image pull status
kubectl describe pod <pod-name> | grep -A 10 Events

# Common issues:
# - Image doesn't exist
# - Wrong tag
# - Missing image pull secrets

# Fix image tag
kubectl set image deployment/api-service api-service=myregistry/api-service:v1.2.3

# Add image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=myregistry.com \
  --docker-username=user \
  --docker-password=pass

kubectl patch serviceaccount default -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

#### Cause 3: Resource Limits

**Solution: Adjust Limits / Scale Nodes**
```bash
# Check if pods pending due to resources
kubectl get pods -l app=api-service
kubectl describe pod <pending-pod>

# Check node capacity
kubectl describe nodes | grep -A 5 "Allocated resources"

# Temporary: Lower resource requests
kubectl set resources deployment api-service -c=api-service --requests=cpu=100m,memory=256Mi

# Permanent: Scale cluster
# (Cloud-specific commands)
```

#### Cause 4: Node Failure

**Solution: Drain and Replace Node**
```bash
# Check node status
kubectl get nodes

# If node NotReady, check events
kubectl describe node <node-name>

# Drain node
kubectl drain <node-name> --ignore-daemonsets --delete-emptydir-data

# Replace node in GKE (GKE Autopilot auto-replaces, or manually delete):
gcloud compute instances delete <instance-name> --zone=europe-west1-b
```

### Emergency Recovery

```bash
# If all pods down, emergency scale up
kubectl scale deployment api-service --replicas=10

# If deployment broken, recreate
kubectl delete deployment api-service
kubectl apply -f deployment.yaml

# If namespace broken, worst case
kubectl delete namespace production --force --grace-period=0
kubectl apply -f namespace.yaml
kubectl apply -f production/
```

### Escalation Criteria

Escalate to L2 if:
- Unable to restart pods after 10 minutes
- Node-level issues
- Cluster-wide problems
- Data loss suspected

---

## Database Issues

### Symptoms
- Database connection errors
- Slow queries
- Replication lag
- Disk space issues

### Diagnostic Steps

```bash
# 1. Check database connectivity
psql -h db-primary -U app -c "SELECT 1"

# 2. Check active connections
psql -h db-primary -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
psql -h db-primary -U postgres -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state;"

# 3. Check replication lag
psql -h db-replica -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"

# 4. Check disk space
psql -h db-primary -U postgres -c "SELECT pg_size_pretty(pg_database_size('production'));"
ssh db-primary "df -h /var/lib/postgresql"

# 5. Check slow queries
psql -h db-primary -U postgres -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"

# 6. Check locks
psql -h db-primary -U postgres -c "SELECT locktype, relation::regclass, mode, transactionid AS tid, pid, granted FROM pg_locks WHERE NOT granted;"
```

### Common Causes & Solutions

#### Cause 1: Connection Pool Exhausted

**Solution: Scale Connections / Kill Idle**
```bash
# Check connection limit
psql -h db-primary -U postgres -c "SHOW max_connections;"

# Kill idle connections
psql -h db-primary -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND state_change < now() - interval '10 minutes';"

# Increase connection limit (requires restart)
# Edit postgresql.conf
max_connections = 500

# Restart database
pg_ctl restart -D /var/lib/postgresql/data

# Scale application connection pools
kubectl set env deployment/api-service DB_POOL_SIZE=20
```

#### Cause 2: Long-Running Query Blocking

**Solution: Kill Blocking Queries**
```bash
# Find blocking queries
psql -h db-primary -U postgres -c "
  SELECT
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
  FROM pg_catalog.pg_locks blocked_locks
  JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
  JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
  WHERE NOT blocked_locks.granted;
"

# Kill blocking query
psql -h db-primary -U postgres -c "SELECT pg_terminate_backend(<blocking_pid>);"
```

#### Cause 3: Disk Space Full

**Solution: Clean Up / Expand Disk**
```bash
# Check disk usage
ssh db-primary "df -h /var/lib/postgresql"

# Find largest tables
psql -h db-primary -U postgres -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Vacuum old data
psql -h db-primary -U postgres -c "VACUUM FULL ANALYZE;"

# Archive old logs
ssh db-primary "gzip /var/lib/postgresql/data/pg_log/*.log"
ssh db-primary "find /var/lib/postgresql/data/pg_log -name '*.gz' -mtime +30 -delete"

# Expand disk in Cloud SQL:
gcloud sql instances patch db-primary --storage-size=500
```

#### Cause 4: Replication Lag

**Solution: Investigate and Fix**
```bash
# Check lag on all replicas
for replica in db-replica-1 db-replica-2; do
  echo "=== $replica ==="
  psql -h $replica -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag;"
done

# Check if replica is receiving WAL
psql -h db-replica -U postgres -c "SELECT status, received_lsn, replay_lsn FROM pg_stat_wal_receiver;"

# If lag too high, rebuild replica
# 1. Stop replica
pg_ctl stop -D /var/lib/postgresql/data

# 2. Remove old data
rm -rf /var/lib/postgresql/data/*

# 3. Base backup from primary
pg_basebackup -h db-primary -U replication -D /var/lib/postgresql/data -P -R

# 4. Start replica
pg_ctl start -D /var/lib/postgresql/data
```

### Database Failover

```bash
# Promote replica to primary
pg_ctl promote -D /var/lib/postgresql/data

# Update application connection strings
kubectl set env deployment/api-service DATABASE_URL=postgresql://db-replica-1:5432/production

# Reconfigure old primary as replica
# Edit recovery.conf on old primary
primary_conninfo = 'host=db-replica-1 port=5432 user=replication'

# Restart as replica
pg_ctl restart -D /var/lib/postgresql/data
```

### Escalation Criteria

Escalate to DBA if:
- Data corruption suspected
- Failover required
- Performance tuning beyond basic queries
- Replication completely broken

---

## Cache Problems

### Symptoms
- High cache miss rate
- Redis connection errors
- Slow response times

### Diagnostic Steps

```bash
# 1. Check Redis connectivity
redis-cli ping

# 2. Check cache stats
redis-cli info stats

# 3. Check memory usage
redis-cli info memory

# 4. Check client connections
redis-cli info clients

# 5. Check slow log
redis-cli slowlog get 10

# 6. Check keyspace
redis-cli info keyspace
```

### Common Solutions

```bash
# Flush cache if corrupted
redis-cli FLUSHALL

# Restart Redis
kubectl rollout restart statefulset redis

# Scale Redis cluster
kubectl scale statefulset redis --replicas=5

# Increase memory limit
kubectl set resources statefulset redis -c=redis --limits=memory=4Gi
```

---

## Deployment Rollback

### Quick Rollback

```bash
# Immediate rollback
kubectl rollout undo deployment/api-service

# Rollback to specific revision
kubectl rollout history deployment/api-service
kubectl rollout undo deployment/api-service --to-revision=5

# Monitor rollback
kubectl rollout status deployment/api-service

# Verify pods running new version
kubectl get pods -l app=api-service -o jsonpath='{.items[*].spec.containers[0].image}'
```

### Gradual Rollback

```bash
# Pause rollout
kubectl rollout pause deployment/api-service

# Scale down new version
kubectl set image deployment/api-service api-service=old-image:v1.0

# Resume with canary
kubectl rollout resume deployment/api-service

# Monitor errors
watch 'kubectl logs -l app=api-service --tail=10 | grep ERROR'
```

---

## Summary

These runbooks provide:

- **Step-by-step diagnostic procedures** for common issues
- **Multiple solution paths** based on root cause
- **Escalation criteria** for knowing when to get help
- **Emergency procedures** for critical situations
- **Verification steps** to confirm resolution

Keep runbooks updated as systems evolve.
