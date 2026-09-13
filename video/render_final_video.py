import json
import os
import subprocess
import sys

FFMPEG_PATH = r"C:\Users\ayush\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffmpeg.exe"
FFPROBE_PATH = r"C:\Users\ayush\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg.Essentials_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.1-essentials_build\bin\ffprobe.exe"

def format_srt_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"

def main():
    print("========================================")
    print("Mermail Operations Agent — Video Renderer")
    print("========================================")

    with open("video/scenes.json", "r", encoding="utf-8") as f:
        scenes = json.load(f)

    proc_dir = os.path.abspath("video/processed_scenes")
    os.makedirs(proc_dir, exist_ok=True)

    concat_lines = []
    srt_lines = []
    current_time = 0.0

    print(f"\nProcessing {len(scenes)} scenes...")

    for idx, scene in enumerate(scenes, 1):
        scene_id = scene["id"]
        scene_dur = scene["sceneDuration"]
        raw_video = os.path.abspath(f"video/raw_scenes/{scene_id}.webm")
        audio_file = os.path.abspath(scene["audioFile"])
        out_mp4 = os.path.abspath(f"video/processed_scenes/{scene_id}.mp4")

        if not os.path.exists(raw_video):
            print(f"ERROR: Missing raw video for {scene_id}: {raw_video}")
            sys.exit(1)
        if not os.path.exists(audio_file):
            print(f"ERROR: Missing audio file for {scene_id}: {audio_file}")
            sys.exit(1)

        print(f"[{idx}/{len(scenes)}] Rendering {scene_id} (target: {scene_dur}s)...")

        # Encode scene to standardized 1080p 30fps MP4 with audio padding to exact duration
        cmd = [
            FFMPEG_PATH, "-y",
            "-i", raw_video,
            "-i", audio_file,
            "-filter_complex",
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,setsar=1[v];[1:a]apad,aresample=44100[a]",
            "-map", "[v]",
            "-map", "[a]",
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "19",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-ac", "2",
            "-t", str(scene_dur),
            out_mp4
        ]

        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"FFmpeg error on {scene_id}:\n{res.stderr}")
            sys.exit(1)

        concat_lines.append(f"file '{out_mp4.replace(chr(92), '/')}'")

        # Build SRT entry
        start_srt = format_srt_time(current_time)
        end_srt = format_srt_time(current_time + scene_dur - 0.2)
        srt_lines.append(f"{idx}\n{start_srt} --> {end_srt}\n{scene['text']}\n")

        current_time += scene_dur

    # Write concat list
    concat_file = os.path.abspath("video/concat_list.txt")
    with open(concat_file, "w", encoding="utf-8") as f:
        f.write("\n".join(concat_lines))

    # Write SRT subtitles
    srt_file = os.path.abspath("video/subtitles.srt")
    with open(srt_file, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))
    print(f"\nGenerated subtitles: {srt_file}")

    # Concatenate all scenes into final video
    master_mp4 = os.path.abspath("video/mermail-agent-skill-demo.mp4")
    root_mp4 = os.path.abspath("mermail-agent-skill-demo.mp4")

    print(f"\nConcatenating {len(scenes)} scenes into final video...")
    concat_cmd = [
        FFMPEG_PATH, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file,
        "-i", srt_file,
        "-c", "copy",
        "-c:s", "mov_text",
        "-metadata:s:s:0", "language=eng",
        "-metadata", "title=Mermail Operations Agent — Demonstration",
        master_mp4
    ]

    res = subprocess.run(concat_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode != 0:
        print(f"Concat error:\n{res.stderr}")
        sys.exit(1)

    # Copy to root
    import shutil
    shutil.copyfile(master_mp4, root_mp4)
    print(f"Master video rendered: {master_mp4}")
    print(f"Copied to root: {root_mp4}")

    # Probe final output
    probe_cmd = [
        FFPROBE_PATH,
        "-v", "error",
        "-show_entries", "format=duration,size,bit_rate:stream=width,height,codec_name,r_frame_rate",
        "-of", "json",
        master_mp4
    ]
    probe_res = subprocess.run(probe_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    probe_data = json.loads(probe_res.stdout)

    dur = float(probe_data["format"]["duration"])
    mins = int(dur // 60)
    secs = dur % 60
    size_mb = float(probe_data["format"]["size"]) / (1024 * 1024)

    print("\n========================================")
    print("FINAL VIDEO VERIFICATION:")
    print(f"Duration: {dur:.2f} seconds ({mins}m {secs:.1f}s)")
    print(f"Target Constraint: 2 to 5 minutes (120s - 300s)")
    print(f"Requirement Met: {'YES (PASS)' if 120 <= dur <= 300 else 'NO (FAIL)'}")
    print(f"File Size: {size_mb:.2f} MB")
    for s in probe_data.get("streams", []):
        print(f"Stream: {s.get('codec_name')} | {s.get('width', '')}x{s.get('height', '')} | fps: {s.get('r_frame_rate', '')}")
    print("========================================")

if __name__ == "__main__":
    main()
