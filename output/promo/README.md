# LifeOS 开源推广素材包

这套素材以“小红书负责快速建立兴趣、知乎负责解释产品与技术深度”为分工，全部成品已导出，可在开源地址准备好后直接发布。

## 交付内容

- `images/xiaohongshu/`：8 张 1242×1660 的 3:4 图文笔记图片。
- `images/zhihu/`：1 张 900×383 文章封面与 5 张 1200×675 正文配图。
- `video/lifeos-xiaohongshu-1080x1920.mp4`：52.2 秒竖版视频，H.264 + AAC，含 Qwen3-TTS 神经旁白、原创环境音与烧录字幕。
- `video/lifeos-zhihu-1920x1080.mp4`：52.2 秒横版视频，H.264 + AAC，含 Qwen3-TTS 神经旁白、原创环境音与烧录字幕。
- `video/narration.m4a`：成片使用的 52.0 秒神经旁白；`narration-qwen-vivian.wav` 为无损版本。
- `video/*-video-cover-*.png`：两个平台的视频封面。
- `copy/xiaohongshu-post.md`：可直接修改发布的小红书标题、正文和标签。
- `copy/zhihu-article-draft.md`：知乎文章初稿及图片插入位置。
- `copy/open-source-release-checklist.md`：公开仓库前必须处理的安全与版权事项。
- `source/cards.html`：全部宣传图的可编辑排版源文件。
- `source/build-videos.sh`：视频可复现构建脚本。
- `source/generate-neural-narration.sh`：在 Apple Silicon 上用 Qwen3-TTS + MLX-Audio 重新生成旁白。
- `copy/tts-model-notes.md`：模型、音色、风格和响度记录。

## 发布前只需替换

1. 文案中的 `【开源地址】` 与 `【在线体验】`。
2. 如果开源状态已经完成，可将图片和文案里的“准备开源”改成“现已开源”，然后重新截图导出。
3. 必须先完成 `copy/open-source-release-checklist.md` 中的密钥轮换、License 和素材版权审计。

## 建议发布顺序

1. 小红书先发 8 张图文笔记，收集“想要什么功能”和“是否愿意参与”的反馈。
2. 同日或次日发竖版视频，标题聚焦“能被 ChatGPT 操作的 LifeOS”。
3. 知乎发布长文，配 5 张技术解释图；横版视频可嵌在文章开头或结尾。
4. 仓库公开后，把两篇正文和置顶评论中的占位地址统一替换为真实 GitHub 地址。
