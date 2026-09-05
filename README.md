# Voice Notes → Action Items

AI-powered voice-note app for the NxtWave "LLMs Meet Speech" take-home assessment.

Flow: Audio → Speech-to-Text → LLM → Summary + Key Points + Action Items

## Features
- Browser audio recording
- Audio file upload
- OpenAI transcription when OPENAI_API_KEY is configured
- LLM extraction of summary, key points and action items
- Demo mode without an API key
- Responsive UI and basic error handling
- No secrets hardcoded

## Run
1. Install Python 3.10+
2. `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and optionally add your OpenAI key.
4. `uvicorn main:app --reload`
5. Open `http://127.0.0.1:8000`

## AI coding assistant disclosure
Created/refined with an AI coding assistant (Emergent/ChatGPT).

## Known limitations
Browser recording depends on MediaRecorder support. Demo mode uses sample data. Production use should add authentication, persistent storage and stricter file validation.
