# 神经配音制作记录

- 模型：`mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit`
- 原始模型系列：Qwen3-TTS
- 本机运行器：MLX-Audio
- 音色：`Vivian`（中文原生音色）
- 风格：自然、清晰、自信、略带分享感；避免新闻播音腔和夸张广告腔。
- 运行环境：Apple M3、16GB 内存，本地离线推理。
- 成片旁白：52.0 秒、48kHz、单声道；归一化目标为 -16 LUFS、峰值不高于 -1.5 dBFS。

发音稿在 `video-narration-tts.txt`，生成脚本在 `../source/generate-neural-narration.sh`。首次执行会下载约 2GB 模型权重，之后复用本地缓存。

相关上游：

- Qwen3-TTS：https://github.com/QwenLM/Qwen3-TTS
- MLX-Audio：https://github.com/Blaizzy/mlx-audio
- MLX 模型：https://huggingface.co/mlx-community/Qwen3-TTS-12Hz-0.6B-CustomVoice-8bit
