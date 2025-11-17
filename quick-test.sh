#!/bin/bash
set -e

# Quick comprehensive test
BASE="http://localhost:3000/api/v1"

echo "=== 1. LOGIN ==="
LOGIN=$(curl -s -X POST "$BASE/auth/login" -H "Content-Type: application/json" -d '{"email":"admin@adeo.com","password":"Admin123!"}')
TOKEN=$(echo "$LOGIN" | jq -r '.data.accessToken')
echo "Token: ${TOKEN:0:20}..."

echo -e "\n=== 2. CREATE PROVIDER ==="
PROVIDER=$(curl -s -X POST "$BASE/providers" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{
  "externalId":"TEST-001",
  "countryCode":"FR",
  "businessUnit":"LEROY_MERLIN",
  "name":"Test Provider",
  "legalName":"Test Provider Legal"
}')
PID=$(echo "$PROVIDER" | jq -r '.data.id')
echo "Provider ID: $PID"

echo -e "\n=== 3. GET PROVIDERS ==="
curl -s "$BASE/providers" -H "Authorization: Bearer $TOKEN" | jq '.data | length'

echo -e "\n=== 4. GET SYSTEM CONFIG ==="
curl -s "$BASE/config/system" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n=== 5. GET COUNTRY CONFIG ==="
curl -s "$BASE/config/country/FR" -H "Authorization: Bearer $TOKEN" | jq '.data.countryCode, .data.timezone'

echo -e "\n=== 6. NO AUTH TEST (should fail) ==="
curl -s -w "\nHTTP: %{http_code}\n" "$BASE/users" | tail -n 1

echo -e "\n=== 7. CONFIG MODULE - NO CONTROLLER BUG CHECK ==="
curl -s "$BASE/config" -H "Authorization: Bearer $TOKEN" 2>&1

echo -e "\n✅ Quick tests completed"
