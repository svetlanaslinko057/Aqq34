"""
Blockchain Analyzer API Tests
Tests for Token Universe, Rankings, and ML Runtime APIs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://crypto-analyzer-39.preview.emergentagent.com')


class TestTokenUniverseAPI:
    """Token Universe API tests (Stage B)"""
    
    def test_get_token_stats(self):
        """GET /api/tokens/stats - Returns token universe statistics"""
        response = requests.get(f"{BASE_URL}/api/tokens/stats")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        stats = data["data"]
        assert "totalTokens" in stats
        assert "activeTokens" in stats
        assert "byChain" in stats
        assert "bySource" in stats
        assert "topTokens" in stats
        assert isinstance(stats["totalTokens"], int)
        assert stats["totalTokens"] > 0
        print(f"✓ Token stats: {stats['totalTokens']} total tokens")
    
    def test_get_tokens_list(self):
        """GET /api/tokens - Returns paginated token list"""
        response = requests.get(f"{BASE_URL}/api/tokens?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "tokens" in result
        assert "total" in result
        assert "limit" in result
        assert "offset" in result
        assert "hasMore" in result
        
        tokens = result["tokens"]
        assert isinstance(tokens, list)
        assert len(tokens) <= 10
        
        # Verify token structure
        if tokens:
            token = tokens[0]
            assert "symbol" in token
            assert "name" in token
            assert "contractAddress" in token
            assert "chainId" in token
            assert "marketCap" in token
            print(f"✓ Token list: {len(tokens)} tokens returned, total: {result['total']}")
    
    def test_get_tokens_with_search(self):
        """GET /api/tokens?search=ETH - Search tokens by symbol/name"""
        response = requests.get(f"{BASE_URL}/api/tokens?search=ETH&limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        print(f"✓ Token search for 'ETH': {data['data']['total']} results")
    
    def test_get_single_token(self):
        """GET /api/tokens/:symbol - Get single token by symbol"""
        response = requests.get(f"{BASE_URL}/api/tokens/USDT")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        token = data["data"]
        assert token["symbol"] == "USDT"
        assert "name" in token
        assert "contractAddress" in token
        print(f"✓ Single token: {token['symbol']} - {token['name']}")
    
    def test_get_top_tokens(self):
        """GET /api/tokens/top - Get top tokens by market cap"""
        response = requests.get(f"{BASE_URL}/api/tokens/top?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "tokens" in result
        assert "count" in result
        print(f"✓ Top tokens: {result['count']} tokens")


class TestRankingsAPI:
    """Rankings & Buckets API tests (Stage D)"""
    
    def test_get_buckets_summary(self):
        """GET /api/rankings/buckets - Returns bucket counts"""
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
        
        # Verify counts are integers
        assert isinstance(summary["BUY"], int)
        assert isinstance(summary["WATCH"], int)
        assert isinstance(summary["SELL"], int)
        assert isinstance(summary["total"], int)
        
        # Total should equal sum of buckets
        assert summary["total"] == summary["BUY"] + summary["WATCH"] + summary["SELL"]
        print(f"✓ Buckets: BUY={summary['BUY']}, WATCH={summary['WATCH']}, SELL={summary['SELL']}, Total={summary['total']}")
    
    def test_get_dashboard_data(self):
        """GET /api/rankings/dashboard - Returns all buckets with tokens"""
        response = requests.get(f"{BASE_URL}/api/rankings/dashboard?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        dashboard = data["data"]
        assert "summary" in dashboard
        assert "buckets" in dashboard
        
        buckets = dashboard["buckets"]
        assert "BUY" in buckets
        assert "WATCH" in buckets
        assert "SELL" in buckets
        
        # Verify bucket tokens have required fields
        for bucket_name in ["BUY", "WATCH", "SELL"]:
            tokens = buckets[bucket_name]
            if tokens:
                token = tokens[0]
                assert "symbol" in token
                assert "compositeScore" in token
                assert "bucket" not in token or token.get("bucket") == bucket_name
                assert "bucketRank" in token
        
        print(f"✓ Dashboard: BUY={len(buckets['BUY'])}, WATCH={len(buckets['WATCH'])}, SELL={len(buckets['SELL'])} tokens")
    
    def test_get_bucket_tokens(self):
        """GET /api/rankings/bucket/:bucket - Get tokens in specific bucket"""
        for bucket in ["BUY", "WATCH", "SELL"]:
            response = requests.get(f"{BASE_URL}/api/rankings/bucket/{bucket}?limit=5")
            assert response.status_code == 200
            
            data = response.json()
            assert data["ok"] is True
            assert "data" in data
            
            result = data["data"]
            assert result["bucket"] == bucket
            assert "tokens" in result
            assert "count" in result
            print(f"✓ Bucket {bucket}: {result['count']} tokens")
    
    def test_get_rankings_list(self):
        """GET /api/rankings - Get all rankings with pagination"""
        response = requests.get(f"{BASE_URL}/api/rankings?limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "rankings" in result
        assert "total" in result
        assert "limit" in result
        assert "offset" in result
        print(f"✓ Rankings list: {len(result['rankings'])} rankings, total: {result['total']}")
    
    def test_get_top_movers(self):
        """GET /api/rankings/movers - Get top movers by momentum"""
        response = requests.get(f"{BASE_URL}/api/rankings/movers?limit=5")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "movers" in result
        assert "count" in result
        print(f"✓ Top movers: {result['count']} movers")
    
    def test_compute_rankings(self):
        """POST /api/rankings/compute - Trigger ranking computation"""
        response = requests.post(f"{BASE_URL}/api/rankings/compute")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert "processed" in result
        assert "buckets" in result
        print(f"✓ Rankings computed: {result['processed']} tokens processed")


class TestMLRuntimeAPI:
    """ML Runtime Config API tests (P0 - ML Toggle)"""
    
    def test_get_ml_runtime_config(self):
        """GET /api/engine/ml/runtime - Returns ML runtime configuration"""
        response = requests.get(f"{BASE_URL}/api/engine/ml/runtime")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        config = data["data"]
        assert "mlEnabled" in config
        assert "mlMode" in config
        assert "killSwitchActive" in config
        
        # mlMode should be one of: off, advisor, assist
        assert config["mlMode"] in ["off", "advisor", "assist"]
        print(f"✓ ML Runtime: enabled={config['mlEnabled']}, mode={config['mlMode']}, killSwitch={config['killSwitchActive']}")
    
    def test_update_ml_mode_to_off(self):
        """POST /api/engine/ml/runtime - Update ML mode to OFF"""
        response = requests.post(
            f"{BASE_URL}/api/engine/ml/runtime",
            json={"mlMode": "off", "mlEnabled": False}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert result["mlMode"] == "off"
        print(f"✓ ML mode updated to: {result['mlMode']}")
    
    def test_update_ml_mode_to_advisor(self):
        """POST /api/engine/ml/runtime - Update ML mode to ADVISOR"""
        response = requests.post(
            f"{BASE_URL}/api/engine/ml/runtime",
            json={"mlMode": "advisor", "mlEnabled": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert result["mlMode"] == "advisor"
        print(f"✓ ML mode updated to: {result['mlMode']}")
    
    def test_update_ml_mode_to_assist(self):
        """POST /api/engine/ml/runtime - Update ML mode to ASSIST"""
        response = requests.post(
            f"{BASE_URL}/api/engine/ml/runtime",
            json={"mlMode": "assist", "mlEnabled": True}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        assert "data" in data
        
        result = data["data"]
        assert result["mlMode"] == "assist"
        print(f"✓ ML mode updated to: {result['mlMode']}")
    
    def test_invalid_ml_mode(self):
        """POST /api/engine/ml/runtime - Invalid mode returns error"""
        response = requests.post(
            f"{BASE_URL}/api/engine/ml/runtime",
            json={"mlMode": "invalid_mode"}
        )
        assert response.status_code == 200  # API returns 200 with ok: false
        
        data = response.json()
        assert data["ok"] is False
        assert "error" in data
        print(f"✓ Invalid mode rejected: {data['error']}")
    
    def test_restore_ml_mode_to_advisor(self):
        """Restore ML mode to advisor after tests"""
        response = requests.post(
            f"{BASE_URL}/api/engine/ml/runtime",
            json={"mlMode": "advisor", "mlEnabled": True}
        )
        assert response.status_code == 200
        print("✓ ML mode restored to advisor")


class TestHealthEndpoints:
    """Health check endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health - Basic health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["ok"] is True
        print("✓ Health check passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
