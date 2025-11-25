#!/bin/bash
curl -v -X POST 'http://localhost/api/v1/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@adeo.com","password":"Admin123!"}'
