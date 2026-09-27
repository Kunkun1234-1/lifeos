#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROMO_DIR="$(cd -- "$SOURCE_DIR/.." && pwd)"
VIDEO_DIR="$PROMO_DIR/video"
COPY_DIR="$PROMO_DIR/copy"
MODEL_ID="mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit"
VOICE="Vivian"
TARGET_DURATION="52.0"
RAW_PREFIX="narration-qwen-vivian-raw"
RAW_AUDIO="$VIDEO_DIR/${RAW_PREFIX}_000.wav"
FINAL_WAV="$VIDEO_DIR/narration-qwen-vivian.wav"
FINAL_M4A="$VIDEO_DIR/narration.m4a"
INSTRUCT="像一位真正做出产品的年轻女性开发者，在向朋友介绍自己的作品。自然、清晰、自信、有亲和力；略带兴奋但保持克制。不要新闻播音腔，不要广告叫卖，技术缩写发音清楚，句间自然停顿。"

mkdir -p "$VIDEO_DIR"
narration_text="$(tr '\n' ' ' < "$COPY_DIR/video-narration-tts.txt")"

uvx --prerelease=allow --from mlx-audio mlx_audio.tts.generate \
  --model "$MODEL_ID" \
  --text "$narration_text" \
  --voice "$VOICE" \
  --lang_code Chinese \
  --speed 1.08 \
  --instruct "$INSTRUCT" \
  --temperature 0.65 \
  --top_p 0.9 \
  --repetition_penalty 1.12 \
  --max_tokens 1600 \
  --output_path "$VIDEO_DIR" \
  --file_prefix "$RAW_PREFIX" \
  --audio_format wav \
  --verbose

raw_duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$RAW_AUDIO")"
tempo="$(awk -v duration="$raw_duration" -v target="$TARGET_DURATION" 'BEGIN { printf "%.8f", duration / target }')"

ffmpeg -y -hide_banner -loglevel warning \
  -i "$RAW_AUDIO" \
  -af "highpass=f=65,atempo=$tempo,loudnorm=I=-16:TP=-1.5:LRA=7,afade=t=in:st=0:d=0.08,afade=t=out:st=51.65:d=0.35" \
  -ar 48000 -ac 1 "$FINAL_WAV"

ffmpeg -y -hide_banner -loglevel warning \
  -i "$FINAL_WAV" \
  -c:a aac -b:a 192k "$FINAL_M4A"

ffprobe -v error \
  -show_entries stream=codec_name,sample_rate,channels \
  -show_entries format=duration,size \
  -of json "$FINAL_M4A"
