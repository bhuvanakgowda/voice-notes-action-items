let audioBlob = null;
let recorder = null;
let chunks = [];

const recordBtn = document.getElementById("recordBtn");
const fileInput = document.getElementById("fileInput");
const processBtn = document.getElementById("processBtn");
const statusEl = document.getElementById("status");
const player = document.getElementById("player");

function setAudio(blob) {
    audioBlob = blob;

    player.src = URL.createObjectURL(blob);
    player.hidden = false;

    processBtn.disabled = false;

    statusEl.textContent =
        "Audio ready. Click Process voice note.";
}

recordBtn.onclick = async () => {

    if (recorder && recorder.state === "recording") {

        recorder.stop();

        recordBtn.textContent = "🎙️ Start recording";
        statusEl.textContent = "Recording stopped.";

        return;
    }

    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });

        chunks = [];

        recorder = new MediaRecorder(stream);

        recorder.ondataavailable = (event) => {
            chunks.push(event.data);
        };

        recorder.onstop = () => {

            const blob = new Blob(chunks, {
                type: recorder.mimeType || "audio/webm"
            });

            setAudio(blob);

            stream.getTracks().forEach(track => {
                track.stop();
            });
        };

        recorder.start();

        recordBtn.textContent = "⏹️ Stop recording";
        statusEl.textContent = "Recording...";

    } catch (error) {

        statusEl.textContent =
            "Microphone permission was denied or unavailable.";
    }
};


fileInput.onchange = (event) => {

    const file = event.target.files[0];

    if (file) {
        setAudio(file);
    }
};


processBtn.onclick = async () => {

    if (!audioBlob) return;

    processBtn.disabled = true;

    statusEl.textContent =
        "Transcribing and extracting action items...";

    const formData = new FormData();

    formData.append(
        "file",
        audioBlob,
        "voice-note.webm"
    );

    try {

        const response = await fetch(
            "/api/process",
            {
                method: "POST",
                body: formData
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        renderResults(data);

        if (data.mode === "demo") {

            statusEl.textContent =
                "Demo mode result shown.";

        } else {

            statusEl.textContent =
                "AI processing complete.";
        }

    } catch (error) {

        statusEl.textContent =
            error.message;

    } finally {

        processBtn.disabled = false;
    }
};


function renderResults(data) {

    document.getElementById("results").hidden = false;

    document.getElementById("transcript").textContent =
        data.transcript || "";

    document.getElementById("summary").textContent =
        data.summary || "";


    const keyPoints =
        document.getElementById("keyPoints");

    keyPoints.innerHTML = "";

    (data.key_points || []).forEach(point => {

        const li = document.createElement("li");

        li.textContent = point;

        keyPoints.appendChild(li);
    });


    const tasks =
        document.getElementById("tasks");

    tasks.innerHTML = "";

    (data.action_items || []).forEach(item => {

        const div = document.createElement("div");

        div.className = "task";

        div.innerHTML = `
            <strong>
                ☐ ${escapeHtml(item.task || "")}
            </strong>

            <div class="meta">
                ${
                    item.deadline
                        ? "Deadline: " +
                          escapeHtml(item.deadline)
                        : ""
                }

                ${
                    item.assignee
                        ? " • Assignee: " +
                          escapeHtml(item.assignee)
                        : ""
                }
            </div>
        `;

        tasks.appendChild(div);
    });
}


function escapeHtml(text) {

    return String(text).replace(
        /[&<>"']/g,
        character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;"
            };

            return entities[character];
        }
    );
}
