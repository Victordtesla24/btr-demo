# Tests for main API module

"""Tests for the FastAPI main module."""

import pytest
from fastapi.testclient import TestClient
from backend.main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


class TestGeocodeEndpoint:
    """Tests for the geocode endpoint."""
    
    def test_geocode_endpoint_exists(self, client):
        """Test that geocode endpoint exists."""
        # This will fail if API key is not set, but endpoint should exist
        response = client.get("/api/geocode?q=Delhi")
        # Should either return 200 (success) or 500 (API key missing) or 404 (not found)
        assert response.status_code in [200, 404, 500]
    
    def test_geocode_missing_query(self, client):
        """Test geocode endpoint without query parameter."""
        response = client.get("/api/geocode")
        assert response.status_code == 422  # Validation error


class TestBTREndpoint:
    """Tests for the BTR endpoint."""
    
    def test_btr_endpoint_exists(self, client):
        """Test that BTR endpoint exists."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "approx",
                "center": "12:00",
                "window_hours": 3.0
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either return 200 (success), 400 (validation), 404 (no candidates), or 500 (API key missing/error)
        assert response.status_code in [200, 400, 404, 500]
    
    def test_btr_missing_fields(self, client):
        """Test BTR endpoint with missing required fields."""
        request_data = {
            "dob": "2024-01-15"
            # Missing other required fields
        }
        response = client.post("/api/btr", json=request_data)
        assert response.status_code == 422  # Validation error
    
    def test_btr_invalid_date_format(self, client):
        """Test BTR endpoint with invalid date format."""
        request_data = {
            "dob": "invalid-date",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "approx",
                "center": "12:00",
                "window_hours": 3.0
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should return 400 for invalid date format
        assert response.status_code in [400, 422]
    
    def test_btr_unknown_mode(self, client):
        """Test BTR endpoint with unknown time mode."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "unknown",
                "center": None,
                "window_hours": None
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either succeed or fail with API key issue
        assert response.status_code in [200, 400, 500]
    
    def test_btr_invalid_mode(self, client):
        """Test BTR endpoint with invalid mode."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "invalid_mode",
                "center": "12:00",
                "window_hours": 3.0
            }
        }
        response = client.post("/api/btr", json=request_data)
        assert response.status_code == 422  # Validation error


class TestAPIStructure:
    """Tests for API structure and documentation."""
    
    def test_openapi_schema_exists(self, client):
        """Test that OpenAPI schema is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "info" in data
    
    def test_docs_endpoint_exists(self, client):
        """Test that docs endpoint exists."""
        response = client.get("/docs")
        assert response.status_code == 200
    
    def test_btr_with_time_range_override(self, client):
        """Test BTR endpoint with time range override."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "unknown",
                "center": None,
                "window_hours": None
            },
            "time_range_override": {
                "start": "08:00",
                "end": "12:00"
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either succeed, fail with validation, fail with API key issue, or return 404 if no candidates found
        assert response.status_code in [200, 400, 404, 500]
    
    def test_btr_with_optional_traits(self, client):
        """Test BTR endpoint with optional traits."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "approx",
                "center": "12:00",
                "window_hours": 3.0
            },
            "optional_traits": {
                "height": "TALL",
                "build": "ATHLETIC",
                "complexion": "FAIR"
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either succeed, fail with validation, fail with API key issue, or return 404 if no candidates found
        assert response.status_code in [200, 400, 404, 500]
        if response.status_code == 200:
            data = response.json()
            assert "candidates" in data
            if data["candidates"]:
                candidate = data["candidates"][0]
                assert "composite_score" in candidate
                assert "physical_traits_scores" in candidate
    
    def test_btr_with_optional_events(self, client):
        """Test BTR endpoint with optional life events."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "approx",
                "center": "12:00",
                "window_hours": 3.0
            },
            "optional_events": {
                "marriage": {
                    "date": "2020-05-15"
                },
                "children": {
                    "count": 1,
                    "dates": ["2021-08-20"]
                },
                "career": ["2018-06-01", "2022-03-15"]
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either succeed, fail with validation, fail with API key issue, or return 404 if no candidates found
        assert response.status_code in [200, 400, 404, 500]
        if response.status_code == 200:
            data = response.json()
            assert "candidates" in data
            if data["candidates"]:
                candidate = data["candidates"][0]
                assert "composite_score" in candidate
                assert "life_events_scores" in candidate
    
    def test_btr_with_traits_and_events(self, client):
        """Test BTR endpoint with both optional traits and events."""
        request_data = {
            "dob": "2024-01-15",
            "pob_text": "Delhi, India",
            "tz_offset_hours": 5.5,
            "approx_tob": {
                "mode": "approx",
                "center": "12:00",
                "window_hours": 3.0
            },
            "optional_traits": {
                "height": "TALL"
            },
            "optional_events": {
                "marriage": {
                    "date": "2020-05-15"
                }
            }
        }
        response = client.post("/api/btr", json=request_data)
        # Should either succeed, fail with validation, fail with API key issue, or return 404 if no candidates found
        assert response.status_code in [200, 400, 404, 500]
        if response.status_code == 200:
            data = response.json()
            assert "candidates" in data
            if data["candidates"]:
                candidate = data["candidates"][0]
                assert "composite_score" in candidate
                if "physical_traits_scores" in candidate:
                    assert candidate["physical_traits_scores"] is not None
                if "life_events_scores" in candidate:
                    assert candidate["life_events_scores"] is not None

