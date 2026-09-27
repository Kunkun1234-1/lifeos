#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROMO_DIR="$(cd -- "$SOURCE_DIR/.." && pwd)"
VIDEO_DIR="$PROMO_DIR/video"
COPY_DIR="$PROMO_DIR/copy"
XHS_DIR="$PROMO_DIR/images/xiaohongshu"
ZHIHU_DIR="$PROMO_DIR/images/zhihu"
FONT_NAME="Heiti SC"

mkdir -p "$VIDEO_DIR"

ffmpeg -y -hide_banner -loglevel warning \
  -f lavfi -i "aevalsrc=0.04*sin(2*PI*110*t)+0.025*sin(2*PI*164.81*t)+0.015*sin(2*PI*220*t):s=48000:d=52.2" \
  -af "lowpass=f=900,afade=t=in:st=0:d=2,afade=t=out:st=49.2:d=3" \
  -c:a aac -b:a 160k "$VIDEO_DIR/ambient-original.m4a"

ffmpeg -y -hide_banner -loglevel warning \
  -loop 1 -t 7.0 -i "$XHS_DIR/01-cover.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/02.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/03.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/04.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/05.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/06.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/07.png" \
  -loop 1 -t 7.0 -i "$XHS_DIR/08.png" \
  -i "$VIDEO_DIR/narration.m4a" \
  -i "$VIDEO_DIR/ambient-original.m4a" \
  -filter_complex "
    [0:v]split=2[b0][f0];[b0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb0];[f0]scale=1020:-2[ff0];[bb0][ff0]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v0];
    [1:v]split=2[b1][f1];[b1]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb1];[f1]scale=1020:-2[ff1];[bb1][ff1]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v1];
    [2:v]split=2[b2][f2];[b2]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb2];[f2]scale=1020:-2[ff2];[bb2][ff2]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v2];
    [3:v]split=2[b3][f3];[b3]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb3];[f3]scale=1020:-2[ff3];[bb3][ff3]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v3];
    [4:v]split=2[b4][f4];[b4]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb4];[f4]scale=1020:-2[ff4];[bb4][ff4]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v4];
    [5:v]split=2[b5][f5];[b5]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb5];[f5]scale=1020:-2[ff5];[bb5][ff5]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v5];
    [6:v]split=2[b6][f6];[b6]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb6];[f6]scale=1020:-2[ff6];[bb6][ff6]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v6];
    [7:v]split=2[b7][f7];[b7]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=brightness=-0.42[bb7];[f7]scale=1020:-2[ff7];[bb7][ff7]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v7];
    [v0][v1]xfade=transition=fade:duration=0.5:offset=6.5[x1];
    [x1][v2]xfade=transition=fade:duration=0.5:offset=13.0[x2];
    [x2][v3]xfade=transition=fade:duration=0.5:offset=19.5[x3];
    [x3][v4]xfade=transition=fade:duration=0.5:offset=26.0[x4];
    [x4][v5]xfade=transition=fade:duration=0.5:offset=32.5[x5];
    [x5][v6]xfade=transition=fade:duration=0.5:offset=39.0[x6];
    [x6][v7]xfade=transition=fade:duration=0.5:offset=45.5[x7];
    [x7]subtitles='$COPY_DIR/video-subtitles.srt':force_style='FontName=$FONT_NAME,FontSize=9,PrimaryColour=&H00FFFFFF,OutlineColour=&HCC000000,BorderStyle=1,Outline=1.3,Shadow=0,MarginV=24,Alignment=2'[vout];
    [8:a]volume=1.0[narr];[9:a]volume=0.55[bed];[narr][bed]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.92[aout]
  " \
  -map "[vout]" -map "[aout]" -t 52.2 \
  -r 30 -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart "$VIDEO_DIR/lifeos-xiaohongshu-1080x1920.mp4"

ffmpeg -y -hide_banner -loglevel warning \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/00-cover-900x383.png" \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/01.png" \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/02.png" \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/03.png" \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/04.png" \
  -loop 1 -t 9.2 -i "$ZHIHU_DIR/05.png" \
  -i "$VIDEO_DIR/narration.m4a" \
  -i "$VIDEO_DIR/ambient-original.m4a" \
  -filter_complex "
    [0:v]split=2[b0][f0];[b0]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,eq=brightness=-0.42[bb0];[f0]scale=1840:-2[ff0];[bb0][ff0]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setsar=1[v0];
    [1:v]scale=1920:1080,format=yuv420p,setsar=1[v1];
    [2:v]scale=1920:1080,format=yuv420p,setsar=1[v2];
    [3:v]scale=1920:1080,format=yuv420p,setsar=1[v3];
    [4:v]scale=1920:1080,format=yuv420p,setsar=1[v4];
    [5:v]scale=1920:1080,format=yuv420p,setsar=1[v5];
    [v0][v1]xfade=transition=fade:duration=0.5:offset=8.7[x1];
    [x1][v2]xfade=transition=fade:duration=0.5:offset=17.4[x2];
    [x2][v3]xfade=transition=fade:duration=0.5:offset=26.1[x3];
    [x3][v4]xfade=transition=fade:duration=0.5:offset=34.8[x4];
    [x4][v5]xfade=transition=fade:duration=0.5:offset=43.5[x5];
    [x5]subtitles='$COPY_DIR/video-subtitles.srt':force_style='FontName=$FONT_NAME,FontSize=9,PrimaryColour=&H00FFFFFF,OutlineColour=&HCC000000,BorderStyle=1,Outline=1.3,Shadow=0,MarginV=12,Alignment=2'[vout];
    [6:a]volume=1.0[narr];[7:a]volume=0.55[bed];[narr][bed]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.92[aout]
  " \
  -map "[vout]" -map "[aout]" -t 52.2 \
  -r 30 -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -movflags +faststart "$VIDEO_DIR/lifeos-zhihu-1920x1080.mp4"

ffprobe -v error -show_entries stream=width,height,codec_name -show_entries format=duration,size \
  -of json "$VIDEO_DIR/lifeos-xiaohongshu-1080x1920.mp4"
ffprobe -v error -show_entries stream=width,height,codec_name -show_entries format=duration,size \
  -of json "$VIDEO_DIR/lifeos-zhihu-1920x1080.mp4"
