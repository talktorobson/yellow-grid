#!/bin/bash
# SSL Diagnostic Script for goexec.de
# Run this on the VPS to diagnose SSL certificate issues

echo "🔍 SSL Certificate Diagnostic Report"
echo "===================================="
echo ""

echo "1️⃣ Checking DNS Resolution..."
echo "----------------------------"
dig +short goexec.de
dig +short www.goexec.de
echo ""

echo "2️⃣ Checking Docker Containers Status..."
echo "---------------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "3️⃣ Checking Port 80 and 443..."
echo "------------------------------"
netstat -tlnp | grep -E ':80|:443' || ss -tlnp | grep -E ':80|:443'
echo ""

echo "4️⃣ Caddy Container Logs (Last 50 lines)..."
echo "------------------------------------------"
docker logs yellow-grid-demo-frontend --tail 50
echo ""

echo "5️⃣ Testing HTTP Access (port 80)..."
echo "-----------------------------------"
curl -I http://goexec.de 2>&1 | head -10
echo ""

echo "6️⃣ Testing HTTPS Access (port 443)..."
echo "-------------------------------------"
curl -Ik https://goexec.de 2>&1 | head -20
echo ""

echo "7️⃣ Checking Let's Encrypt Certificate..."
echo "----------------------------------------"
docker exec yellow-grid-demo-frontend ls -la /data/caddy/certificates/acme-v02.api.letsencrypt.org-directory/ 2>/dev/null || echo "No Let's Encrypt certificates found"
echo ""

echo "8️⃣ Checking Caddy Configuration..."
echo "----------------------------------"
docker exec yellow-grid-demo-frontend cat /etc/caddy/Caddyfile
echo ""

echo "9️⃣ Checking Firewall Status..."
echo "------------------------------"
ufw status || iptables -L -n | grep -E '80|443' || echo "No firewall detected"
echo ""

echo "🔟 Recommendations..."
echo "--------------------"
echo "If you see errors above, common fixes:"
echo "  • Port 80 blocked: Let's Encrypt needs port 80 for HTTP-01 challenge"
echo "  • DNS not resolving: Wait 5-10 minutes for DNS propagation"
echo "  • Certificate errors: Try 'docker restart yellow-grid-demo-frontend'"
echo ""
echo "To manually trigger certificate refresh:"
echo "  docker exec yellow-grid-demo-frontend caddy reload --config /etc/caddy/Caddyfile"
