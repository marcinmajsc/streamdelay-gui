# Created: 2026-01-02
# Author: @marcinmajsc
# Repository: https://github.com/marcinmajsc/streamdelay-gui

from flask import Flask, render_template, redirect, url_for, request
import subprocess, json, time, os

app = Flask(__name__)

# Streamdelay API (local)
BASE = "http://127.0.0.1:7070"
KEY  = "lan-key"

# Delay window (seconds) - lock both CENSOR ON/OFF after each toggle
DELAY_SECONDS = 15

# Timestamp of the last CENSOR toggle (ON or OFF)
STATE_FILE = "/var/lib/streamgui/censor_toggle_ts"

# YouTube out URI file (read by streamdelay.service)
OUT_URI_FILE = "/etc/streamdelay/out_uri.txt"
YT_BASE = "rtmp://a.rtmp.youtube.com/live2"

_last_err = None


def _set_err(msg: str | None):
    global _last_err
    _last_err = msg


# -------------------------
# Helpers: HTTP via curl
# -------------------------
def curl_json(args):
    r = subprocess.run(
        ["curl", "-sS", "--max-time", "3", *args],
        capture_output=True, text=True
    )
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip() or "curl failed")
    out = r.stdout.strip()
    return json.loads(out) if out else {}


def get_status_safe():
    try:
        _set_err(None)
        return curl_json([f"{BASE}/status?key={KEY}"])
    except Exception as e:
        _set_err(f"streamdelay API error: {e}")
        return {
            "isCensored": False,
            "isStreamRunning": False,
            "state": {"censorship": "unknown", "stream": "unknown"},
            "delaySeconds": DELAY_SECONDS,
        }


def patch_status_safe(payload: dict):
    try:
        _set_err(None)
        return curl_json([
            "-X", "PATCH",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(payload),
            f"{BASE}/status?key={KEY}",
        ])
    except Exception as e:
        _set_err(f"streamdelay API error: {e}")
        return {}


# -------------------------
# Toggle timestamp handling
# -------------------------
def set_toggle_ts(ts: float):
    os.makedirs("/var/lib/streamgui", exist_ok=True)
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        f.write(str(ts))


def get_toggle_ts():
    try:
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            return float(f.read().strip())
    except Exception:
        return None


def lock_state(now: float):
    ts = get_toggle_ts()
    locked = False
    seconds_left = 0
    progress = 100
    if ts is not None:
        elapsed = now - ts
        if elapsed < DELAY_SECONDS:
            locked = True
            seconds_left = int(DELAY_SECONDS - elapsed + 0.999)
            progress = int((elapsed / DELAY_SECONDS) * 100)
    return locked, seconds_left, progress


def is_locked():
    ts = get_toggle_ts()
    return ts is not None and (time.time() - ts) < DELAY_SECONDS


# -------------------------
# Out URI helpers
# -------------------------
def read_out_uri():
    try:
        with open(OUT_URI_FILE, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ""


def write_out_uri(uri: str):
    os.makedirs(os.path.dirname(OUT_URI_FILE), exist_ok=True)
    with open(OUT_URI_FILE, "w", encoding="utf-8") as f:
        f.write(uri.strip() + "\n")


def restart_streamdelay():
    # streamgui runs unprivileged; allow only this via sudoers (NOPASSWD)
    subprocess.run(["sudo", "/bin/systemctl", "restart", "streamdelay.service"], check=False)



def is_youtube_configured(uri: str):
    base = YT_BASE.rstrip("/") + "/"
    if not uri.startswith(base):
        return False
    tail = uri[len(base):].strip()
    return len(tail) > 0


def mask_key(uri: str):
    base = YT_BASE.rstrip("/") + "/"
    if not uri.startswith(base):
        return ""
    k = uri[len(base):].strip()
    if not k:
        return ""
    if len(k) <= 6:
        return "*" * len(k)
    return k[:2] + "*" * (len(k) - 4) + k[-2:]


# -------------------------
# Views
# -------------------------
@app.get("/")
def index():
    out_uri = read_out_uri()
    yt_configured = is_youtube_configured(out_uri)

    # Only query streamdelay API when key is configured (keeps UI clean before setup)
    st = get_status_safe() if yt_configured else {"isCensored": False, "isStreamRunning": False, "state": {}}

    locked, seconds_left, progress = lock_state(time.time())
    return render_template(
        "index.html",
        st=st,
        locked=locked,
        seconds_left=seconds_left,
        progress=progress,
        yt_configured=yt_configured,
        yt_mask=mask_key(out_uri),
        app_error=_last_err
    )


@app.get("/status.json")
def status_json():
    out_uri = read_out_uri()
    yt_configured = is_youtube_configured(out_uri)

    st = get_status_safe() if yt_configured else {"isCensored": False, "isStreamRunning": False, "state": {}}
    locked, seconds_left, progress = lock_state(time.time())

    state = st.get("state") or {}
    if not isinstance(state, dict):
        state = {}

    stream_state_raw = state.get("stream")
    stream_state = None
    if isinstance(stream_state_raw, dict):
        stream_state = stream_state_raw.get("running")
    elif isinstance(stream_state_raw, str):
        stream_state = stream_state_raw

    censorship_raw = state.get("censorship")
    censorship_state = None
    if isinstance(censorship_raw, str):
        censorship_state = censorship_raw
    elif isinstance(censorship_raw, dict):
        for k in ("mode", "state", "name", "type"):
            v = censorship_raw.get(k)
            if isinstance(v, str):
                censorship_state = v
                break

    return {
        "yt_configured": yt_configured,
        "isCensored": bool(st.get("isCensored")),
        "isStreamRunning": bool(st.get("isStreamRunning")),
        "stream_state": stream_state,
        "censorship_state": censorship_state,
        "locked": locked,
        "seconds_left": seconds_left,
        "progress": progress,
        "error": _last_err,
    }


# -------------------------
# Actions
# -------------------------
@app.post("/censor_on")
def censor_on():
    if is_locked():
        return redirect(url_for("index"))
    patch_status_safe({"isCensored": True})
    set_toggle_ts(time.time())
    return redirect(url_for("index"))


@app.post("/censor_off")
def censor_off():
    if is_locked():
        return redirect(url_for("index"))
    patch_status_safe({"isCensored": False})
    set_toggle_ts(time.time())
    return redirect(url_for("index"))


@app.post("/start")
def start():
    if not is_youtube_configured(read_out_uri()):
        return redirect(url_for("index"))
    patch_status_safe({"isStreamRunning": True})
    return redirect(url_for("index"))


@app.post("/stop")
def stop():
    patch_status_safe({"isStreamRunning": False})
    return redirect(url_for("index"))


@app.post("/set_youtube")
def set_youtube():
    k = (request.form.get("yt_key") or "").strip()
    base = YT_BASE.rstrip("/") + "/"
    try:
        if k:
            write_out_uri(base + k)
        else:
            write_out_uri(base)  # clears (disable output)
        restart_streamdelay()
        _set_err(None)
    except Exception as e:
        _set_err(f"set_youtube failed: {e}")
    return redirect(url_for("index"))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=8080)
