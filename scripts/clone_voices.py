#!/usr/bin/env python3
"""
Foul Play FM — Fish Audio S2.1 Pro Voice Cloning Script
Uploads reference audio samples for the 9 main DJs, 8 side characters,
and 25 caller personas to Fish Audio's model creation API (POST https://api.fish.audio/model),
tests speech synthesis with the free 's2.1-pro-free' model,
and updates lib/data/station-bible.json and Sanity CMS.
"""

import os
import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse
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

def get_sanity_auth():
    env = load_env()
    token = env.get("SANITY_API_WRITE_TOKEN") or env.get("SANITY_WRITE_TOKEN") or os.environ.get("SANITY_API_WRITE_TOKEN")
    if not token or token.startswith("your-"):
        cli_config_path = os.path.expanduser("~/.config/sanity/config.json")
        if os.path.exists(cli_config_path):
            try:
                with open(cli_config_path) as f:
                    d = json.load(f)
                    token = d.get("authToken")
            except Exception:
                pass

    project_id = env.get("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.environ.get("NEXT_PUBLIC_SANITY_PROJECT_ID") or "fkbibl7o"
    dataset = env.get("NEXT_PUBLIC_SANITY_DATASET") or os.environ.get("NEXT_PUBLIC_SANITY_DATASET") or "production"
    return project_id, dataset, token

def patch_sanity_voice_id(project_id, dataset, token, doc_id, voice_id):
    """
    Patches a Sanity document's fishAudioVoiceId field.
    """
    if not token or not project_id:
        return False
    
    endpoint = f"https://{project_id}.api.sanity.io/v2024-01-01/data/mutate/{dataset}"
    payload = json.dumps({
        "mutations": [
            {
                "patch": {
                    "id": doc_id,
                    "set": {
                        "fishAudioVoiceId": voice_id
                    }
                }
            }
        ]
    }).encode("utf-8")

    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return True
    except urllib.error.HTTPError as e:
        print(f"    [SANITY ERROR] ({e.code}) updating {doc_id}: {e.read().decode('utf-8')}")
        return False
    except Exception as e:
        print(f"    [SANITY ERROR] updating {doc_id}: {e}")
        return False

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
        "text": f"This is {character_name}, calling in to Foul Play FM!",
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
            safe_name = character_name.lower().replace(' ', '_').replace('"', '').replace('/', '_')
            out_file = os.path.join(out_dir, f"{safe_name}_test.mp3")
            with open(out_file, "wb") as f:
                f.write(resp.read())
            print(f"    [VERIFIED] Synthesized test audio -> {out_file}")
            return True
    except Exception as e:
        print(f"    [WARNING] Test synthesis failed: {e}")
        return False

def save_bible(bible):
    with open(BIBLE_PATH, "w") as f:
        json.dump(bible, f, indent=2)

def main():
    env = load_env()
    api_key = env.get("FISH_AUDIO_API_KEY") or os.environ.get("FISH_AUDIO_API_KEY")
    live_mode = "--live" in sys.argv
    callers_only = "--callers-only" in sys.argv
    run_test = "--test" in sys.argv
    sync_sanity_flag = "--sync-sanity" in sys.argv

    project_id, dataset, sanity_token = get_sanity_auth()

    with open(BIBLE_PATH, "r") as f:
        bible = json.load(f)

    print("==========================================================")
    print("  FOUL PLAY FM — Fish Audio S2.1 Pro Voice Cloning & CMS Sync")
    print("==========================================================")
    print(f"Mode:         {'LIVE UPLOAD' if live_mode else 'DRY RUN (pass --live to execute)'}")
    print(f"Model:        s2.1-pro-free (Fish Audio S2.1 Pro Free API)")
    print(f"Fish Audio:   {'Configured' if api_key and 'your-' not in api_key else 'Missing (Set FISH_AUDIO_API_KEY)'}")
    print(f"Sanity CMS:   {'Configured (' + project_id + ' / ' + dataset + ')' if sanity_token else 'No Write Token'}")
    print(f"Filter:       {'CALLERS ONLY' if callers_only else 'ALL CHARACTERS'}\n")

    total_ready = 0
    missing = []
    cloned_count = 0
    sanity_synced_count = 0

    # 1. Main Presenters
    if not callers_only:
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
                        cloned_count += 1
                        save_bible(bible)
                        print(f"    -> Created Model ID: {voice_id}")
                        if run_test:
                            test_synthesize_sample(api_key, voice_id, dj["name"])
                        time.sleep(1)

                if (live_mode or sync_sanity_flag) and sanity_token and dj.get("fishAudioVoiceId"):
                    doc_id = f"presenter-{dj['id']}"
                    if patch_sanity_voice_id(project_id, dataset, sanity_token, doc_id, dj["fishAudioVoiceId"]):
                        sanity_synced_count += 1
            else:
                missing.append(dj["name"])

    # 2. Side Characters
    if not callers_only:
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
                        cloned_count += 1
                        save_bible(bible)
                        print(f"    -> Created Model ID: {voice_id}")
                        if run_test:
                            test_synthesize_sample(api_key, voice_id, sc["name"])
                        time.sleep(1)

                if (live_mode or sync_sanity_flag) and sanity_token and sc.get("fishAudioVoiceId"):
                    doc_id = f"sideCharacter-{sc['id']}"
                    if patch_sanity_voice_id(project_id, dataset, sanity_token, doc_id, sc["fishAudioVoiceId"]):
                        sanity_synced_count += 1
            else:
                missing.append(f"{sc['name']} ({sc['role']})")

    # 3. Callers
    print("\n--- 3. Callers (25 Personas) ---")
    for caller in bible.get("callers", []):
        tag = caller["voiceTag"]
        # Potential sample paths
        candidate_paths = [
            os.path.join("data", "voices", "callers", f"{tag}.mp3"),
            os.path.join("data", "voices", "callers", f"{tag}.wav"),
            os.path.join("data", "voices", "callers", f"{caller['id']}.mp3"),
            os.path.join("data", "voices", "callers", f"{tag.lower()}.mp3"),
        ]
        if caller.get("voiceSampleFile"):
            candidate_paths.insert(0, caller["voiceSampleFile"])

        rel_audio_path = None
        full_path = None
        for cand in candidate_paths:
            fp = os.path.join(PROJECT_ROOT, cand)
            if os.path.exists(fp):
                rel_audio_path = cand
                full_path = fp
                break

        exists = bool(full_path and os.path.exists(full_path))
        status = "READY" if exists else "MISSING"
        size = f"({os.path.getsize(full_path) // 1024} KB)" if exists else ""
        has_id = caller.get("fishAudioVoiceId")
        id_label = f"[ID: {has_id}]" if has_id else ""
        clean_doc_id = f"caller-{tag.lower().replace('_', '-').replace(' ', '-')}"

        print(f"  [{status}] {caller['voiceTag']} ({caller['archetype']}) -> {rel_audio_path or 'No sample'} {size} {id_label}")

        if exists:
            total_ready += 1
            caller["voiceSampleFile"] = rel_audio_path

            if live_mode and api_key and not has_id:
                print(f"    -> Uploading to Fish Audio model endpoint as '{tag}' ({caller['archetype']})...")
                title = f"Foul Play FM - Caller {caller['archetype']} ({tag})"
                description = f"{caller['archetype']} ({caller['targetOfSatire']}): {caller['description'][:150]}"
                voice_id = upload_voice_model(api_key, title=title, description=description, audio_path=full_path)

                if voice_id:
                    caller["fishAudioVoiceId"] = voice_id
                    cloned_count += 1
                    save_bible(bible)
                    print(f"    -> Created Model ID: {voice_id}")

                    if sanity_token:
                        if patch_sanity_voice_id(project_id, dataset, sanity_token, clean_doc_id, voice_id):
                            print(f"    -> [CMS UPDATED] Synced ID to Sanity doc '{clean_doc_id}'")
                            sanity_synced_count += 1

                    if run_test:
                        test_synthesize_sample(api_key, voice_id, caller["archetype"])

                    time.sleep(1)

            elif (live_mode or sync_sanity_flag) and sanity_token and has_id:
                # Sync existing voice ID to Sanity if not yet synced
                if patch_sanity_voice_id(project_id, dataset, sanity_token, clean_doc_id, has_id):
                    print(f"    -> [CMS UPDATED] Synced existing ID {has_id} to Sanity doc '{clean_doc_id}'")
                    sanity_synced_count += 1
        else:
            missing.append(f"{tag} ({caller['archetype']})")

    if live_mode or sync_sanity_flag:
        save_bible(bible)
        print(f"\nSaved updated station bible at {BIBLE_PATH}")

    print("\n----------------------------------------------------------")
    print(f"Summary:")
    print(f"  Voice samples ready:  {total_ready}")
    print(f"  Newly cloned models:  {cloned_count}")
    print(f"  Sanity CMS synced:    {sanity_synced_count}")
    if missing:
        print(f"  Missing samples ({len(missing)}): {', '.join(missing)}")
    print("----------------------------------------------------------")

if __name__ == "__main__":
    main()
