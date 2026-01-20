#!/bin/bash
# P3 Bootstrap Automation Script
# Периодически генерирует decisions для накопления variance

echo "🚀 P3 Bootstrap Automation Started"
echo "=================================="
echo ""

BACKEND_URL="http://localhost:8002"
INTERVAL_SECONDS=900  # 15 минут
TOTAL_RUNS=12         # 12 запусков = 3 часа

for i in $(seq 1 $TOTAL_RUNS); do
  echo "🔄 Run $i/$TOTAL_RUNS at $(date '+%H:%M:%S')"
  
  # Generate decisions
  echo "  → Generating decisions..."
  RESULT=$(curl -s -X POST "$BACKEND_URL/api/engine/bootstrap/decisions" \
    -H "Content-Type: application/json" \
    -d '{"decisionsPerRegime":20,"windows":["1h","6h","24h"]}')
  
  TOTAL=$(echo "$RESULT" | jq -r '.data.total // 0')
  VARIANCE=$(echo "$RESULT" | jq -r '.data.coverageStats.variance // 0')
  P3_STATUS=$(echo "$RESULT" | jq -r '.p3Status // "unknown"')
  
  echo "  ✓ Generated: $TOTAL decisions"
  echo "  ✓ Coverage variance: $VARIANCE"
  echo "  ✓ P3 Status: $P3_STATUS"
  
  # Check P3 status
  echo "  → Checking P3 unlock status..."
  STATUS=$(curl -s "$BACKEND_URL/api/engine/bootstrap/status")
  
  TOTAL_DECISIONS=$(echo "$STATUS" | jq -r '.data.decisions.total // 0')
  COVERAGE_VARIANCE=$(echo "$STATUS" | jq -r '.data.coverage.variance // 0')
  P3_UNLOCKED=$(echo "$STATUS" | jq -r '.data.p3.unlocked // false')
  
  echo "  ✓ Total decisions: $TOTAL_DECISIONS / 300"
  echo "  ✓ Coverage variance: $COVERAGE_VARIANCE"
  echo "  ✓ P3 Unlocked: $P3_UNLOCKED"
  echo ""
  
  # Check if P3 is unlocked
  if [ "$P3_UNLOCKED" = "true" ]; then
    echo "🎉 P3 UNLOCKED! ML Training can now start."
    echo "=================================="
    break
  fi
  
  # Wait before next run
  if [ $i -lt $TOTAL_RUNS ]; then
    echo "⏳ Waiting $INTERVAL_SECONDS seconds..."
    echo ""
    sleep $INTERVAL_SECONDS
  fi
done

echo ""
echo "✅ Bootstrap automation completed"
echo "=================================="
echo ""
echo "📊 Final Status:"
curl -s "$BACKEND_URL/api/engine/bootstrap/status" | jq '.data'
