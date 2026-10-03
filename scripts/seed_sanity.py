#!/usr/bin/env python3
"""
Foul Play FM — Sanity CMS Automated Seeding Script
Reads lib/data/station-bible.json and creates all Presenters, Shows, and Callers
in your Sanity dataset using Sanity's HTTP Mutations API.
"""

import os
import sys
import json
import urllib.request
import urllib.error

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

def main():
    env = load_env()
    project_id = env.get("NEXT_PUBLIC_SANITY_PROJECT_ID") or os.environ.get("NEXT_PUBLIC_SANITY_PROJECT_ID")
    dataset = env.get("NEXT_PUBLIC_SANITY_DATASET") or os.environ.get("NEXT_PUBLIC_SANITY_DATASET") or "production"
    write_token = env.get("SANITY_API_WRITE_TOKEN") or env.get("SANITY_WRITE_TOKEN") or os.environ.get("SANITY_API_WRITE_TOKEN")

    print("==========================================================")
    print("  FOUL PLAY FM — Sanity CMS Database Seeder")
    print("==========================================================")
    print(f"Project ID: {project_id or 'NOT CONFIGURED'}")
    print(f"Dataset:    {dataset}")
    print(f"Auth Token: {'Configured' if write_token else 'NOT CONFIGURED (Set SANITY_API_WRITE_TOKEN)'}\n")

    if not project_id or not write_token:
        print("[NOTICE] To seed your Sanity Studio, add these to your .env.local file:")
        print("  NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id")
        print("  NEXT_PUBLIC_SANITY_DATASET=production")
        print("  SANITY_API_WRITE_TOKEN=sk...")
        print("\nOnce added, re-run this script: python3 scripts/seed_sanity.py\n")
        return

    with open(BIBLE_PATH, "r") as f:
        bible = json.load(f)

    mutations = []

    # 1. Presenters (9 DJs + 8 Side Characters)
    presenter_id_map = {}
    for dj in bible["djs"]:
        doc_id = f"presenter-{dj['id']}"
        presenter_id_map[dj["id"]] = doc_id
        mutations.append({
            "createOrReplace": {
                "_id": doc_id,
                "_type": "presenter",
                "name": dj["name"],
                "slug": {"_type": "slug", "current": dj["id"]},
                "bio": dj["description"],
                "voicePrompt": dj["personality"],
                "parodyOf": dj["parodyOf"],
            }
        })

    for sc in bible["sideCharacters"]:
        doc_id = f"presenter-{sc['id']}"
        presenter_id_map[sc["id"]] = doc_id
        mutations.append({
            "createOrReplace": {
                "_id": doc_id,
                "_type": "presenter",
                "name": sc["name"],
                "slug": {"_type": "slug", "current": sc["id"]},
                "bio": sc["description"],
                "voicePrompt": f"Role: {sc['role']}. Prompt: {sc['aiPersonalityPrompt']}",
                "parodyOf": sc["parodyOf"],
            }
        })

    # 2. Shows (8 Shows)
    for show in bible["shows"]:
        doc_id = f"show-{show['id']}"
        host_refs = []
        for hid in show["hostIds"]:
            if hid in presenter_id_map:
                host_refs.append({
                    "_type": "reference",
                    "_ref": presenter_id_map[hid],
                    "_key": f"ref-{hid}"
                })

        mutations.append({
            "createOrReplace": {
                "_id": doc_id,
                "_type": "show",
                "title": show["title"],
                "slug": {"_type": "slug", "current": show["id"]},
                "timeSlot": show["timeSlot"]["startHour"],
                "description": show["shortDescription"] or show["detailedDescription"],
                "vibe": show["vibe"],
                "jellyfinPlaylistId": show.get("jellyfinPlaylistId", ""),
                "hosts": host_refs,
            }
        })

    # 3. Callers (25 Caller Personas)
    for caller in bible["callers"]:
        doc_id = f"caller-{caller['id']}"
        mutations.append({
            "createOrReplace": {
                "_id": doc_id,
                "_type": "caller",
                "voiceTag": caller["voiceTag"],
                "archetype": caller["archetype"],
                "targetOfSatire": caller["targetOfSatire"],
                "contextStrategy": caller["aiContextStrategy"],
                "voicePrompt": caller["description"],
                "sampleQuote": caller["recommendedPreviewText"],
            }
        })

    # Post mutations to Sanity
    endpoint = f"https://{project_id}.api.sanity.io/v2024-01-01/data/mutate/{dataset}"
    payload = json.dumps({"mutations": mutations}).encode("utf-8")

    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("Authorization", f"Bearer {write_token}")
    req.add_header("Content-Type", "application/json")

    print(f"Uploading {len(mutations)} documents to Sanity (DJs, Shows, Callers)...")
    try:
        with urllib.request.urlopen(req) as resp:
            resp_data = json.loads(resp.read().decode("utf-8"))
            print("Successfully seeded Sanity Studio!")
            print(f"Transaction ID: {resp_data.get('transactionId')}")
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"Error seeding Sanity ({e.code}): {error_body}")

if __name__ == "__main__":
    main()
