import sys
import os
import pytest
import json
from unittest.mock import patch, MagicMock
import requests

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import app, build_system_prompt, extract_title_and_story


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_index_route(client):
    """Test that the main index route loads properly and includes key elements."""
    response = client.get("/")
    assert response.status_code == 200
    html = response.get_data(as_text=True)
    assert "GhostGPT" in html
    assert "Offline AI Horror Story Generator" in html
    assert "story-form" in html
    assert "haunted_house" in html
    assert "ghost_encounter" in html
    assert "cursed_object" in html
    assert "abandoned_hospital" in html
    assert "paranormal_mystery" in html
    assert "psychological_horror" in html


def test_health_route_online(client):
    """Test health check route when Ollama is running and model is available."""
    mock_tags_response = MagicMock()
    mock_tags_response.status_code = 200
    mock_tags_response.json.return_value = {
        "models": [{"name": "gemma3:1b"}, {"name": "llama3.2:1b"}]
    }

    with patch("requests.get", return_value=mock_tags_response):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.get_json()
        assert data["status"] == "online"
        assert data["model_available"] is True
        assert "gemma3:1b" in data["installed_models"]


def test_health_route_offline(client):
    """Test health check route when Ollama is unreachable."""
    with patch("requests.get", side_effect=requests.exceptions.ConnectionError("Connection refused")):
        response = client.get("/health")
        assert response.status_code == 503
        data = response.get_json()
        assert data["status"] == "offline"
        assert data["model_available"] is False
        assert "Cannot connect to Ollama" in data["message"]


def test_generate_requires_json(client):
    """Test that /generate rejects non-JSON requests."""
    response = client.post("/generate", data="plain text")
    assert response.status_code == 400
    data = response.get_json()
    assert "error" in data


def test_generate_validates_prompt_presence(client):
    """Test that /generate requires a prompt."""
    response = client.post("/generate", json={"prompt": ""})
    assert response.status_code == 400
    data = response.get_json()
    assert "cannot be empty" in data["error"]


def test_generate_validates_min_length(client):
    """Test that /generate rejects very short prompts."""
    response = client.post("/generate", json={"prompt": "hi"})
    assert response.status_code == 400
    data = response.get_json()
    assert "too short" in data["error"]


def test_generate_validates_max_length(client):
    """Test that /generate rejects prompts over 1,000 characters."""
    long_prompt = "a" * 1005
    response = client.post("/generate", json={"prompt": long_prompt})
    assert response.status_code == 400
    data = response.get_json()
    assert "exceeds maximum length" in data["error"]


def test_generate_successful_story(client):
    """Test successful story generation with mocked Ollama API response."""
    mock_ollama_resp = MagicMock()
    mock_ollama_resp.status_code = 200
    mock_ollama_resp.json.return_value = {
        "response": "Title: The Whispering Gallery\n\nRain lashed violently against the rotting glass of the abandoned solarium. Evelyn held her breath."
    }

    payload = {
        "prompt": "An abandoned solarium in the woods during a violent storm.",
        "category": "haunted_house",
        "intensity": "eerie",
        "length": "medium"
    }

    with patch("requests.post", return_value=mock_ollama_resp) as mock_post:
        response = client.post("/generate", json=payload)
        assert response.status_code == 200
        data = response.get_json()
        assert data["success"] is True
        assert data["title"] == "The Whispering Gallery"
        assert "solarium" in data["story"]
        assert data["category"] == "haunted_house"
        assert data["word_count"] > 10
        assert data["offline_verified"] is True

        # Verify payload sent to Ollama
        mock_post.assert_called_once()
        sent_data = mock_post.call_args[1]["json"]
        assert "prompt" in sent_data
        assert sent_data["prompt"] == payload["prompt"]
        assert sent_data["stream"] is False


def test_generate_ollama_connection_error(client):
    """Test error handling when Ollama is offline during generation."""
    with patch("requests.post", side_effect=requests.exceptions.ConnectionError("Offline")):
        response = client.post("/generate", json={"prompt": "Spooky footsteps at night."})
        assert response.status_code == 503
        data = response.get_json()
        assert "unreachable" in data["error"]


def test_generate_ollama_timeout(client):
    """Test error handling when Ollama generation times out."""
    with patch("requests.post", side_effect=requests.exceptions.Timeout("Timed out")):
        response = client.post("/generate", json={"prompt": "Spooky footsteps at night."})
        assert response.status_code == 504
        data = response.get_json()
        assert "timed out" in data["error"]


def test_generate_model_not_found(client):
    """Test error handling when Ollama returns 404 for missing model."""
    mock_resp = MagicMock()
    mock_resp.status_code = 404
    with patch("requests.post", return_value=mock_resp):
        response = client.post("/generate", json={"prompt": "Spooky footsteps at night."})
        assert response.status_code == 404
        data = response.get_json()
        assert "not found" in data["error"]


def test_extract_title_and_story():
    """Test custom extraction of Title from raw LLM outputs."""
    raw1 = "Title: Echoes of the Deep\n\nThe water was freezing cold."
    t1, s1 = extract_title_and_story(raw1)
    assert t1 == "Echoes of the Deep"
    assert s1 == "The water was freezing cold."

    raw2 = "# The Hollow Doll\n\nIt sat in the attic corner."
    t2, s2 = extract_title_and_story(raw2)
    assert t2 == "The Hollow Doll"
    assert s2 == "It sat in the attic corner."

    raw3 = "The mist rolled over the cemetery stones."
    t3, s3 = extract_title_and_story(raw3)
    assert t3 == "The Haunting"  # default title fallback
    assert s3 == "The mist rolled over the cemetery stones."


def test_build_system_prompt():
    """Test system prompt building for different categories and intensities."""
    sys_prompt = build_system_prompt("psychological_horror", "eldritch", "short")
    assert "Psychological Horror" in sys_prompt
    assert "Eldritch & Cosmic Dread" in sys_prompt
    assert "Flash Fiction" in sys_prompt
    assert "Title:" in sys_prompt
