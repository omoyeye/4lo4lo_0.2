#!/bin/bash

echo "=== Testing Admin Functionality ==="

# Login as admin first
echo "1. Testing Admin Login..."
curl -s -X POST http://localhost:5000/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin@123!"}' \
  -c admin_test_cookies.txt

echo -e "\n2. Testing Admin Stats..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/stats | jq '.'

echo -e "\n3. Testing Admin Users..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/users | jq 'length'

echo -e "\n4. Testing Admin Tasks..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/tasks | jq 'length'

echo -e "\n5. Testing System DB Status..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/system/db-status | jq '.'

echo -e "\n6. Testing System Metrics..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/system/metrics | jq '.memory'

echo -e "\n7. Testing Promotion Plans..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/promotion/plans | jq 'length'

echo -e "\n8. Testing Promotion Plan Update..."
curl -s -X PATCH http://localhost:5000/api/promotion/plans/1 \
  -H "Content-Type: application/json" \
  -b admin_test_cookies.txt \
  -d '{"name":"API Test Update","price":"9.99"}' | jq '.name'

echo -e "\n9. Testing Promotion Requests..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/promotion/requests | jq 'length'

echo -e "\n10. Testing Task Click Analytics..."
curl -s -b admin_test_cookies.txt http://localhost:5000/api/admin/analytics/task-clicks | jq 'length'

echo -e "\n=== Admin API Tests Complete ==="

# Cleanup
rm -f admin_test_cookies.txt