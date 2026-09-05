import os
import json
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from openai import OpenAI

load_dotenv()

app = FastAPI(title="Voice Notes Action Items")
BASE_DIR = Path(__file__).resolve().parent

def demo_result():
    return {
        "transcript": "I need to finish the project report by Friday, send the final slides to the team, and remind Rahul to review the introduction.",
        "summary": "Finish the project report, share the final slides, and get Rahul to review the introduction.",
        "key_points": [
            "Project report needs to be completed by Friday.",
            "Final slides should be sent to the team.",
            "Rahul needs to review the introduction."
        ],
        "action_items": [
            {"task": "Finish the project report", "deadline": "Friday", "assignee": "Me"},
            {"task": "Send the final slides to the team", "deadline": None, "assignee": "Me"},
            {"task": "Ask Rahul to review the introduction", "deadline": None, "assignee": "Rahul"}
        ]
    }

def parse_json(text):
    try:
        return json.loads(text)
    except Exception:
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            return json.loads(text[start:end + 1])
        raise ValueError("The model did not return valid JSON.")

@app.get("/")
async def home():
    return FileResponse(BASE_DIR / "static" / "index.html")

@app.post("/api/process")
async def process_audio(file: UploadFile = File(...)):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return {"mode": "demo", **demo_result()}

    data = await file.read()
    if not data:
        return {"error": "The uploaded audio file is empty."}
    if len(data) > 25 * 1024 * 1024:
        return {"error": "Audio file is too large. Keep it under 25 MB."}

    suffix = Path(file.filename or "audio.webm").suffix or ".webm"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(data)
            tmp_path = tmp.name

        client = OpenAI(api_key=api_key)
        with open(tmp_path, "rb") as audio:
            transcript = client.audio.transcriptions.create(
                model=os.getenv("OPENAI_TRANSCRIPTION_MODEL", "gpt-4o-mini-transcribe"),
                file=audio
            ).text

        prompt = f"""Convert this voice-note transcript into structured productivity output.

Transcript:
{transcript}

Return JSON with exactly these keys:
summary: short string
key_points: array of 3-6 concise strings
action_items: array of objects with task, deadline, assignee
Only include a deadline or assignee when explicitly stated or clearly implied.
Do not invent information.
"""
        response = client.responses.create(
            model=os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini"),
            input=prompt
        )
        result = parse_json(response.output_text)
        return {"mode": "ai", "transcript": transcript, **result}

    except Exception as exc:
        return {"error": f"Processing failed: {exc}"}
    finally:
        if tmp_path:
            try:
                os.remove(tmp_path)
            except OSError:
                pass
