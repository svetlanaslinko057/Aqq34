"""
Token Runner API Tests (Stage C)
Tests for Token Runner batch analysis and Ranking v2 Engine integration

Features tested:
- POST /api/token-runner/run - Batch token analysis
- GET /api/token-runner/stats - Analysis statistics
- GET /api/token-runner/analysis/:symbol - Single token analysis
- GET /api/token-runner/top - Top tokens by engine score
- GET /api/token-runner/analyses - All analyses with pagination
- Ranking v2 integration with Engine data
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crypto-analyzer-39.preview.emergentagent.com')


class TestTokenRunnerStats:
    """Token Runner Stats API tests"""
    
    def test_get_analysis_stats(self):
        """GET /api/token-runner/stats - Returns analysis statistics"""
        response = requests.get(f"{BASE_URL}/api/token-runner/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        stats = data["data"]
        assert "totalAnalyses" in stats
        assert "completed" in stats
        assert "failed" in stats
        assert "byLabel" in stats
        
        # Verify types
        assert isinstance(stats["totalAnalyses"], int)
        assert isinstance(stats["completed"], int)
        assert isinstance(stats["failed"], int)
        assert isinstance(stats["byLabel"], dict)
        
        print(f"✓ Analysis stats: total={stats['totalAnalyses']}, completed={stats['completed']}, failed={stats['failed']}")
        print(f"  By label: {stats['byLabel']}")
        
        # Store for later assertions
        return stats


class TestTokenRunnerAnalyses:
    """Token Runner Analyses API tests"""
    
    def test_get_all_analyses(self):
        """GET /api/token-runner/analyses - Returns all analyses with pagination"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "analyses" in result
        assert "total" in result
        assert "limit" in result
        assert "offset" in result
        assert "hasMore" in result
        
        analyses = result["analyses"]
        assert isinstance(analyses, list)
        
        # Verify analysis structure if we have data
        if analyses:
            analysis = analyses[0]
            assert "symbol" in analysis
            assert "contractAddress" in analysis
            assert "engineScore" in analysis
            assert "confidence" in analysis
            assert "risk" in analysis
            assert "engineLabel" in analysis
            assert "status" in analysis
            
            print(f"✓ Analyses list: {len(analyses)} returned, total: {result['total']}")
            print(f"  First analysis: {analysis['symbol']} - score={analysis['engineScore']}, label={analysis['engineLabel']}")
        else:
            print("✓ Analyses list: 0 analyses (empty)")
    
    def test_get_analyses_with_status_filter(self):
        """GET /api/token-runner/analyses?status=completed - Filter by status"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?status=completed&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        
        result = data["data"]
        analyses = result["analyses"]
        
        # All returned analyses should have completed status
        for analysis in analyses:
            assert analysis["status"] == "completed"
        
        print(f"✓ Completed analyses: {len(analyses)} returned")
    
    def test_get_analyses_with_label_filter(self):
        """GET /api/token-runner/analyses?label=NEUTRAL - Filter by label"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?label=NEUTRAL&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        
        result = data["data"]
        analyses = result["analyses"]
        
        # All returned analyses should have NEUTRAL label
        for analysis in analyses:
            assert analysis["engineLabel"] == "NEUTRAL"
        
        print(f"✓ NEUTRAL analyses: {len(analyses)} returned")


class TestTokenRunnerSingleAnalysis:
    """Token Runner Single Analysis API tests"""
    
    def test_get_single_token_analysis(self):
        """GET /api/token-runner/analysis/:symbol - Get analysis for specific token"""
        # First get a token that has analysis
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?limit=1")
        data = response.json()
        
        if data["ok"] and data["data"]["analyses"]:
            symbol = data["data"]["analyses"][0]["symbol"]
            
            # Now get single analysis
            response = requests.get(f"{BASE_URL}/api/token-runner/analysis/{symbol}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert "data" in data
            
            analysis = data["data"]
            assert analysis["symbol"] == symbol
            assert "engineScore" in analysis
            assert "confidence" in analysis
            assert "risk" in analysis
            assert "engineLabel" in analysis
            assert "engineStrength" in analysis
            assert "coverage" in analysis
            assert "analyzedAt" in analysis
            
            print(f"✓ Single analysis: {symbol} - score={analysis['engineScore']}, confidence={analysis['confidence']}")
        else:
            pytest.skip("No analyses available to test single lookup")
    
    def test_get_nonexistent_token_analysis(self):
        """GET /api/token-runner/analysis/:symbol - Returns error for unknown token"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analysis/NONEXISTENT_TOKEN_XYZ")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is False
        assert "error" in data
        
        print(f"✓ Nonexistent token handled: {data['error']}")


class TestTokenRunnerTop:
    """Token Runner Top Tokens API tests"""
    
    def test_get_top_by_engine_score(self):
        """GET /api/token-runner/top - Get top tokens by engine score"""
        response = requests.get(f"{BASE_URL}/api/token-runner/top?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "tokens" in result
        assert "count" in result
        
        tokens = result["tokens"]
        assert isinstance(tokens, list)
        
        # Verify tokens are sorted by engine score (descending)
        if len(tokens) > 1:
            for i in range(len(tokens) - 1):
                assert tokens[i]["engineScore"] >= tokens[i + 1]["engineScore"], \
                    f"Tokens not sorted by engineScore: {tokens[i]['engineScore']} < {tokens[i+1]['engineScore']}"
        
        if tokens:
            print(f"✓ Top tokens: {result['count']} returned")
            print(f"  Top 3: {[t['symbol'] + '=' + str(t['engineScore']) for t in tokens[:3]]}")
        else:
            print("✓ Top tokens: 0 (no analyses yet)")


class TestTokenRunnerRun:
    """Token Runner Run API tests"""
    
    def test_run_token_runner_batch(self):
        """POST /api/token-runner/run - Run batch token analysis"""
        # Run with small batch for testing
        response = requests.post(
            f"{BASE_URL}/api/token-runner/run",
            json={"batchSize": 5, "mode": "fast"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "processed" in result
        assert "successful" in result
        assert "failed" in result
        assert "skipped" in result
        assert "duration_ms" in result
        assert "tokens" in result
        
        # Verify counts
        assert isinstance(result["processed"], int)
        assert isinstance(result["successful"], int)
        assert isinstance(result["failed"], int)
        assert result["processed"] == result["successful"] + result["failed"] + result["skipped"]
        
        # Verify token results structure
        tokens = result["tokens"]
        assert isinstance(tokens, list)
        
        if tokens:
            token = tokens[0]
            assert "symbol" in token
            assert "contractAddress" in token
            assert "engineScore" in token
            assert "confidence" in token
            assert "risk" in token
            assert "label" in token
            assert "status" in token
            assert "processingTime" in token
        
        print(f"✓ Token Runner batch: processed={result['processed']}, successful={result['successful']}, failed={result['failed']}")
        print(f"  Duration: {result['duration_ms']}ms")


class TestRankingV2Integration:
    """Ranking v2 with Engine integration tests"""
    
    def test_compute_rankings_with_engine_data(self):
        """POST /api/rankings/compute - Returns withEngineData count"""
        response = requests.post(f"{BASE_URL}/api/rankings/compute")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "computed" in result
        assert "buckets" in result
        assert "withEngineData" in result
        assert "withoutEngineData" in result
        
        # Verify bucket counts
        buckets = result["buckets"]
        assert "BUY" in buckets
        assert "WATCH" in buckets
        assert "SELL" in buckets
        
        # Total should match computed
        total_buckets = buckets["BUY"] + buckets["WATCH"] + buckets["SELL"]
        assert total_buckets == result["computed"]
        
        # Engine data counts should add up
        assert result["withEngineData"] + result["withoutEngineData"] == result["computed"]
        
        print(f"✓ Rankings computed: {result['computed']} tokens")
        print(f"  Buckets: BUY={buckets['BUY']}, WATCH={buckets['WATCH']}, SELL={buckets['SELL']}")
        print(f"  With Engine: {result['withEngineData']}, Without: {result['withoutEngineData']}")
    
    def test_buckets_summary_with_engine_data(self):
        """GET /api/rankings/buckets - Returns withEngineData field"""
        response = requests.get(f"{BASE_URL}/api/rankings/buckets")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        summary = data["data"]
        assert "BUY" in summary
        assert "WATCH" in summary
        assert "SELL" in summary
        assert "total" in summary
        assert "withEngineData" in summary
        
        # Verify withEngineData is a valid count
        assert isinstance(summary["withEngineData"], int)
        assert summary["withEngineData"] >= 0
        assert summary["withEngineData"] <= summary["total"]
        
        print(f"✓ Buckets summary: BUY={summary['BUY']}, WATCH={summary['WATCH']}, SELL={summary['SELL']}")
        print(f"  Total: {summary['total']}, With Engine: {summary['withEngineData']}")
    
    def test_dashboard_tokens_have_engine_confidence(self):
        """GET /api/rankings/dashboard - Tokens have engineConfidence field"""
        response = requests.get(f"{BASE_URL}/api/rankings/dashboard?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        
        dashboard = data["data"]
        buckets = dashboard["buckets"]
        
        # Check tokens in each bucket have engineConfidence
        for bucket_name in ["BUY", "WATCH", "SELL"]:
            tokens = buckets[bucket_name]
            for token in tokens:
                assert "engineConfidence" in token, f"Token {token.get('symbol')} missing engineConfidence"
                assert isinstance(token["engineConfidence"], (int, float))
        
        print("✓ Dashboard tokens have engineConfidence field")


class TestIntegrationFlow:
    """End-to-end integration tests"""
    
    def test_full_flow_runner_then_rankings(self):
        """Integration: Run token-runner then compute rankings, verify Engine data is used"""
        # Step 1: Get initial stats
        stats_response = requests.get(f"{BASE_URL}/api/token-runner/stats")
        initial_stats = stats_response.json()["data"]
        print(f"Initial stats: {initial_stats['totalAnalyses']} analyses")
        
        # Step 2: Run token runner (small batch)
        run_response = requests.post(
            f"{BASE_URL}/api/token-runner/run",
            json={"batchSize": 3, "mode": "fast"}
        )
        run_result = run_response.json()["data"]
        print(f"Runner result: processed={run_result['processed']}, successful={run_result['successful']}")
        
        # Step 3: Compute rankings
        rankings_response = requests.post(f"{BASE_URL}/api/rankings/compute")
        rankings_result = rankings_response.json()["data"]
        print(f"Rankings: computed={rankings_result['computed']}, withEngine={rankings_result['withEngineData']}")
        
        # Step 4: Verify Engine data is being used
        assert rankings_result["withEngineData"] > 0, "No tokens have Engine data after running token-runner"
        
        # Step 5: Check buckets summary
        buckets_response = requests.get(f"{BASE_URL}/api/rankings/buckets")
        buckets = buckets_response.json()["data"]
        
        assert buckets["withEngineData"] > 0, "Buckets summary shows no Engine data"
        
        print(f"✓ Integration flow complete:")
        print(f"  - Token Runner processed {run_result['processed']} tokens")
        print(f"  - Rankings computed with {rankings_result['withEngineData']} Engine-analyzed tokens")
        print(f"  - Buckets: BUY={buckets['BUY']}, WATCH={buckets['WATCH']}, SELL={buckets['SELL']}")


class TestEngineScoreValidation:
    """Validate Engine scores and labels"""
    
    def test_engine_scores_in_valid_range(self):
        """Verify all engine scores are between 0-100"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?limit=50")
        data = response.json()
        
        if data["ok"] and data["data"]["analyses"]:
            analyses = data["data"]["analyses"]
            
            for analysis in analyses:
                assert 0 <= analysis["engineScore"] <= 100, \
                    f"{analysis['symbol']} has invalid engineScore: {analysis['engineScore']}"
                assert 0 <= analysis["confidence"] <= 100, \
                    f"{analysis['symbol']} has invalid confidence: {analysis['confidence']}"
                assert 0 <= analysis["risk"] <= 100, \
                    f"{analysis['symbol']} has invalid risk: {analysis['risk']}"
            
            print(f"✓ All {len(analyses)} analyses have valid score ranges (0-100)")
        else:
            pytest.skip("No analyses available to validate")
    
    def test_engine_labels_are_valid(self):
        """Verify all engine labels are BUY/SELL/NEUTRAL"""
        response = requests.get(f"{BASE_URL}/api/token-runner/analyses?limit=50")
        data = response.json()
        
        if data["ok"] and data["data"]["analyses"]:
            analyses = data["data"]["analyses"]
            valid_labels = {"BUY", "SELL", "NEUTRAL"}
            
            for analysis in analyses:
                assert analysis["engineLabel"] in valid_labels, \
                    f"{analysis['symbol']} has invalid label: {analysis['engineLabel']}"
            
            # Count labels
            label_counts = {}
            for analysis in analyses:
                label = analysis["engineLabel"]
                label_counts[label] = label_counts.get(label, 0) + 1
            
            print(f"✓ All {len(analyses)} analyses have valid labels")
            print(f"  Label distribution: {label_counts}")
        else:
            pytest.skip("No analyses available to validate")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
