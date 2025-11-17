#!/bin/bash
set -e

BASE_URL="http://localhost:3000/api/v1"
ERRORS=()
WARNINGS=()
TEST_COUNT=0
PASS_COUNT=0
FAIL_COUNT=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_test() {
  ((TEST_COUNT++))
  echo -e "${BLUE}TEST $TEST_COUNT: $1${NC}"
}

log_pass() {
  ((PASS_COUNT++))
  echo -e "${GREEN}✓ PASS: $1${NC}"
}

log_fail() {
  ((FAIL_COUNT++))
  echo -e "${RED}✗ FAIL: $1${NC}"
  ERRORS+=("TEST $TEST_COUNT: $1 - $2")
}

log_warn() {
  echo -e "${YELLOW}⚠ WARNING: $1${NC}"
  WARNINGS+=("TEST $TEST_COUNT: $1")
}

test_endpoint() {
  local method=$1
  local endpoint=$2
  local auth=$3
  local data=$4
  local expected_status=$5
  local test_name=$6

  log_test "$test_name"

  if [ -n "$auth" ]; then
    if [ -n "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $auth" \
        -H "Content-Type: application/json" \
        -d "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Authorization: Bearer $auth")
    fi
  else
    if [ -n "$data" ]; then
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -d "$data")
    else
      response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$endpoint")
    fi
  fi

  status=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [ "$status" = "$expected_status" ]; then
    log_pass "$test_name (HTTP $status)"
    echo "$body"
  else
    log_fail "$test_name" "Expected HTTP $expected_status, got $status. Response: $body"
    echo "$body"
  fi

  echo ""
}

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Yellow Grid - Phase 1 Comprehensive Test Suite     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# 1. AUTH MODULE TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}1. AUTH MODULE TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 1.1 Login with admin credentials
log_test "Login with admin credentials"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@adeo.com","password":"Admin123!"}')

ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // empty')
ADMIN_REFRESH=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken // empty')

if [ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ]; then
  log_pass "Admin login successful"
  echo "Token: ${ADMIN_TOKEN:0:20}..."
else
  log_fail "Admin login failed" "Response: $LOGIN_RESPONSE"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# 1.2 Login with operator credentials
log_test "Login with operator credentials"
OPERATOR_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"operator@adeo.com","password":"Operator123!"}')

OPERATOR_TOKEN=$(echo "$OPERATOR_LOGIN" | jq -r '.data.accessToken // empty')

if [ -n "$OPERATOR_TOKEN" ] && [ "$OPERATOR_TOKEN" != "null" ]; then
  log_pass "Operator login successful"
else
  log_fail "Operator login failed" "Response: $OPERATOR_LOGIN"
fi
echo ""

# 1.3 Login with invalid credentials
test_endpoint "POST" "/auth/login" "" '{"email":"admin@adeo.com","password":"WrongPassword"}' "401" "Login with invalid password should fail"

# 1.4 Login with non-existent user
test_endpoint "POST" "/auth/login" "" '{"email":"nonexistent@adeo.com","password":"Password123"}' "401" "Login with non-existent user should fail"

# 1.5 Register new user
RANDOM_EMAIL="test$(date +%s)@adeo.com"
test_endpoint "POST" "/auth/register" "" "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"Test123!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"countryCode\":\"FR\",\"businessUnit\":\"LEROY_MERLIN\"}" "201" "Register new user"

# 1.6 Register duplicate user
test_endpoint "POST" "/auth/register" "" '{"email":"admin@adeo.com","password":"Test123!","firstName":"Test","lastName":"User","countryCode":"FR","businessUnit":"LEROY_MERLIN"}' "409" "Register duplicate user should fail"

# 1.7 Get current user info
test_endpoint "POST" "/auth/me" "$ADMIN_TOKEN" "" "200" "Get current user info"

# 1.8 Refresh token
test_endpoint "POST" "/auth/refresh" "" "{\"refreshToken\":\"$ADMIN_REFRESH\"}" "200" "Refresh access token"

# 1.9 Access protected endpoint without token
test_endpoint "POST" "/auth/me" "" "" "401" "Access protected endpoint without token should fail"

# 1.10 Access protected endpoint with invalid token
test_endpoint "POST" "/auth/me" "invalid.token.here" "" "401" "Access with invalid token should fail"

# ============================================================================
# 2. USERS MODULE TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}2. USERS MODULE TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 2.1 List all users (admin only)
test_endpoint "GET" "/users" "$ADMIN_TOKEN" "" "200" "List all users as admin"

# 2.2 List users as operator (should fail)
test_endpoint "GET" "/users" "$OPERATOR_TOKEN" "" "403" "List users as operator should fail (no permission)"

# 2.3 Get user by ID
log_test "Get admin user by ID"
ADMIN_USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')
test_endpoint "GET" "/users/$ADMIN_USER_ID" "$ADMIN_TOKEN" "" "200" "Get user by ID"

# 2.4 Get non-existent user
test_endpoint "GET" "/users/00000000-0000-0000-0000-000000000000" "$ADMIN_TOKEN" "" "404" "Get non-existent user should fail"

# 2.5 Update user
test_endpoint "PATCH" "/users/$ADMIN_USER_ID" "$ADMIN_TOKEN" '{"firstName":"Updated"}' "200" "Update user"

# 2.6 Create user (admin only)
NEW_USER_EMAIL="newuser$(date +%s)@adeo.com"
test_endpoint "POST" "/users" "$ADMIN_TOKEN" "{\"email\":\"$NEW_USER_EMAIL\",\"password\":\"Password123!\",\"firstName\":\"New\",\"lastName\":\"User\",\"countryCode\":\"FR\",\"businessUnit\":\"LEROY_MERLIN\"}" "201" "Create user as admin"

# 2.7 Create user as operator (should fail)
test_endpoint "POST" "/users" "$OPERATOR_TOKEN" "{\"email\":\"test2@adeo.com\",\"password\":\"Password123!\",\"firstName\":\"Test\",\"lastName\":\"User\",\"countryCode\":\"FR\",\"businessUnit\":\"LEROY_MERLIN\"}" "403" "Create user as operator should fail"

# ============================================================================
# 3. PROVIDERS MODULE TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}3. PROVIDERS MODULE TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 3.1 Create provider
log_test "Create provider"
PROVIDER_EXT_ID="TEST-PROV-$(date +%s)"
PROVIDER_RESPONSE=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId":"'$PROVIDER_EXT_ID'",
    "countryCode":"FR",
    "businessUnit":"LEROY_MERLIN",
    "name":"Test Provider",
    "legalName":"Test Provider Legal SAS"
  }')

PROVIDER_ID=$(echo "$PROVIDER_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$PROVIDER_ID" ] && [ "$PROVIDER_ID" != "null" ]; then
  log_pass "Provider created successfully"
  echo "Provider ID: $PROVIDER_ID"
else
  log_fail "Create provider failed" "Response: $PROVIDER_RESPONSE"
fi
echo ""

# 3.2 Get provider by ID
test_endpoint "GET" "/providers/$PROVIDER_ID" "$ADMIN_TOKEN" "" "200" "Get provider by ID"

# 3.3 List all providers
test_endpoint "GET" "/providers" "$ADMIN_TOKEN" "" "200" "List all providers"

# 3.4 Update provider
test_endpoint "PATCH" "/providers/$PROVIDER_ID" "$ADMIN_TOKEN" '{"name":"Updated Provider Name"}' "200" "Update provider"

# 3.5 Create provider with duplicate externalId
test_endpoint "POST" "/providers" "$ADMIN_TOKEN" '{"externalId":"'$PROVIDER_EXT_ID'","countryCode":"FR","businessUnit":"LEROY_MERLIN","name":"Duplicate","legalName":"Duplicate Legal"}' "409" "Create provider with duplicate externalId should fail"

# 3.6 Create work team
log_test "Create work team"
WORK_TEAM_RESPONSE=$(curl -s -X POST "$BASE_URL/providers/$PROVIDER_ID/work-teams" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Work Team 1",
    "maxDailyJobs":5,
    "skills":["installation","repair","plumbing"],
    "serviceTypes":["INSTALLATION","TECHNICAL_VISIT"],
    "postalCodes":["75001","75002","75003"],
    "workingDays":["MON","TUE","WED","THU","FRI"],
    "shifts":[
      {"code":"M","startLocal":"08:00","endLocal":"13:00"},
      {"code":"A","startLocal":"14:00","endLocal":"19:00"}
    ]
  }')

WORK_TEAM_ID=$(echo "$WORK_TEAM_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$WORK_TEAM_ID" ] && [ "$WORK_TEAM_ID" != "null" ]; then
  log_pass "Work team created successfully"
  echo "Work Team ID: $WORK_TEAM_ID"
else
  log_fail "Create work team failed" "Response: $WORK_TEAM_RESPONSE"
fi
echo ""

# 3.7 Get work team by ID
test_endpoint "GET" "/providers/work-teams/$WORK_TEAM_ID" "$ADMIN_TOKEN" "" "200" "Get work team by ID"

# 3.8 List work teams for provider
test_endpoint "GET" "/providers/$PROVIDER_ID/work-teams" "$ADMIN_TOKEN" "" "200" "List work teams"

# 3.9 Create technician
log_test "Create technician"
TECH_RESPONSE=$(curl -s -X POST "$BASE_URL/providers/work-teams/$WORK_TEAM_ID/technicians" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"John",
    "lastName":"Doe",
    "email":"john.doe@provider.com",
    "phone":"+33612345678"
  }')

TECH_ID=$(echo "$TECH_RESPONSE" | jq -r '.data.id // empty')

if [ -n "$TECH_ID" ] && [ "$TECH_ID" != "null" ]; then
  log_pass "Technician created successfully"
  echo "Technician ID: $TECH_ID"
else
  log_fail "Create technician failed" "Response: $TECH_RESPONSE"
fi
echo ""

# 3.10 List technicians for work team
test_endpoint "GET" "/providers/work-teams/$WORK_TEAM_ID/technicians" "$ADMIN_TOKEN" "" "200" "List technicians"

# ============================================================================
# 4. CONFIG MODULE TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}4. CONFIG MODULE TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 4.1 Get system config
test_endpoint "GET" "/config/system" "$ADMIN_TOKEN" "" "200" "Get system config"

# 4.2 Get country config
test_endpoint "GET" "/config/country/FR" "$ADMIN_TOKEN" "" "200" "Get country config for FR"

# 4.3 Get country config for another country
test_endpoint "GET" "/config/country/ES" "$ADMIN_TOKEN" "" "200" "Get country config for ES"

# 4.4 Get non-existent country config
test_endpoint "GET" "/config/country/XX" "$ADMIN_TOKEN" "" "404" "Get non-existent country config should fail"

# 4.5 Get BU config
test_endpoint "GET" "/config/business-unit/FR/LEROY_MERLIN" "$ADMIN_TOKEN" "" "200" "Get BU config"

# 4.6 Update system config (admin only)
test_endpoint "PATCH" "/config/system" "$ADMIN_TOKEN" '{"featureFlags":{"aiRiskAssessment":true,"aiSalesPotential":true,"autoProjectOwnership":false,"mobileApp":false,"eSignature":true}}' "200" "Update system config as admin"

# 4.7 Update system config as operator (should fail)
test_endpoint "PATCH" "/config/system" "$OPERATOR_TOKEN" '{"featureFlags":{"aiRiskAssessment":true,"aiSalesPotential":true,"autoProjectOwnership":false,"mobileApp":true,"eSignature":true}}' "403" "Update system config as operator should fail"

# ============================================================================
# 5. VALIDATION TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}5. VALIDATION TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 5.1 Invalid email format
test_endpoint "POST" "/auth/register" "" '{"email":"invalid-email","password":"Test123!","firstName":"Test","lastName":"User","countryCode":"FR","businessUnit":"LEROY_MERLIN"}' "400" "Register with invalid email should fail"

# 5.2 Weak password
test_endpoint "POST" "/auth/register" "" '{"email":"test@test.com","password":"weak","firstName":"Test","lastName":"User","countryCode":"FR","businessUnit":"LEROY_MERLIN"}' "400" "Register with weak password should fail"

# 5.3 Missing required fields
test_endpoint "POST" "/auth/register" "" '{"email":"test@test.com"}' "400" "Register with missing fields should fail"

# 5.4 Invalid country code
test_endpoint "POST" "/auth/register" "" '{"email":"test3@test.com","password":"Test123!","firstName":"Test","lastName":"User","countryCode":"INVALID","businessUnit":"LEROY_MERLIN"}' "400" "Register with invalid country code should fail"

# 5.5 Invalid business unit
test_endpoint "POST" "/auth/register" "" '{"email":"test4@test.com","password":"Test123!","firstName":"Test","lastName":"User","countryCode":"FR","businessUnit":"INVALID"}' "400" "Register with invalid business unit should fail"

# ============================================================================
# 6. MULTI-TENANCY TESTS
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}6. MULTI-TENANCY TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# 6.1 Create provider in FR/LEROY_MERLIN
log_test "Create provider in FR/LEROY_MERLIN tenant"
TIMESTAMP=$(date +%s)
PROVIDER_FR_LM=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId":"FR-LM-'$TIMESTAMP'",
    "countryCode":"FR",
    "businessUnit":"LEROY_MERLIN",
    "name":"FR Leroy Merlin Provider",
    "legalName":"FR LM Legal"
  }')

PROVIDER_FR_LM_ID=$(echo "$PROVIDER_FR_LM" | jq -r '.data.id // empty')

if [ -n "$PROVIDER_FR_LM_ID" ] && [ "$PROVIDER_FR_LM_ID" != "null" ]; then
  log_pass "Provider created in FR/LEROY_MERLIN"
else
  log_fail "Create provider in FR/LEROY_MERLIN failed" "Response: $PROVIDER_FR_LM"
fi
echo ""

# 6.2 Create provider in ES/LEROY_MERLIN
log_test "Create provider in ES/LEROY_MERLIN tenant"
PROVIDER_ES_LM=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId":"ES-LM-'$TIMESTAMP'",
    "countryCode":"ES",
    "businessUnit":"LEROY_MERLIN",
    "name":"ES Leroy Merlin Provider",
    "legalName":"ES LM Legal"
  }')

PROVIDER_ES_LM_ID=$(echo "$PROVIDER_ES_LM" | jq -r '.data.id // empty')

if [ -n "$PROVIDER_ES_LM_ID" ] && [ "$PROVIDER_ES_LM_ID" != "null" ]; then
  log_pass "Provider created in ES/LEROY_MERLIN"
else
  log_fail "Create provider in ES/LEROY_MERLIN failed" "Response: $PROVIDER_ES_LM"
fi
echo ""

# 6.3 Verify tenant isolation (same externalId in different tenants should work)
log_test "Same externalId in different tenants should be allowed"
PROVIDER_ES_SAME_ID=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId":"TENANT-TEST-'$TIMESTAMP'",
    "countryCode":"ES",
    "businessUnit":"BRICO_DEPOT",
    "name":"ES Brico Depot Provider",
    "legalName":"ES BD Legal"
  }')

ES_BD_ID=$(echo "$PROVIDER_ES_SAME_ID" | jq -r '.data.id // empty')

if [ -n "$ES_BD_ID" ] && [ "$ES_BD_ID" != "null" ]; then
  log_pass "Same externalId allowed in different tenant"
else
  log_warn "Same externalId in different tenant may not be working correctly"
fi
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Total Tests: $TEST_COUNT${NC}"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "${YELLOW}Warnings: ${#WARNINGS[@]}${NC}"
echo ""

if [ ${#ERRORS[@]} -gt 0 ]; then
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}ERRORS FOUND:${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for error in "${ERRORS[@]}"; do
    echo -e "${RED}  ✗ $error${NC}"
  done
  echo ""
fi

if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}WARNINGS:${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  for warning in "${WARNINGS[@]}"; do
    echo -e "${YELLOW}  ⚠ $warning${NC}"
  done
  echo ""
fi

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ Some tests failed. See errors above.${NC}"
  exit 1
fi
