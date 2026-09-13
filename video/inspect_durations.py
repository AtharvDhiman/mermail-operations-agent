import json
import subprocess
import os

FFPROBE_BIN = r"C:\Users\ayush\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffprobe.exe"

with open("video/scenes.json", "r", encoding="utf-8") as f:
    scenes = json.load(f)

total_duration = 0.0
for s in scenes:
    audio_path = s["audioFile"]
    cmd = [
        FFPROBE_BIN, "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1",
        audio_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True)
    dur = float(res.stdout.strip())
    s["audioDuration"] = round(dur, 2)
    s["sceneDuration"] = round(dur + 1.2, 2)
    total_duration += s["sceneDuration"]
    print(f"{s['id']}: audio={dur:.2f}s -> scene={s['sceneDuration']:.2f}s | {s['title']}")

print(f"\nTotal Planned Video Duration: {total_duration:.2f} seconds ({int(total_duration // 60)}m {int(total_duration % 60)}s)")

with open("video/scenes.json", "w", encoding="utf-8") as f:
    json.dump(scenes, f, indent=2)
