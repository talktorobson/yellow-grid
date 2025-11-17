#!/bin/bash
curl -s -X POST 'http://localhost:3000/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@adeo.com","password":"Admin123!"}' | jq '.'
