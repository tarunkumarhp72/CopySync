"use client";

import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  GripVertical,
  Move,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";

const MIN_WIDTH = 80;
const MAX_WIDTH = 1600;

function ResizableImageView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [livePos, setLivePos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const width = liveWidth ?? (Number(node.attrs.width) || undefined);
  const align = node.attrs.align || "left";
  const posX = livePos ? livePos.x : (Number(node.attrs.x) || 0);
  const posY = livePos ? livePos.y : (Number(node.attrs.y) || 0);
  const isFree = node.attrs.mode === "free" || posX !== 0 || posY !== 0;

  // 1. Free 360° Drag to Move Anywhere (Draw.io style)
  const startFreeMove = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = Number(node.attrs.x) || 0;
    const originY = Number(node.attrs.y) || 0;

    let currentX = originX;
    let currentY = originY;

    const onPointerMove = (moveEvent: PointerEvent) => {
      currentX = Math.round(originX + (moveEvent.clientX - startX));
      currentY = Math.round(originY + (moveEvent.clientY - startY));
      setLivePos({ x: currentX, y: currentY });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      setIsDragging(false);
      updateAttributes({
        x: currentX,
        y: currentY,
        mode: "free",
        align: "free",
      });
      setLivePos(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  };

  // 2. Corner Resizing (4 Corners)
  const resize =
    (corner: "top-left" | "top-right" | "bottom-left" | "bottom-right") =>
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      setIsResizing(true);
      const startX = event.clientX;
      const startWidth = imageRef.current?.getBoundingClientRect().width ?? 320;
      const maxWidth =
        imageRef.current?.parentElement?.parentElement?.getBoundingClientRect().width ?? MAX_WIDTH;
      let nextWidth = startWidth;
      const direction = corner.endsWith("left") ? -1 : 1;

      const onMove = (move: PointerEvent) => {
        nextWidth = Math.round(
          Math.min(
            Math.max(startWidth + direction * (move.clientX - startX), MIN_WIDTH),
            Math.min(MAX_WIDTH, maxWidth)
          )
        );
        setLiveWidth(nextWidth);
      };

      const onEnd = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        setIsResizing(false);
        updateAttributes({ width: nextWidth });
        setLiveWidth(null);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onEnd, { once: true });
    };

  // 3. Reset to standard inline alignment
  const setAlignment = (next: "left" | "center" | "right") => {
    updateAttributes({
      align: next,
      mode: "inline",
      x: 0,
      y: 0,
    });
    setLivePos(null);
  };

  // 4. Reset free position back to original text flow (0, 0)
  const resetPosition = () => {
    updateAttributes({
      x: 0,
      y: 0,
      mode: "inline",
      align: "left",
    });
    setLivePos(null);
  };

  return (
    <NodeViewWrapper
      className={`note-image note-image--${align} ${isFree ? "note-image--free" : ""} ${selected ? "is-selected" : ""} ${isDragging ? "is-dragging" : ""}`}
      style={{
        transform: isFree ? `translate(${posX}px, ${posY}px)` : undefined,
        zIndex: isDragging ? 50 : selected ? 30 : isFree ? 15 : undefined,
        transition: isDragging || isResizing ? "none" : "transform 0.08s ease-out",
      }}
    >
      {selected && (
        <div className="note-image__toolbar" contentEditable={false}>
          {/* Free 360-degree Move Handle (Draw.io style) */}
          <button
            type="button"
            aria-label="Hold and drag to move freely anywhere"
            title="Hold and drag to move freely anywhere (Draw.io style)"
            className="note-image__btn note-image__btn--move"
            onPointerDown={startFreeMove}
          >
            <Move size={15} className="text-accent" />
          </button>

          {/* Block Drag Handle (TipTap native block reordering in text) */}
          <span
            className="note-image__drag"
            title="Drag to reorder in document text flow"
            data-drag-handle
          >
            <GripVertical size={15} />
          </span>

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* Alignment Buttons */}
          <button
            type="button"
            aria-label="Align image left"
            title="Align Left (inline)"
            className={align === "left" && !isFree ? "is-active" : ""}
            onClick={() => setAlignment("left")}
          >
            <AlignLeft size={15} />
          </button>
          <button
            type="button"
            aria-label="Center image"
            title="Center (inline)"
            className={align === "center" && !isFree ? "is-active" : ""}
            onClick={() => setAlignment("center")}
          >
            <AlignCenter size={15} />
          </button>
          <button
            type="button"
            aria-label="Align image right"
            title="Align Right (inline)"
            className={align === "right" && !isFree ? "is-active" : ""}
            onClick={() => setAlignment("right")}
          >
            <AlignRight size={15} />
          </button>

          {/* Reset position button (shown if freely moved) */}
          {isFree && (
            <button
              type="button"
              aria-label="Reset position to inline flow"
              title="Reset position to document flow"
              onClick={resetPosition}
            >
              <RotateCcw size={14} />
            </button>
          )}

          <div className="h-4 w-px bg-border/80 mx-0.5" />

          {/* Delete Image button */}
          <button
            type="button"
            aria-label="Delete image"
            title="Delete image"
            className="hover:!text-red-600 hover:!bg-red-50"
            onClick={() => deleteNode?.()}
          >
            <Trash2 size={14} />
          </button>

          {/* Coordinates readout for Draw.io feel */}
          {isFree && (
            <span className="hidden sm:inline-block px-1.5 text-[10px] font-mono text-muted border-l border-border/80">
              {posX >= 0 ? `+${posX}` : posX}px, {posY >= 0 ? `+${posY}` : posY}px
            </span>
          )}
        </div>
      )}

      {/* Main Image - directly draggable when selected */}
      <img
        ref={imageRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        draggable={false}
        onPointerDown={(e) => {
          if (selected) {
            startFreeMove(e);
          }
        }}
        style={{
          width: width ? `${width}px` : undefined,
          cursor: selected ? "grab" : "pointer",
        }}
        className={selected ? "ring-2 ring-accent ring-offset-2" : ""}
      />

      {/* 4 Corner Resize Handles */}
      {selected && (
        <>
          {(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => (
            <button
              key={corner}
              type="button"
              aria-label={`Resize image from ${corner.replace("-", " ")}`}
              className={`note-image__resize note-image__resize--${corner}`}
              contentEditable={false}
              onPointerDown={resize(corner)}
            />
          ))}
        </>
      )}
    </NodeViewWrapper>
  );
}

export const ResizableImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width") || element.style.width,
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      align: {
        default: "left",
        parseHTML: (element) => element.getAttribute("data-align") || "left",
        renderHTML: (attributes) => ({ "data-align": attributes.align || "left" }),
      },
      x: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-x")) || 0,
        renderHTML: (attributes) => (attributes.x ? { "data-x": attributes.x } : {}),
      },
      y: {
        default: 0,
        parseHTML: (element) => Number(element.getAttribute("data-y")) || 0,
        renderHTML: (attributes) => (attributes.y ? { "data-y": attributes.y } : {}),
      },
      mode: {
        default: "inline",
        parseHTML: (element) => element.getAttribute("data-mode") || "inline",
        renderHTML: (attributes) => ({ "data-mode": attributes.mode || "inline" }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
