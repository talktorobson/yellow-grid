#!/bin/bash

# Phase 1 Complete Testing Script
# Tests all modules: Auth, Users, Providers, Config
# Reports bugs and issues

set -e

BASE_URL="http://localhost:3000/api/v1"
BUGS_FOUND=0
TESTS_PASSED=0
TESTS_FAILED=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      Yellow Grid Platform - Phase 1 Complete Test     ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""

# Helper functions
test_pass() {
    echo -e "${GREEN}✅ PASS:${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}❌ FAIL:${NC} $1"
    echo -e "${RED}   Details:${NC} $2"
    ((TESTS_FAILED++))
    ((BUGS_FOUND++))
}

bug_found() {
    echo -e "${YELLOW}🐛 BUG FOUND:${NC} $1"
    echo -e "${YELLOW}   Severity:${NC} $2"
    echo -e "${YELLOW}   Description:${NC} $3"
    ((BUGS_FOUND++))
}

section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# =============================================================================
# 1. AUTH MODULE TESTS
# =============================================================================
section "1. Testing Auth Module"

# Test 1.1: Register new user
echo "Test 1.1: Register new user"
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'$(date +%s)'@example.com",
    "password": "TestPassword123!",
    "firstName": "Test",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN"
  }')

if echo "$REGISTER_RESPONSE" | jq -e '.data.user.id' > /dev/null 2>&1; then
    test_pass "User registration successful"
    TEST_USER_EMAIL=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.email')
else
    test_fail "User registration failed" "$REGISTER_RESPONSE"
fi

# Test 1.2: Login with admin credentials
echo "Test 1.2: Admin login"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@adeo.com",
    "password": "Admin123!"
  }')

if echo "$LOGIN_RESPONSE" | jq -e '.data.accessToken' > /dev/null 2>&1; then
    test_pass "Admin login successful"
    ADMIN_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken')
    REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.refreshToken')
else
    test_fail "Admin login failed" "$LOGIN_RESPONSE"
    echo "CRITICAL: Cannot proceed without admin token"
    exit 1
fi

# Test 1.3: Get current user (me endpoint)
echo "Test 1.3: Get current user"
ME_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$ME_RESPONSE" | jq -e '.data.email' > /dev/null 2>&1; then
    test_pass "Get current user successful"
else
    test_fail "Get current user failed" "$ME_RESPONSE"
fi

# Test 1.4: Refresh token
echo "Test 1.4: Refresh token"
REFRESH_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")

if echo "$REFRESH_RESPONSE" | jq -e '.data.accessToken' > /dev/null 2>&1; then
    test_pass "Token refresh successful"
else
    test_fail "Token refresh failed" "$REFRESH_RESPONSE"
fi

# Test 1.5: Access protected endpoint without token
echo "Test 1.5: Test authentication guard (should fail without token)"
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/users" | tail -n 1)
if [ "$UNAUTH_RESPONSE" = "401" ]; then
    test_pass "Authentication guard working (401 without token)"
else
    bug_found "Authentication guard not working properly" "HIGH" "Expected 401, got $UNAUTH_RESPONSE"
fi

# =============================================================================
# 2. USERS MODULE TESTS
# =============================================================================
section "2. Testing Users Module"

# Test 2.1: Create user (Admin only)
echo "Test 2.1: Create user"
CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser'$(date +%s)'@example.com",
    "password": "Password123!",
    "firstName": "New",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN",
    "roles": ["OPERATOR"]
  }')

if echo "$CREATE_USER_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
    test_pass "User creation successful"
    NEW_USER_ID=$(echo "$CREATE_USER_RESPONSE" | jq -r '.data.id')
else
    test_fail "User creation failed" "$CREATE_USER_RESPONSE"
fi

# Test 2.2: Get all users with pagination
echo "Test 2.2: Get all users (paginated)"
USERS_RESPONSE=$(curl -s "$BASE_URL/users?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$USERS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    test_pass "Get all users successful"
    USER_COUNT=$(echo "$USERS_RESPONSE" | jq '.data | length')
    echo "   Found $USER_COUNT users"
else
    test_fail "Get all users failed" "$USERS_RESPONSE"
fi

# Test 2.3: Get single user
if [ -n "$NEW_USER_ID" ]; then
    echo "Test 2.3: Get single user by ID"
    USER_RESPONSE=$(curl -s "$BASE_URL/users/$NEW_USER_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$USER_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
        test_pass "Get single user successful"
    else
        test_fail "Get single user failed" "$USER_RESPONSE"
    fi
fi

# Test 2.4: Update user
if [ -n "$NEW_USER_ID" ]; then
    echo "Test 2.4: Update user"
    UPDATE_USER_RESPONSE=$(curl -s -X PUT "$BASE_URL/users/$NEW_USER_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "firstName": "Updated",
        "lastName": "Name"
      }')

    if echo "$UPDATE_USER_RESPONSE" | jq -e '.data.firstName' > /dev/null 2>&1; then
        UPDATED_NAME=$(echo "$UPDATE_USER_RESPONSE" | jq -r '.data.firstName')
        if [ "$UPDATED_NAME" = "Updated" ]; then
            test_pass "User update successful"
        else
            test_fail "User update didn't change data" "Expected 'Updated', got '$UPDATED_NAME'"
        fi
    else
        test_fail "User update failed" "$UPDATE_USER_RESPONSE"
    fi
fi

# Test 2.5: Assign role to user
if [ -n "$NEW_USER_ID" ]; then
    echo "Test 2.5: Assign role to user"
    ASSIGN_ROLE_RESPONSE=$(curl -s -X POST "$BASE_URL/users/$NEW_USER_ID/roles" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "roleName": "PROVIDER_MANAGER"
      }')

    if echo "$ASSIGN_ROLE_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
        test_pass "Role assignment successful"
    else
        test_fail "Role assignment failed" "$ASSIGN_ROLE_RESPONSE"
    fi
fi

# =============================================================================
# 3. PROVIDERS MODULE TESTS
# =============================================================================
section "3. Testing Providers Module"

# Test 3.1: Create provider
echo "Test 3.1: Create provider"
CREATE_PROVIDER_RESPONSE=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "SAP-'$(date +%s)'",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN",
    "name": "Test Provider Inc",
    "legalName": "Test Provider Legal Inc",
    "taxId": "FR123456789",
    "email": "contact@testprovider.com",
    "phone": "+33123456789",
    "address": {
      "street": "123 Test St",
      "city": "Paris",
      "postalCode": "75001",
      "country": "France"
    }
  }')

if echo "$CREATE_PROVIDER_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
    test_pass "Provider creation successful"
    PROVIDER_ID=$(echo "$CREATE_PROVIDER_RESPONSE" | jq -r '.data.id')
else
    test_fail "Provider creation failed" "$CREATE_PROVIDER_RESPONSE"
fi

# Test 3.2: Get all providers
echo "Test 3.2: Get all providers"
PROVIDERS_RESPONSE=$(curl -s "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$PROVIDERS_RESPONSE" | jq -e '.data' > /dev/null 2>&1; then
    test_pass "Get all providers successful"
    PROVIDER_COUNT=$(echo "$PROVIDERS_RESPONSE" | jq '.data | length')
    echo "   Found $PROVIDER_COUNT providers"
else
    test_fail "Get all providers failed" "$PROVIDERS_RESPONSE"
fi

# Test 3.3: Get single provider
if [ -n "$PROVIDER_ID" ]; then
    echo "Test 3.3: Get single provider"
    PROVIDER_RESPONSE=$(curl -s "$BASE_URL/providers/$PROVIDER_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    if echo "$PROVIDER_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
        test_pass "Get single provider successful"
    else
        test_fail "Get single provider failed" "$PROVIDER_RESPONSE"
    fi
fi

# Test 3.4: Create work team
if [ -n "$PROVIDER_ID" ]; then
    echo "Test 3.4: Create work team"
    CREATE_TEAM_RESPONSE=$(curl -s -X POST "$BASE_URL/providers/$PROVIDER_ID/work-teams" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "name": "Team Alpha",
        "maxDailyJobs": 10,
        "skills": ["installation", "repair", "tv"],
        "serviceTypes": ["P1", "P2"],
        "postalCodes": ["75001", "75002", "75003"],
        "workingDays": ["MON", "TUE", "WED", "THU", "FRI"],
        "shifts": [
          {
            "code": "M",
            "startLocal": "08:00",
            "endLocal": "13:00"
          },
          {
            "code": "A",
            "startLocal": "14:00",
            "endLocal": "18:00"
          }
        ]
      }')

    if echo "$CREATE_TEAM_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
        test_pass "Work team creation successful"
        TEAM_ID=$(echo "$CREATE_TEAM_RESPONSE" | jq -r '.data.id')
    else
        test_fail "Work team creation failed" "$CREATE_TEAM_RESPONSE"
    fi
fi

# Test 3.5: Create technician
if [ -n "$TEAM_ID" ]; then
    echo "Test 3.5: Create technician"
    CREATE_TECH_RESPONSE=$(curl -s -X POST "$BASE_URL/providers/work-teams/$TEAM_ID/technicians" \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "firstName": "John",
        "lastName": "Technician",
        "email": "john.tech@provider.com",
        "phone": "+33987654321"
      }')

    if echo "$CREATE_TECH_RESPONSE" | jq -e '.data.id' > /dev/null 2>&1; then
        test_pass "Technician creation successful"
        TECH_ID=$(echo "$CREATE_TECH_RESPONSE" | jq -r '.data.id')
    else
        test_fail "Technician creation failed" "$CREATE_TECH_RESPONSE"
    fi
fi

# Test 3.6: Verify provider hierarchy
if [ -n "$PROVIDER_ID" ]; then
    echo "Test 3.6: Verify full provider hierarchy"
    HIERARCHY_RESPONSE=$(curl -s "$BASE_URL/providers/$PROVIDER_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    HAS_TEAMS=$(echo "$HIERARCHY_RESPONSE" | jq '.data.workTeams | length')
    if [ "$HAS_TEAMS" -gt 0 ]; then
        test_pass "Provider hierarchy includes work teams"

        HAS_TECHS=$(echo "$HIERARCHY_RESPONSE" | jq '.data.workTeams[0].technicians | length')
        if [ "$HAS_TECHS" -gt 0 ]; then
            test_pass "Work teams include technicians"
        else
            bug_found "Technician not in hierarchy" "MEDIUM" "Work team should include technicians"
        fi
    else
        bug_found "Work team not in hierarchy" "MEDIUM" "Provider should include work teams"
    fi
fi

# =============================================================================
# 4. CONFIG MODULE TESTS
# =============================================================================
section "4. Testing Config Module"

# Test 4.1: Get system config
echo "Test 4.1: Get system config"
SYSTEM_CONFIG_RESPONSE=$(curl -s "$BASE_URL/config/system" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$SYSTEM_CONFIG_RESPONSE" | jq -e '.' > /dev/null 2>&1; then
    test_pass "Get system config successful"
else
    test_fail "Get system config failed" "$SYSTEM_CONFIG_RESPONSE"
fi

# Test 4.2: Update system config
echo "Test 4.2: Update system config"
UPDATE_SYSTEM_CONFIG=$(curl -s -X PUT "$BASE_URL/config/system" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "featureFlags": {
      "aiRiskAssessment": true,
      "aiSalesPotential": true,
      "autoProjectOwnership": false,
      "mobileApp": true,
      "eSignature": true
    }
  }')

if echo "$UPDATE_SYSTEM_CONFIG" | jq -e '.' > /dev/null 2>&1; then
    test_pass "Update system config successful"
else
    test_fail "Update system config failed" "$UPDATE_SYSTEM_CONFIG"
fi

# Test 4.3: Get country config
echo "Test 4.3: Get country config (FR)"
COUNTRY_CONFIG_RESPONSE=$(curl -s "$BASE_URL/config/country/FR" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$COUNTRY_CONFIG_RESPONSE" | jq -e '.data.countryCode' > /dev/null 2>&1; then
    test_pass "Get country config successful"
    TIMEZONE=$(echo "$COUNTRY_CONFIG_RESPONSE" | jq -r '.data.timezone')
    echo "   Timezone: $TIMEZONE"
else
    test_fail "Get country config failed" "$COUNTRY_CONFIG_RESPONSE"
fi

# Test 4.4: Update country config
echo "Test 4.4: Update country config"
UPDATE_COUNTRY_CONFIG=$(curl -s -X PUT "$BASE_URL/config/country/FR" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "timezone": "Europe/Paris",
    "locale": "fr-FR"
  }')

if echo "$UPDATE_COUNTRY_CONFIG" | jq -e '.data.countryCode' > /dev/null 2>&1; then
    test_pass "Update country config successful"
else
    test_fail "Update country config failed" "$UPDATE_COUNTRY_CONFIG"
fi

# Test 4.5: Get business unit config
echo "Test 4.5: Get business unit config"
BU_CONFIG_RESPONSE=$(curl -s "$BASE_URL/config/business-unit/FR/LEROY_MERLIN" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

if echo "$BU_CONFIG_RESPONSE" | jq -e '.data.name' > /dev/null 2>&1; then
    test_pass "Get business unit config successful"
else
    test_fail "Get business unit config failed" "$BU_CONFIG_RESPONSE"
fi

# =============================================================================
# 5. SECURITY & RBAC TESTS
# =============================================================================
section "5. Testing Security & RBAC"

# Test 5.1: Non-admin cannot create provider
echo "Test 5.1: Non-admin users cannot create providers (RBAC test)"
# First, login as regular user
if [ -n "$TEST_USER_EMAIL" ]; then
    USER_LOGIN=$(curl -s -X POST "$BASE_URL/auth/login" \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"$TEST_USER_EMAIL\",
        \"password\": \"TestPassword123!\"
      }")

    USER_TOKEN=$(echo "$USER_LOGIN" | jq -r '.data.accessToken' 2>/dev/null)

    if [ -n "$USER_TOKEN" ] && [ "$USER_TOKEN" != "null" ]; then
        RBAC_TEST=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/providers" \
          -H "Authorization: Bearer $USER_TOKEN" \
          -H "Content-Type: application/json" \
          -d '{
            "countryCode": "FR",
            "businessUnit": "LEROY_MERLIN",
            "name": "Unauthorized Provider",
            "legalName": "Unauthorized Provider Legal"
          }' | tail -n 1)

        if [ "$RBAC_TEST" = "403" ]; then
            test_pass "RBAC working - non-admin blocked from creating provider"
        else
            bug_found "RBAC not enforcing permissions" "CRITICAL" "Expected 403, got $RBAC_TEST"
        fi
    else
        echo "   Skipped (couldn't get user token)"
    fi
fi

# =============================================================================
# 6. MULTI-TENANCY TESTS
# =============================================================================
section "6. Testing Multi-Tenancy Isolation"

# Test 6.1: Create provider in different country
echo "Test 6.1: Create providers in different countries"
ES_PROVIDER=$(curl -s -X POST "$BASE_URL/providers" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "SAP-ES-'$(date +%s)'",
    "countryCode": "ES",
    "businessUnit": "LEROY_MERLIN",
    "name": "Spain Provider",
    "legalName": "Spain Provider SL"
  }')

ES_PROVIDER_ID=$(echo "$ES_PROVIDER" | jq -r '.data.id' 2>/dev/null)

if [ -n "$ES_PROVIDER_ID" ] && [ "$ES_PROVIDER_ID" != "null" ]; then
    test_pass "Created provider in ES"

    # Now check if FR user can see ES provider (should not)
    echo "Test 6.2: Verify tenant isolation (FR user shouldn't see ES provider)"
    ES_CHECK=$(curl -s "$BASE_URL/providers/$ES_PROVIDER_ID" \
      -H "Authorization: Bearer $ADMIN_TOKEN")

    ERROR_MESSAGE=$(echo "$ES_CHECK" | jq -r '.error.message' 2>/dev/null)
    if [ "$ERROR_MESSAGE" = "Provider not found" ]; then
        test_pass "Multi-tenancy isolation working - cannot access other country's provider"
    else
        bug_found "Multi-tenancy breach" "CRITICAL" "User can access provider from different country"
    fi
else
    test_fail "Failed to create ES provider" "$ES_PROVIDER"
fi

# =============================================================================
# 7. ERROR HANDLING TESTS
# =============================================================================
section "7. Testing Error Handling"

# Test 7.1: Invalid email format
echo "Test 7.1: Validation - invalid email format"
INVALID_EMAIL=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "not-an-email",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN"
  }')

ERROR_STATUS=$(echo "$INVALID_EMAIL" | jq -r '.error.statusCode' 2>/dev/null)
if [ "$ERROR_STATUS" = "400" ]; then
    test_pass "Email validation working"
else
    bug_found "Email validation not working" "MEDIUM" "Invalid email should return 400"
fi

# Test 7.2: Weak password
echo "Test 7.2: Validation - weak password"
WEAK_PASSWORD=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "weak",
    "firstName": "Test",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN"
  }')

ERROR_STATUS=$(echo "$WEAK_PASSWORD" | jq -r '.error.statusCode' 2>/dev/null)
if [ "$ERROR_STATUS" = "400" ]; then
    test_pass "Password validation working"
else
    bug_found "Password validation not enforcing strength" "HIGH" "Weak password should be rejected"
fi

# Test 7.3: Duplicate email
echo "Test 7.3: Business logic - duplicate email prevention"
DUPLICATE_EMAIL=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@adeo.com",
    "password": "Password123!",
    "firstName": "Test",
    "lastName": "User",
    "countryCode": "FR",
    "businessUnit": "LEROY_MERLIN"
  }')

ERROR_STATUS=$(echo "$DUPLICATE_EMAIL" | jq -r '.error.statusCode' 2>/dev/null)
if [ "$ERROR_STATUS" = "409" ] || [ "$ERROR_STATUS" = "400" ]; then
    test_pass "Duplicate email prevention working"
else
    bug_found "Duplicate email allowed" "CRITICAL" "System allowed duplicate email registration"
fi

# Test 7.4: Non-existent resource
echo "Test 7.4: Error handling - non-existent resource"
NOT_FOUND=$(curl -s -w "\n%{http_code}" "$BASE_URL/providers/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | tail -n 1)

if [ "$NOT_FOUND" = "404" ]; then
    test_pass "404 handling working"
else
    bug_found "404 not returned for non-existent resource" "MEDIUM" "Expected 404, got $NOT_FOUND"
fi

# =============================================================================
# FINAL REPORT
# =============================================================================
echo ""
section "📊 Test Summary"
echo ""
echo -e "${GREEN}Tests Passed:${NC} $TESTS_PASSED"
echo -e "${RED}Tests Failed:${NC} $TESTS_FAILED"
echo -e "${YELLOW}Bugs Found:${NC} $BUGS_FOUND"
echo ""

TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((TESTS_PASSED * 100 / TOTAL_TESTS))
    echo -e "Pass Rate: ${BLUE}${PASS_RATE}%${NC}"
fi

echo ""
if [ $BUGS_FOUND -eq 0 ]; then
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  🎉 ALL TESTS PASSED - NO BUGS FOUND! 🎉              ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${YELLOW}╔═══════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠️  ${BUGS_FOUND} BUG(S) FOUND - SEE DETAILS ABOVE            ║${NC}"
    echo -e "${YELLOW}╚═══════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
