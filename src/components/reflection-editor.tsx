"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import styles from "./reflection-editor.module.css";

export type ReflectionEditorBlock =
  | { id: string; type: "text"; value: string }
  | { id: string; type: "image"; url: string; name: string; width: number };

export type ReflectionEditorHandle = {
  insertImage: (image: { url: string; name: string; width?: number }) => void;
};

type ReflectionEditorProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  uploading?: boolean;
};

const MIN_WIDTH = 160;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 480;
const IMAGE_TOKEN =
  /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)(?:\{width=(\d+)\})?/g;

export function parseReflectionMarkdown(markdown: string): ReflectionEditorBlock[] {
  const source = markdown ?? "";
  const blocks: ReflectionEditorBlock[] = [];
  const pattern = new RegExp(IMAGE_TOKEN.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const before = source.slice(lastIndex, match.index).replace(/^\n+/, "").replace(/\n+$/, "");
    if (before) {
      blocks.push({ id: createBlockId("text"), type: "text", value: before });
    }

    blocks.push({
      id: createBlockId("image"),
      type: "image",
      url: match[2].trim(),
      name: match[1].trim() || "插入图片",
      width: clampWidth(Number(match[3] || DEFAULT_WIDTH)),
    });
    lastIndex = match.index + match[0].length;
  }

  const rest = source.slice(lastIndex).replace(/^\n+/, "");
  if (rest || blocks.length === 0) {
    blocks.push({ id: createBlockId("text"), type: "text", value: rest });
  }

  return normalizeBlockList(blocks);
}

export function serializeReflectionBlocks(blocks: ReflectionEditorBlock[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      const text = block.value.replace(/\s+$/g, "");
      if (text) parts.push(text);
      continue;
    }
    const alt = block.name.replace(/[\[\]]/g, "");
    parts.push(`![${alt}](${block.url}){width=${clampWidth(block.width)}}`);
  }
  return parts.join("\n\n").trim();
}

export function extractReflectionImages(markdown: string) {
  const images: Array<{ id: string; url: string; name: string; width: number }> = [];
  const pattern = new RegExp(IMAGE_TOKEN.source, "g");
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(markdown)) !== null) {
    images.push({
      id: `md-img-${index++}`,
      url: match[2].trim(),
      name: match[1].trim() || "插入图片",
      width: clampWidth(Number(match[3] || DEFAULT_WIDTH)),
    });
  }
  return images;
}

export function appendImagesAsMarkdown(
  body: string,
  images: Array<{ url: string; name?: string; width?: number }>,
) {
  const existing = new Set(extractReflectionImages(body).map((image) => image.url));
  let next = body.trim();
  for (const image of images) {
    if (!image.url || existing.has(image.url)) continue;
    const alt = (image.name || "插入图片").replace(/[\[\]]/g, "");
    const width = clampWidth(image.width ?? DEFAULT_WIDTH);
    next = `${next}${next ? "\n\n" : ""}![${alt}](${image.url}){width=${width}}`;
    existing.add(image.url);
  }
  return next;
}

export const ReflectionEditor = forwardRef<ReflectionEditorHandle, ReflectionEditorProps>(
  function ReflectionEditor(
    { value, onChange, placeholder = "今天我观察到...", uploading = false },
    ref,
  ) {
    const [blocks, setBlocks] = useState<ReflectionEditorBlock[]>(() =>
      parseReflectionMarkdown(value),
    );
    const [focusedTextId, setFocusedTextId] = useState<string | null>(null);
    const skipNextEmit = useRef(false);
    const lastSerialized = useRef(serializeReflectionBlocks(parseReflectionMarkdown(value)));
    const blocksRef = useRef(blocks);
    const focusedRef = useRef(focusedTextId);

    blocksRef.current = blocks;
    focusedRef.current = focusedTextId;

    useEffect(() => {
      if (value === lastSerialized.current) return;
      skipNextEmit.current = true;
      const nextBlocks = parseReflectionMarkdown(value);
      setBlocks(nextBlocks);
      lastSerialized.current = serializeReflectionBlocks(nextBlocks);
    }, [value]);

    useEffect(() => {
      if (skipNextEmit.current) {
        skipNextEmit.current = false;
        return;
      }
      const serialized = serializeReflectionBlocks(blocks);
      if (serialized === lastSerialized.current) return;
      lastSerialized.current = serialized;
      onChange(serialized);
    }, [blocks, onChange]);

    const commitBlocks = (next: ReflectionEditorBlock[]) => {
      setBlocks(normalizeBlockList(next));
    };

    const insertImage = (image: { url: string; name: string; width?: number }) => {
      const current = blocksRef.current;
      const focusId = focusedRef.current;
      const imageBlock: ReflectionEditorBlock = {
        id: createBlockId("image"),
        type: "image",
        url: image.url,
        name: image.name,
        width: clampWidth(image.width ?? DEFAULT_WIDTH),
      };
      const trailingText: ReflectionEditorBlock = {
        id: createBlockId("text"),
        type: "text",
        value: "",
      };
      const focusIndex = focusId
        ? current.findIndex((block) => block.id === focusId)
        : -1;

      if (focusIndex >= 0) {
        const next = [...current];
        next.splice(focusIndex + 1, 0, imageBlock, trailingText);
        commitBlocks(next);
        return;
      }

      commitBlocks([...current, imageBlock, trailingText]);
    };

    useImperativeHandle(ref, () => ({ insertImage }));

    return (
      <div className={styles.editor}>
        <div className={styles.paper}>
          {blocks.map((block, index) => {
            if (block.type === "image") {
              return (
                <ResizableImage
                  key={block.id}
                  url={block.url}
                  name={block.name}
                  width={block.width}
                  onWidthChange={(width) => {
                    commitBlocks(
                      blocksRef.current.map((item) =>
                        item.id === block.id && item.type === "image"
                          ? { ...item, width: clampWidth(width) }
                          : item,
                      ),
                    );
                  }}
                  onRemove={() => {
                    commitBlocks(blocksRef.current.filter((item) => item.id !== block.id));
                  }}
                />
              );
            }

            const isSoloEmpty = blocks.length === 1 && !block.value;
            const showPlaceholder = isSoloEmpty || (index === 0 && !block.value);

            return (
              <AutoTextarea
                key={block.id}
                className={`${styles.textBlock}${isSoloEmpty ? ` ${styles.textBlockTall}` : ""}`}
                value={block.value}
                minHeight={isSoloEmpty ? 180 : 34}
                placeholder={showPlaceholder ? placeholder : "继续写下去..."}
                onFocus={() => setFocusedTextId(block.id)}
                onChange={(nextValue) => {
                  commitBlocks(
                    blocksRef.current.map((item) =>
                      item.id === block.id && item.type === "text"
                        ? { ...item, value: nextValue }
                        : item,
                    ),
                  );
                }}
              />
            );
          })}
        </div>
        <p className={styles.hint}>
          {uploading
            ? "图片上传中…"
            : "图片会插在当前段落下方；拖动右下角可调整宽度，效果类似 Markdown 插图。"}
        </p>
      </div>
    );
  },
);

function AutoTextarea({
  value,
  onChange,
  onFocus,
  placeholder,
  className,
  minHeight = 34,
}: {
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "0px";
    node.style.height = `${Math.max(minHeight, node.scrollHeight)}px`;
  }, [value, minHeight]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      placeholder={placeholder}
      onFocus={onFocus}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function ResizableImage({
  url,
  name,
  width,
  onWidthChange,
  onRemove,
}: {
  url: string;
  name: string;
  width: number;
  onWidthChange: (width: number) => void;
  onRemove: () => void;
}) {
  const labelId = useId();
  const startX = useRef(0);
  const startWidth = useRef(width);

  const onResizeStart = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    startX.current = event.clientX;
    startWidth.current = width;

    const onMove = (moveEvent: MouseEvent) => {
      onWidthChange(startWidth.current + (moveEvent.clientX - startX.current));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <figure className={styles.imageBlock} style={{ width }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={name} className={styles.image} draggable={false} />
      <figcaption className={styles.imageMeta} id={labelId}>
        <span className={styles.imageName}>{name}</span>
        <span className={styles.imageSize}>{Math.round(width)}px</span>
        <button type="button" className={styles.imageRemove} onClick={onRemove}>
          移除
        </button>
      </figcaption>
      <button
        type="button"
        className={styles.resizeHandle}
        aria-label="拖动调整图片宽度"
        aria-describedby={labelId}
        onMouseDown={onResizeStart}
      />
    </figure>
  );
}

function normalizeBlockList(blocks: ReflectionEditorBlock[]): ReflectionEditorBlock[] {
  const next: ReflectionEditorBlock[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      const prev = next[next.length - 1];
      if (prev?.type === "text") {
        prev.value = [prev.value, block.value].filter(Boolean).join("\n\n");
        continue;
      }
    }
    next.push({ ...block });
  }
  if (next.length === 0 || next[next.length - 1]?.type === "image") {
    next.push({ id: createBlockId("text"), type: "text", value: "" });
  }
  if (next[0]?.type === "image") {
    next.unshift({ id: createBlockId("text"), type: "text", value: "" });
  }
  return next;
}

function clampWidth(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_WIDTH;
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, Math.round(value)));
}

function createBlockId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
