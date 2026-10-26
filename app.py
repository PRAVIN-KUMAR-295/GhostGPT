import os
import re
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load optional environment variables from .env if present
load_dotenv()

app = Flask(__name__)

# Configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:1b")
GENERATION_TIMEOUT = int(os.getenv("GENERATION_TIMEOUT", "90"))

# Valid category configurations
VALID_CATEGORIES = {
    "haunted_house": {
        "label": "Haunted House",
        "description": "Ancient estates, creaking floorboards, locked rooms, and long-dead residents."
    },
    "ghost_encounter": {
        "label": "Ghost Encounter",
        "description": "Direct interactions with spirits, apparitions, and lingering phantoms."
    },
    "cursed_object": {
        "label": "Cursed Object",
        "description": "Antiques, mirrors, music boxes, and relics carrying sinister afflictions."
    },
    "abandoned_hospital": {
        "label": "Abandoned Hospital",
        "description": "Echoing sanatorium wards, rusted medical tools, and trapped tormented souls."
    },
    "paranormal_mystery": {
        "label": "Paranormal Mystery",
        "description": "Unexplained disappearances, occult investigations, and eerie riddles."
    },
    "psychological_horror": {
        "label": "Psychological Horror",
        "description": "Paranoia, unreliable perception, sensory isolation, and the abyss within."
    }
}

# Intensity configurations
VALID_INTENSITIES = {
    "eerie": {
        "label": "Eerie & Chilling",
        "guide": "Focus on subtle atmospheric dread, unsettling sensory details, creeping cold, and psychological tension."
    },
    "terrifying": {
        "label": "Terrifying & Nightmarish",
        "guide": "Focus on visceral terror, sudden confrontations, menacing entities, frantic heartbeats, and overwhelming fear."
    },
    "eldritch": {
        "label": "Eldritch & Cosmic Dread",
        "guide": "Focus on unknowable realities, ancient malevolent forces, distorted geometries, sanity slipping away, and existential hopelessness."
    }
}

# Length configurations
VALID_LENGTHS = {
    "short": {
        "label": "Flash Fiction",
        "word_range": "150 to 250 words",
        "num_predict": 350
    },
    "medium": {
        "label": "Short Tale",
        "word_range": "300 to 500 words",
        "num_predict": 650
    },
    "long": {
        "label": "Novelette",
        "word_range": "550 to 800 words",
        "num_predict": 1000
    }
}


def build_system_prompt(category: str, intensity: str, length: str) -> str:
    """Build a tailored system instruction for the AI horror storyteller."""
    cat_info = VALID_CATEGORIES.get(category, VALID_CATEGORIES["haunted_house"])
    int_info = VALID_INTENSITIES.get(intensity, VALID_INTENSITIES["eerie"])
    len_info = VALID_LENGTHS.get(length, VALID_LENGTHS["medium"])

    return (
        "You are an acclaimed master of horror literature and supernatural ghost fiction. "
        "Your craft combines the gothic prose of Shirley Jackson and Edgar Allan Poe with "
        "vivid modern suspense. Never break character, never output code, and never explain "
        "your process.\n\n"
        f"Story Genre: {cat_info['label']} ({cat_info['description']})\n"
        f"Horror Intensity: {int_info['label']}. {int_info['guide']}\n"
        f"Target Length: {len_info['label']} (approximately {len_info['word_range']}).\n\n"
        "Formatting instructions:\n"
        "1. Start the first line with: Title: <Evocative Spooky Story Title>\n"
        "2. Follow with an empty line, then tell the complete horror story with rich paragraphs.\n"
        "3. Ensure the story has a gripping beginning, mounting dread, and an unforgettable climax or chilling lingering ending."
    )


def extract_title_and_story(raw_text: str) -> tuple[str, str]:
    """Extract Title: prefix from raw output if present; clean up the story."""
    lines = raw_text.strip().splitlines()
    title = "The Haunting"
    story_lines = []

    in_title = False
    for i, line in enumerate(lines):
        clean_line = line.strip()
        # Look for Title: or # Title: in early lines
        if i < 4 and re.match(r"^(#+\s*)?Title\s*:\s*(.+)$", clean_line, re.IGNORECASE):
            match = re.match(r"^(#+\s*)?Title\s*:\s*(.+)$", clean_line, re.IGNORECASE)
            title = match.group(2).strip().strip('"*\'')
            in_title = True
            continue
        elif i == 0 and clean_line.startswith("# "):
            title = clean_line.lstrip("# ").strip().strip('"*\'')
            continue
        story_lines.append(line)

    story_text = "\n".join(story_lines).strip()
    if not story_text:
        story_text = raw_text.strip()

    return title, story_text


@app.route("/")
def index():
    """Render the GhostGPT web application."""
    configured_model = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    return render_template(
        "index.html",
        configured_model=configured_model,
        categories=VALID_CATEGORIES,
        intensities=VALID_INTENSITIES,
        lengths=VALID_LENGTHS
    )


@app.route("/health", methods=["GET"])
def health():
    """
    Check if Ollama is running and whether the configured model is installed.
    Returns status, model list, and friendly diagnostic messages.
    """
    configured_model = os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    status_data = {
        "status": "offline",
        "ollama_host": OLLAMA_HOST,
        "configured_model": configured_model,
        "model_available": False,
        "installed_models": [],
        "message": ""
    }

    try:
        resp = requests.get(f"{OLLAMA_HOST}/api/tags", timeout=5)
        if resp.status_code == 200:
            status_data["status"] = "online"
            tags_json = resp.json()
            models = [m.get("name") for m in tags_json.get("models", []) if m.get("name")]
            status_data["installed_models"] = models

            # Check if configured model or model:latest matches
            conf_base = configured_model.split(":")[0]
            matched = any(
                m == configured_model or m.startswith(f"{configured_model}:") or m.startswith(f"{conf_base}:")
                for m in models
            )
            status_data["model_available"] = matched

            if matched:
                status_data["message"] = f"Ghost in the Machine is ready. Model '{configured_model}' is active and loaded locally."
            else:
                status_data["message"] = (
                    f"Ollama is running, but model '{configured_model}' is not found. "
                    f"Run `ollama pull {configured_model}` to download it, or set OLLAMA_MODEL."
                )
        else:
            status_data["message"] = f"Ollama responded with status code {resp.status_code}."
    except requests.exceptions.ConnectionError:
        status_data["message"] = (
            f"Cannot connect to Ollama at {OLLAMA_HOST}. "
            "Please make sure Ollama is installed and running (`ollama serve`)."
        )
    except requests.exceptions.Timeout:
        status_data["message"] = f"Connection to Ollama timed out at {OLLAMA_HOST}."
    except Exception as e:
        status_data["message"] = f"Health check encountered an issue: {str(e)}"

    return jsonify(status_data), 200 if status_data["status"] == "online" else 503


@app.route("/generate", methods=["POST"])
def generate():
    """
    Generate an offline horror story using the local Ollama instance.
    Validates input parameters and streams or receives complete story JSON.
    """
    if not request.is_json:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    data = request.get_json()
    prompt = data.get("prompt", "").strip()
    category = data.get("category", "haunted_house")
    intensity = data.get("intensity", "eerie")
    length = data.get("length", "medium")
    custom_model = data.get("model")

    # Validate prompt length
    if not prompt:
        return jsonify({"error": "Prompt cannot be empty. Give the spirits something to whisper about."}), 400
    if len(prompt) < 3:
        return jsonify({"error": "Prompt is too short. Please provide at least 3 characters."}), 400
    if len(prompt) > 1000:
        return jsonify({"error": "Prompt exceeds maximum length of 1,000 characters."}), 400

    # Validate parameters with fallbacks
    if category not in VALID_CATEGORIES:
        category = "haunted_house"
    if intensity not in VALID_INTENSITIES:
        intensity = "eerie"
    if length not in VALID_LENGTHS:
        length = "medium"

    model_to_use = custom_model if custom_model else os.getenv("OLLAMA_MODEL", DEFAULT_MODEL)
    system_prompt = build_system_prompt(category, intensity, length)
    len_config = VALID_LENGTHS[length]

    # Call local Ollama API
    ollama_url = f"{OLLAMA_HOST}/api/generate"
    payload = {
        "model": model_to_use,
        "prompt": prompt,
        "system": system_prompt,
        "stream": False,
        "options": {
            "temperature": 0.85,
            "top_p": 0.9,
            "num_predict": len_config["num_predict"]
        }
    }

    try:
        response = requests.post(ollama_url, json=payload, timeout=GENERATION_TIMEOUT)
    except requests.exceptions.ConnectionError:
        return jsonify({
            "error": "Ollama is unreachable.",
            "details": f"GhostGPT could not connect to Ollama at {OLLAMA_HOST}. Start Ollama with `ollama serve` and verify it is running."
        }), 503
    except requests.exceptions.Timeout:
        return jsonify({
            "error": "Story generation timed out.",
            "details": f"The model took longer than {GENERATION_TIMEOUT}s to respond. Try selecting a shorter length or check system resources."
        }), 504
    except Exception as e:
        return jsonify({
            "error": "An unexpected connection error occurred.",
            "details": str(e)
        }), 500

    if response.status_code == 404:
        return jsonify({
            "error": f"Model '{model_to_use}' not found.",
            "details": f"Model '{model_to_use}' is not installed in Ollama. Pull it in terminal with `ollama pull {model_to_use}`."
        }), 404

    if response.status_code != 200:
        return jsonify({
            "error": f"Ollama returned error {response.status_code}.",
            "details": response.text[:300]
        }), 502

    try:
        resp_json = response.json()
        raw_story = resp_json.get("response", "").strip()
        if not raw_story:
            return jsonify({
                "error": "The spirit realm remained silent.",
                "details": "Ollama returned an empty response. Try rephrasing your prompt."
            }), 500

        title, story = extract_title_and_story(raw_story)
        word_count = len(story.split())
        est_read_time = max(1, round(word_count / 200))

        return jsonify({
            "success": True,
            "title": title,
            "story": story,
            "category": category,
            "category_label": VALID_CATEGORIES[category]["label"],
            "intensity": intensity,
            "intensity_label": VALID_INTENSITIES[intensity]["label"],
            "length": length,
            "word_count": word_count,
            "read_time_minutes": est_read_time,
            "model": model_to_use,
            "offline_verified": True
        }), 200

    except Exception as e:
        return jsonify({
            "error": "Failed to parse generation response.",
            "details": str(e)
        }), 500


if __name__ == "__main__":
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("FLASK_PORT", "5000"))
    debug_mode = os.getenv("FLASK_DEBUG", "false").lower() in ("true", "1", "yes")
    print(f"👻 GhostGPT starting at http://{host}:{port}")
    print(f"🔒 Offline Local AI Inference via Ollama ({OLLAMA_HOST})")
    print(f"🧠 Default Model: {DEFAULT_MODEL}")
    app.run(host=host, port=port, debug=debug_mode)
