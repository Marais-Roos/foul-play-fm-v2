#!/usr/bin/env python3
"""
Foul Play FM — Fish Audio S2.1 Pro Voice Cloning Script
Uploads reference audio samples for the 9 main DJs and 8 side characters
to Fish Audio's model creation API (POST https://api.fish.audio/model),
tests speech synthesis with the free 's2.1-pro-free' model,
and updates lib/data/station-bible.json.
"""

import os
import sys
import json
import urllib.request
import urllib.error
import mimetypes

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)
BIBLE_PATH = os.path.join(PROJECT_ROOT, "lib", "data", "station-bible.json")

def load_env():
    env_vars = {}
    for env_file in [".env", ".env.local"]:
        p = os.path.join(PROJECT_ROOT, env_file)
        if os.path.exists(p):
            with open(p, "r") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars

def upload_voice_model(api_key, title, description, audio_path):
    """
    Upload an audio sample to Fish Audio model endpoint using multipart/form-data.
    Endpoint: POST https://api.fish.audio/model
    """
    url = "https://api.fish.audio/model"
    boundary = "----WebKitFormBoundaryFoulPlayFM7MA44Wxj1NtPtBY1"
    
    filename = os.path.basename(audio_path)
    mime_type, _ = mimetypes.guess_type(audio_path)
    if not mime_type:
        mime_type = "audio/mpeg" if audio_path.endswith(".mp3") else "audio/wav"

    with open(audio_path, "rb") as f:
        file_bytes = f.read()

    body = bytearray()
    
    def add_field(name, value):
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))

    add_field("title", title)
    add_field("description", description)
    add_field("visibility", "private")
    add_field("type", "tts")
    add_field("train_mode", "fast")

    # Add file
    body.extend(f"--{boundary}\r\n".encode("utf-8"))
    body.extend(f'Content-Disposition: form-data; name="voices"; filename="{filename}"\r\n'.encode("utf-8"))
    body.extend(f"Content-Type: {mime_type}\r\n\r\n".encode("utf-8"))
    body.extend(file_bytes)
    body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(url, data=bytes(body), method="POST")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")

    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            return resp_data.get("_id") or resp_data.get("id")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"    [ERROR] Fish Audio API error ({e.code}): {error_body}")
        return None

def test_synthesize_sample(api_key, reference_id, character_name):
    """
    Test synthesizing speech with the free S2.1 Pro API model:
    POST https://api.fish.audio/v1/tts with header 'model: s2.1-pro-free'
    """
    url = "https://api.fish.audio/v1/tts"
    payload = json.dumps({
        "text": f"This is {character_name}, broadcasting live on Foul Play FM!",
        "reference_id": reference_id,
        "format": "mp3"
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {api_key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("model", "s2.1-pro-free")

    try:
        with urllib.request.urlopen(req) as resp:
            out_dir = os.path.join(PROJECT_ROOT, "data", "voices", "generated_tests")
            os.makedirs(out_dir, exist_ok=True)
            out_file = os.path.join(out_dir, f"{character_name.lower().replace(' ', '_')}_test.mp3")
            with open(out_file, "wb") as f:
                f.write(resp.read())
            print(f"    [VERIFIED] Successfully synthesized test audio with s2.1-pro-free -> {out_file}")
            return True
    except Exception as e:
        print(f"    [WARNING] Test synthesis failed: {e}")
        return False

def main():
    env = load_env()
    api_key = env.get("FISH_AUDIO_API_KEY") or os.environ.get("FISH_AUDIO_API_KEY")
    live_mode = "--live" in sys.argv

    with open(BIBLE_PATH, "r") as f:
        bible = json.load(f)

    print("==========================================================")
    print("  FOUL PLAY FM — Fish Audio S2.1 Pro Voice Cloning")
    print("==========================================================")
    print(f"Mode:    {'LIVE UPLOAD' if live_mode else 'DRY RUN (pass --live to execute)'}")
    print(f"Model:   s2.1-pro-free (Fish Audio S2.1 Pro Free API)")
    print(f"API Key: {'Configured' if api_key and 'your-' not in api_key else 'Missing (Set FISH_AUDIO_API_KEY in .env.local)'}\n")

    total_ready = 0
    missing = []

    # 1. Main Presenters
    print("--- 1. Main Presenters (9 DJs) ---")
    for dj in bible["djs"]:
        audio_file = dj.get("voiceSampleFile")
        full_path = os.path.join(PROJECT_ROOT, audio_file) if audio_file else None
        exists = full_path and os.path.exists(full_path)
        status = "READY" if exists else "MISSING"
        size = f"({os.path.getsize(full_path) // 1024} KB)" if exists else ""
        has_id = dj.get("fishAudioVoiceId")
        id_label = f"[ID: {has_id}]" if has_id else ""
        print(f"  [{status}] {dj['name']} -> {audio_file} {size} {id_label}")
        
        if exists:
            total_ready += 1
            if live_mode and api_key and not has_id:
                print(f"    -> Uploading to Fish Audio model endpoint as '{dj['name']}'...")
                voice_id = upload_voice_model(
                    api_key, 
                    title=f"Foul Play FM - {dj['name']}", 
                    description=f"{dj['parodyOf']} parody: {dj['description'][:150]}", 
                    audio_path=full_path
                )
                if voice_id:
                    dj["fishAudioVoiceId"] = voice_id
                    print(f"    -> Created Model ID: {voice_id}")
                    test_synthesize_sample(api_key, voice_id, dj["name"])
        else:
            missing.append(dj["name"])

    # 2. Side Characters
    print("\n--- 2. Side Characters (8 Pundits/Reporters) ---")
    for sc in bible["sideCharacters"]:
        audio_file = sc.get("voiceSampleFile")
        full_path = os.path.join(PROJECT_ROOT, audio_file) if audio_file else None
        exists = full_path and os.path.exists(full_path)
        status = "READY" if exists else "MISSING"
        size = f"({os.path.getsize(full_path) // 1024} KB)" if exists else ""
        has_id = sc.get("fishAudioVoiceId")
        id_label = f"[ID: {has_id}]" if has_id else ""
        print(f"  [{status}] {sc['name']} ({sc['role']}) -> {audio_file or 'None'} {size} {id_label}")
        
        if exists:
            total_ready += 1
            if live_mode and api_key and not has_id:
                print(f"    -> Uploading to Fish Audio model endpoint as '{sc['name']}'...")
                voice_id = upload_voice_model(
                    api_key, 
                    title=f"Foul Play FM - {sc['name']}", 
                    description=f"{sc['role']} ({sc['parodyOf']}): {sc['description'][:150]}", 
                    audio_path=full_path
                )
                if voice_id:
                    sc["fishAudioVoiceId"] = voice_id
                    print(f"    -> Created Model ID: {voice_id}")
                    test_synthesize_sample(api_key, voice_id, sc["name"])
        else:
            missing.append(f"{sc['name']} ({sc['role']})")

    if live_mode:
        with open(BIBLE_PATH, "w") as f:
            json.dump(bible, f, indent=2)
        print("\nUpdated lib/data/station-bible.json with newly registered voice IDs!")

    print("\n----------------------------------------------------------")
    print(f"Summary: {total_ready} voice samples ready for cloning.")
    if missing:
        print(f"Awaiting samples for: {', '.join(missing)}")
    print("----------------------------------------------------------")

if __name__ == "__main__":
    main()
