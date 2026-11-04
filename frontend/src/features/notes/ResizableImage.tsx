"use client";

import Image from "@tiptap/extension-image";
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { AlignCenter, AlignLeft, AlignRight, GripVertical } from "lucide-react";
import { useRef, useState } from "react";

const MIN_WIDTH = 120;
const MAX_WIDTH = 1600;

function ResizableImageView({ node, selected, updateAttributes }: NodeViewProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const width = liveWidth ?? (Number(node.attrs.width) || undefined);
  const align = node.attrs.align || "left";

  const resize = (corner: "top-left" | "top-right" | "bottom-left" | "bottom-right") => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = imageRef.current?.getBoundingClientRect().width ?? 320;
    const maxWidth = imageRef.current?.parentElement?.parentElement?.getBoundingClientRect().width ?? MAX_WIDTH;
    let nextWidth = startWidth;
    const direction = corner.endsWith("left") ? -1 : 1;
    const onMove = (move: PointerEvent) => { nextWidth = Math.round(Math.min(Math.max(startWidth + direction * (move.clientX - startX), MIN_WIDTH), Math.min(MAX_WIDTH, maxWidth))); setLiveWidth(nextWidth); };
    const onEnd = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      updateAttributes({ width: nextWidth });
      setLiveWidth(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onEnd, { once: true });
  };

  const setAlignment = (next: "left" | "center" | "right") => updateAttributes({ align: next });
  return <NodeViewWrapper className={`note-image note-image--${align} ${selected ? "is-selected" : ""}`} data-drag-handle>
    {selected && <div className="note-image__toolbar" contentEditable={false}>
      <span className="note-image__drag" title="Drag to move in this note" data-drag-handle><GripVertical size={16}/></span>
      <button type="button" aria-label="Align image left" onClick={() => setAlignment("left")}><AlignLeft size={15}/></button>
      <button type="button" aria-label="Center image" onClick={() => setAlignment("center")}><AlignCenter size={15}/></button>
      <button type="button" aria-label="Align image right" onClick={() => setAlignment("right")}><AlignRight size={15}/></button>
    </div>}
    <img ref={imageRef} src={node.attrs.src} alt={node.attrs.alt ?? ""} draggable={false} style={width ? { width: `${width}px` } : undefined} />
    {selected && <>{(["top-left", "top-right", "bottom-left", "bottom-right"] as const).map(corner => <button key={corner} type="button" aria-label={`Resize image from ${corner.replace("-", " ")}`} className={`note-image__resize note-image__resize--${corner}`} contentEditable={false} onPointerDown={resize(corner)} />)}</>}
  </NodeViewWrapper>;
}

export const ResizableImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null, parseHTML: element => element.getAttribute("width"), renderHTML: attributes => attributes.width ? { width: attributes.width } : {} },
      align: { default: "left", parseHTML: element => element.getAttribute("data-align") || "left", renderHTML: attributes => ({ "data-align": attributes.align || "left" }) },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});
