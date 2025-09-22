#!/bin/bash

echo "🔍 Otto Platform Integration Test"
echo "================================="
echo ""

# Check services
echo "📌 Checking Services Status:"
echo ""

# Check PostgreSQL
echo -n "PostgreSQL (5432): "
if nc -z localhost 5432 2>/dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Redis
echo -n "Redis (6379): "
if nc -z localhost 6379 2>/dev/null; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Backend
echo -n "Backend API (4000): "
if curl -s http://localhost:4000/api/v1 > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

# Check Frontend
echo -n "Frontend (5174): "
if curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "✅ Running"
else
    echo "❌ Not running"
fi

echo ""
echo "📌 Testing WebSocket Connection:"
echo ""

# Test WebSocket namespace
echo -n "WebSocket /logs namespace: "
if curl -s http://localhost:4000/socket.io/ > /dev/null 2>&1; then
    echo "✅ Available"
else
    echo "⚠️  May require socket.io client"
fi

echo ""
echo "📌 Testing API Endpoints:"
echo ""

# Test logs endpoint
echo -n "Logs API: "
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/v1/logs/executions)
if [ "$response" = "401" ] || [ "$response" = "200" ]; then
    echo "✅ Responding (HTTP $response)"
else
    echo "❌ Not responding"
fi

echo ""
echo "================================="
echo "✅ Integration test complete!"
echo ""
echo "📝 Next steps:"
echo "1. Open http://localhost:5174/test-websocket"
echo "2. Test WebSocket connection (port 4000)"
echo "3. Start Mock Server to simulate logs"
echo "4. Check real-time log streaming"