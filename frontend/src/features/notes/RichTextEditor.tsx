"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, BubbleMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  List, 
  ListOrdered, 
  ImagePlus,
  Undo2,
  Redo2,
  Highlighter,
  Scissors,
  Copy,
  ClipboardPaste,
  Check,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Type,
  Baseline,
  X,
  RotateCcw,
  ChevronDown,
  MoreVertical,
  UploadCloud,
  Loader2,
} from "lucide-react";
import { ResizableImage } from "./ResizableImage";
import { FontSize, FontFamily } from "./textCustomExtensions";
import { motion, AnimatePresence } from "motion/react";

type Props = {
  noteId: string;
  content: string;
  onChange: (html: string) => void;
  onError: (message: string) => void;
  isSidebarOpen?: boolean;
  onRegisterSetContent?: (setter: (html: string) => void) => void;
};

const apiUrl = process.env.NEXT_PROD_API_URL;
const MAX_NOTE_CHARS = 20000;

// Instant Floating Hover Tooltip Component
function Tooltip({ 
  children, 
  text, 
  shortcut, 
  position = "bottom" 
}: { 
  children: ReactNode; 
  text: string; 
  shortcut?: string; 
  position?: "top" | "bottom" 
}) {
  return (
    <div className="group/tooltip relative inline-flex items-center">
      {children}
      <div 
        className={`pointer-events-none absolute left-1/2 -translate-x-1/2 scale-95 opacity-0 transition-all duration-150 ease-out group-hover/tooltip:scale-100 group-hover/tooltip:opacity-100 z-50 ${
          position === "top" ? "bottom-full mb-2" : "top-full mt-2"
        }`}
      >
        <div className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-stone-200/80 bg-white/95 px-2.5 py-1 text-[11px] font-medium text-stone-800 shadow-[0_8px_20px_rgba(40,36,30,0.12)] backdrop-blur-xl ring-1 ring-black/5">
          <span>{text}</span>
          {shortcut && (
            <kbd className="rounded bg-stone-200/70 px-1 py-0.2 font-mono text-[9px] text-stone-600 border border-stone-300/50">
              {shortcut}
            </kbd>
          )}
        </div>
      </div>
    </div>
  );
}

// Text Font Colors
const TEXT_COLORS = [
  { name: "Default (Charcoal)", color: "#1c1d22", border: "#cbd5e1" },
  { name: "Muted Slate", color: "#64748b", border: "#94a3b8" },
  { name: "Deep Olive", color: "#3d4035", border: "#585c4d" },
  { name: "Crimson Red", color: "#dc2626", border: "#ef4444" },
  { name: "Burnt Orange", color: "#ea580c", border: "#f97316" },
  { name: "Amber Gold", color: "#d97706", border: "#f59e0b" },
  { name: "Forest Green", color: "#16a34a", border: "#22c55e" },
  { name: "Teal", color: "#0d9488", border: "#14b8a6" },
  { name: "Sky Blue", color: "#0284c7", border: "#38bdf8" },
  { name: "Royal Indigo", color: "#4f46e5", border: "#6366f1" },
  { name: "Vibrant Purple", color: "#9333ea", border: "#a855f7" },
  { name: "Rose Pink", color: "#db2777", border: "#ec4899" },
];

// Pastel Highlighter Background Colors
const PASTEL_HIGHLIGHT_COLORS = [
  { name: "Lemon Yellow", color: "#fef08a", border: "#fde047" },
  { name: "Sunshine Orange", color: "#fed7aa", border: "#fdba74" },
  { name: "Mint Green", color: "#bbf7d0", border: "#86efac" },
  { name: "Bubble Pink", color: "#fbcfe8", border: "#f472b6" },
  { name: "Lavender Purple", color: "#e9d5ff", border: "#c084fc" },
  { name: "Sky Blue", color: "#bae6fd", border: "#38bdf8" },
  { name: "Coral Rose", color: "#fecaca", border: "#f87171" },
  { name: "Warm Amber", color: "#fde68a", border: "#facc15" },
  { name: "Aqua Teal", color: "#99f6e4", border: "#2dd4bf" },
  { name: "Soft Gray", color: "#e2e8f0", border: "#cbd5e1" },
];

// Font Sizes
const FONT_SIZES = [
  { label: "12px", value: "12px", name: "12 - Small" },
  { label: "14px", value: "14px", name: "14 - Regular" },
  { label: "16px", value: "16px", name: "16 - Body" },
  { label: "18px", value: "18px", name: "18 - Medium" },
  { label: "20px", value: "20px", name: "20 - Large (H3)" },
  { label: "24px", value: "24px", name: "24 - X-Large (H2)" },
  { label: "32px", value: "32px", name: "32 - Huge (H1)" },
  { label: "40px", value: "40px", name: "40 - Title" },
];

// Font Families / Styles
const FONT_FAMILIES = [
  { label: "Sans (Inter)", value: "var(--font-geist-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", shortName: "Sans" },
  { label: "Serif (Georgia)", value: "Georgia, Cambria, 'Times New Roman', Times, serif", shortName: "Serif" },
  { label: "Mono (Code)", value: "var(--font-geist-mono), Menlo, Monaco, Consolas, 'Courier New', monospace", shortName: "Mono" },
  { label: "Casual (Notes)", value: "Caveat, 'Segoe Print', 'Bradley Hand', cursive, sans-serif", shortName: "Casual" },
  { label: "Rounded (Modern)", value: "system-ui, -apple-system, 'SF Pro Rounded', 'Nunito', sans-serif", shortName: "Rounded" },
];

export function RichTextEditor({ noteId, content, onChange, onError, isSidebarOpen, onRegisterSetContent }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Popover visibility states
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showFontFamilyPicker, setShowFontFamilyPicker] = useState(false);
  const [showBubbleHighlight, setShowBubbleHighlight] = useState(false);
  const [showBubbleTextColor, setShowBubbleTextColor] = useState(false);
  const [showBubbleFontSize, setShowBubbleFontSize] = useState(false);
  const [showBubbleFontFamily, setShowBubbleFontFamily] = useState(false);
  const [showMobileMore, setShowMobileMore] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [charCount, setCharCount] = useState(0);

  // Image Upload Progress & Drag-and-Drop States
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    fileName: string;
    progress: number;
    previewUrl: string;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const activeXhrRef = useRef<XMLHttpRequest | null>(null);

  useEffect(() => {
    return () => {
      if (activeXhrRef.current) {
        activeXhrRef.current.abort();
        activeXhrRef.current = null;
      }
    };
  }, []);

  const closeAllPopovers = () => {
    setShowHighlightPicker(false);
    setShowTextColorPicker(false);
    setShowFontSizePicker(false);
    setShowFontFamilyPicker(false);
    setShowBubbleHighlight(false);
    setShowBubbleTextColor(false);
    setShowBubbleFontSize(false);
    setShowBubbleFontFamily(false);
    setShowMobileMore(false);
  };

  // Close popups on click outside or when typing Enter / Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest(".editor-popover-container")) {
        closeAllPopovers();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        closeAllPopovers();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      FontSize,
      FontFamily,
      Color,
      ResizableImage.configure({ allowBase64: false }),
    ],
    content,
    editorProps: {
      attributes: { class: "rich-editor" },
      handleKeyDown: (_, event) => {
        if (event.key === "Enter" || event.key === "Escape") {
          closeAllPopovers();
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        if (!moved && event.dataTransfer?.files?.length) {
          const image = Array.from(event.dataTransfer.files).find((file) =>
            file.type.startsWith("image/")
          );
          if (image) {
            event.preventDefault();
            const coordinates = view.posAtCoords({
              left: event.clientX,
              top: event.clientY,
            });
            if (coordinates && editor) {
              editor.commands.setTextSelection(coordinates.pos);
            }
            uploadImage(image);
            return true;
          }
        }
        return false;
      },
      handlePaste: (_, event) => {
        // Image paste check
        const image = Array.from(event.clipboardData?.files ?? []).find((file) =>
          file.type.startsWith("image/")
        );
        if (image) {
          event.preventDefault();
          uploadImage(image);
          return true;
        }

        // 20,000 character limit enforcement on paste
        const pastedText = event.clipboardData?.getData("text/plain") ?? "";
        if (pastedText && editor) {
          const currentLength = editor.getText().length;
          if (currentLength + pastedText.length > MAX_NOTE_CHARS) {
            event.preventDefault();
            const remaining = Math.max(0, MAX_NOTE_CHARS - currentLength);
            if (remaining > 0) {
              const trimmed = pastedText.slice(0, remaining);
              editor.chain().focus().insertContent(trimmed).run();
              onError(`Note character limit reached: Pasted text was trimmed to fit ${MAX_NOTE_CHARS.toLocaleString()} characters.`);
            } else {
              onError(`Character limit reached: Maximum ${MAX_NOTE_CHARS.toLocaleString()} characters per note.`);
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: instance }) => {
      const textLength = instance.getText().length;
      setCharCount(textLength);
      if (textLength > MAX_NOTE_CHARS) {
        onError(`Character limit reached (${MAX_NOTE_CHARS.toLocaleString()} max).`);
      }
      onChange(instance.getHTML());
    },
    onCreate: ({ editor: instance }) => {
      setCharCount(instance.getText().length);
    },
  });

  // When sidebar opens on mobile, close all popovers and blur editor to avoid floating overlaps
  useEffect(() => {
    if (isSidebarOpen) {
      closeAllPopovers();
      if (editor && !editor.isDestroyed) {
        editor.commands.blur();
      }
    }
  }, [isSidebarOpen, editor]);

  // Register external content setter (for live WebSocket mobile clipboard paste & version polling)
  useEffect(() => {
    if (editor && !editor.isDestroyed && onRegisterSetContent) {
      onRegisterSetContent((newHtml: string) => {
        if (!editor.isDestroyed) {
          editor.commands.setContent(newHtml, false);
          setCharCount(editor.getText().length);
        }
      });
      return () => {
        onRegisterSetContent(() => {});
      };
    }
  }, [editor, onRegisterSetContent]);

  // Sync content when content prop changes from external source (and editor is not actively focused/typing)
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHTML = editor.getHTML();
      if (content !== currentHTML && !editor.isFocused) {
        editor.commands.setContent(content, false);
        setCharCount(editor.getText().length);
      }
    }
  }, [content, editor]);

  const uploadImage = (file: File) => {
    if (!file.type.startsWith("image/")) {
      onError("Please choose an image file (PNG, JPG, WebP, GIF, SVG).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      onError("Images must be 5 MB or smaller.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setUploadState({
      isUploading: true,
      fileName: file.name,
      progress: 0,
      previewUrl,
    });

    const form = new FormData();
    form.append("image", file);

    const xhr = new XMLHttpRequest();
    activeXhrRef.current = xhr;
    xhr.open("POST", `${apiUrl}/uploads/images?note_id=${encodeURIComponent(noteId)}`);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadState((prev) => (prev ? { ...prev, progress: Math.min(99, percent) } : null));
      }
    };

    xhr.onload = () => {
      activeXhrRef.current = null;
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          setUploadState((prev) => (prev ? { ...prev, progress: 100 } : null));
          setTimeout(() => {
            setUploadState(null);
            URL.revokeObjectURL(previewUrl);
            editor?.chain().focus().setImage({ src: res.url, alt: file.name }).run();
          }, 300);
        } catch {
          setUploadState(null);
          URL.revokeObjectURL(previewUrl);
          onError("Failed to process uploaded image.");
        }
      } else {
        setUploadState(null);
        URL.revokeObjectURL(previewUrl);
        let detail = "Image upload failed.";
        try {
          const parsed = JSON.parse(xhr.responseText);
          if (parsed?.detail) detail = parsed.detail;
        } catch {}
        onError(detail);
      }
    };

    xhr.onerror = () => {
      activeXhrRef.current = null;
      setUploadState(null);
      URL.revokeObjectURL(previewUrl);
      onError("Network error during image upload.");
    };

    xhr.send(form);
  };

  const handleCut = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    try {
      await navigator.clipboard.writeText(text);
      editor.chain().focus().deleteSelection().run();
    } catch {
      document.execCommand("cut");
    }
  };

  const handleCopy = async () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 1500);
    } catch {
      document.execCommand("copy");
    }
  };

  const handlePaste = async () => {
    if (!editor) return;
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const currentLength = editor.getText().length;
        if (currentLength + text.length > MAX_NOTE_CHARS) {
          const remaining = Math.max(0, MAX_NOTE_CHARS - currentLength);
          if (remaining > 0) {
            editor.chain().focus().insertContent(text.slice(0, remaining)).run();
            onError(`Note limit reached: Text trimmed to ${MAX_NOTE_CHARS.toLocaleString()} characters.`);
          } else {
            onError(`Character limit reached: Maximum ${MAX_NOTE_CHARS.toLocaleString()} characters.`);
          }
        } else {
          editor.chain().focus().insertContent(text).run();
        }
      }
    } catch {
      onError("Clipboard read access was not permitted. Use Ctrl+V / Cmd+V.");
    }
  };

  if (!editor) return null;

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();
  const activeTextColor = editor.getAttributes("textStyle")?.color || "#1c1d22";
  const activeHighlightColor = editor.getAttributes("highlight")?.color || "#fef08a";
  const activeFontSize = editor.getAttributes("textStyle")?.fontSize || "";
  const activeFontFamily = editor.getAttributes("textStyle")?.fontFamily || "";

  const currentSizeLabel = FONT_SIZES.find((s) => s.value === activeFontSize)?.label || (activeFontSize ? activeFontSize : "16px");
  const currentFamilyLabel = FONT_FAMILIES.find((f) => f.value === activeFontFamily)?.shortName || "Sans";

  // Heading vs Inline Font Size toggle handler:
  // If partial text is selected, change ONLY the selected text's font size.
  // If whole line / cursor, toggle block heading.
  const handleHeadingClick = (level: 1 | 2 | 3) => {
    closeAllPopovers();
    if (!editor) return;
    const { from, to, $from, $to } = editor.state.selection;
    const isPartialSelection = from !== to && (from > $from.start() || to < $to.end());

    if (isPartialSelection) {
      const sizeMap: Record<number, string> = { 1: "32px", 2: "24px", 3: "20px" };
      const targetSize = sizeMap[level];
      if (activeFontSize === targetSize) {
        editor.chain().focus().unsetFontSize().run();
      } else {
        editor.chain().focus().setFontSize(targetSize).run();
      }
    } else {
      editor.chain().focus().toggleHeading({ level }).run();
    }
  };

  const handleParagraphClick = () => {
    closeAllPopovers();
    if (!editor) return;
    const { from, to, $from, $to } = editor.state.selection;
    const isPartialSelection = from !== to && (from > $from.start() || to < $to.end());
    if (isPartialSelection) {
      editor.chain().focus().unsetFontSize().run();
    } else {
      editor.chain().focus().setParagraph().run();
    }
  };

  const button = (
    label: string, 
    active: boolean, 
    action: () => void, 
    icon: ReactNode, 
    shortcut?: string,
    disabled = false
  ) => (
    <Tooltip text={label} shortcut={shortcut}>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        aria-label={label}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          closeAllPopovers();
          action();
        }}
        className={`relative grid size-8 place-items-center rounded-md transition ${
          active
            ? "bg-cream text-accent font-semibold shadow-xs"
            : "text-muted hover:bg-cream/60 hover:text-foreground"
        } ${disabled ? "opacity-30 pointer-events-none" : ""}`}
      >
        {icon}
      </motion.button>
    </Tooltip>
  );

  const isAnyTopPopoverOpen =
    showFontSizePicker ||
    showFontFamilyPicker ||
    showTextColorPicker ||
    showHighlightPicker;

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer?.types?.includes("Files")) {
      e.preventDefault();
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleContainerDrop = (e: React.DragEvent) => {
    setIsDragOver(false);
    const image = Array.from(e.dataTransfer?.files ?? []).find((file) =>
      file.type.startsWith("image/")
    );
    if (image) {
      e.preventDefault();
      uploadImage(image);
    }
  };

  return (
    <div className="relative mt-4 flex min-h-0 flex-1 flex-col">
      {/* ======================================================== */}
      {/* FLOATING SELECTION BUBBLE MENU (Transparent Glassmorphism) */}
      {/* ======================================================== */}
      <BubbleMenu
        editor={editor}
        tippyOptions={{ duration: 150, zIndex: 30, maxWidth: "none" }}
        className={`flex max-w-[calc(100vw-32px)] flex-col gap-1.5 rounded-2xl border border-white/80 bg-[#FAF9F6]/85 p-2 text-stone-800 shadow-[0_20px_50px_rgba(30,28,24,0.14),0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-2xl backdrop-saturate-150 ring-1 ring-black/5 transition-opacity duration-150 ${
          isAnyTopPopoverOpen || isSidebarOpen ? "opacity-0 pointer-events-none !hidden" : "opacity-100"
        }`}
      >
        {/* Row 1: Quick Actions: Cut / Copy / Paste / Undo / Redo */}
        <div className="flex flex-wrap items-center gap-1 border-b border-stone-200/70 pb-1.5 px-0.5 text-xs">
          <Tooltip text="Cut selection" shortcut="Ctrl+X" position="top">
            <button
              type="button"
              onClick={() => void handleCut()}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 transition"
            >
              <Scissors size={12} className="text-stone-600" />
              <span>Cut</span>
            </button>
          </Tooltip>

          <Tooltip text="Copy selection" shortcut="Ctrl+C" position="top">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 transition"
            >
              {hasCopied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-stone-600" />}
              <span>{hasCopied ? "Copied!" : "Copy"}</span>
            </button>
          </Tooltip>

          <Tooltip text="Paste clipboard" shortcut="Ctrl+V" position="top">
            <button
              type="button"
              onClick={() => void handlePaste()}
              className="flex items-center gap-1 rounded-md px-2 py-1 font-medium text-stone-700 hover:bg-stone-200/60 hover:text-stone-900 transition"
            >
              <ClipboardPaste size={12} className="text-stone-600" />
              <span>Paste</span>
            </button>
          </Tooltip>

          <span className="mx-1 h-3.5 w-px bg-stone-300/70" />

          <Tooltip text="Undo" shortcut="Ctrl+Z" position="top">
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => editor.chain().focus().undo().run()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 transition disabled:opacity-30"
            >
              <Undo2 size={12} />
            </button>
          </Tooltip>

          <Tooltip text="Redo" shortcut="Ctrl+Y" position="top">
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => editor.chain().focus().redo().run()}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-stone-500 hover:bg-stone-200/60 hover:text-stone-900 transition disabled:opacity-30"
            >
              <Redo2 size={12} />
            </button>
          </Tooltip>
        </div>

        {/* Row 2: Font Family + Font Size + Headings + Colors + Formatting */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {/* Bubble Font Family / Style Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Font style / typeface" position="top">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowBubbleFontFamily(!showBubbleFontFamily);
                  setShowBubbleFontSize(false);
                  setShowBubbleTextColor(false);
                  setShowBubbleHighlight(false);
                }}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition ${
                  showBubbleFontFamily ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
                }`}
              >
                <span className="text-[11px] font-serif italic text-stone-500">f</span>
                <span>{currentFamilyLabel}</span>
                <ChevronDown size={11} className="text-stone-500" />
              </button>
            </Tooltip>

            {showBubbleFontFamily && (
              <div className="absolute top-full left-0 mt-2 z-50 flex w-48 flex-col gap-0.5 rounded-xl border border-stone-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="px-2 py-1 text-[10px] font-semibold text-stone-500 border-b border-stone-200/70 mb-1">
                  Font Style / Typeface
                </div>
                {FONT_FAMILIES.map((fam) => {
                  const isCurrent = activeFontFamily === fam.value;
                  return (
                    <button
                      key={fam.label}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setFontFamily(fam.value).run();
                        setShowBubbleFontFamily(false);
                      }}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                        isCurrent
                          ? "bg-stone-200/90 text-stone-900 font-semibold"
                          : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span style={{ fontFamily: fam.value }}>{fam.label}</span>
                      {isCurrent && <Check size={12} className="text-stone-800" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetFontFamily().run();
                    setShowBubbleFontFamily(false);
                  }}
                  className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-100/90 py-1 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 transition"
                >
                  <RotateCcw size={10} />
                  <span>Reset font style</span>
                </button>
              </div>
            )}
          </div>

          {/* Bubble Font Size Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Font size" position="top">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowBubbleFontSize(!showBubbleFontSize);
                  setShowBubbleFontFamily(false);
                  setShowBubbleTextColor(false);
                  setShowBubbleHighlight(false);
                }}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition ${
                  showBubbleFontSize ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
                }`}
              >
                <span>{currentSizeLabel}</span>
                <ChevronDown size={11} className="text-stone-500" />
              </button>
            </Tooltip>

            {showBubbleFontSize && (
              <div className="absolute top-full left-0 mt-2 z-50 flex w-44 flex-col gap-0.5 rounded-xl border border-stone-200/90 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl">
                <div className="px-2 py-1 text-[10px] font-semibold text-stone-500 border-b border-stone-200/70 mb-1">
                  Font Size
                </div>
                {FONT_SIZES.map((sz) => {
                  const isCurrent = activeFontSize === sz.value;
                  return (
                    <button
                      key={sz.value}
                      type="button"
                      onClick={() => {
                        editor.chain().focus().setFontSize(sz.value).run();
                        setShowBubbleFontSize(false);
                      }}
                      className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                        isCurrent
                          ? "bg-stone-200/90 text-stone-900 font-semibold"
                          : "text-stone-700 hover:bg-stone-100 hover:text-stone-900"
                      }`}
                    >
                      <span>{sz.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono">{sz.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetFontSize().run();
                    setShowBubbleFontSize(false);
                  }}
                  className="mt-1 flex items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-100/90 py-1 text-[11px] text-stone-600 hover:text-stone-900 hover:bg-stone-200/80 transition"
                >
                  <RotateCcw size={10} />
                  <span>Reset to default</span>
                </button>
              </div>
            )}
          </div>

          <span className="mx-0.5 h-3.5 w-px bg-stone-300/70" />

          {/* Heading Levels (Intelligently changes selected text size only if partial text selected!) */}
          <Tooltip text="Paragraph" shortcut="Normal" position="top">
            <button
              type="button"
              onClick={handleParagraphClick}
              className={`rounded-md px-1.5 py-1 font-mono text-xs transition ${
                editor.isActive("paragraph") && !activeFontSize ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
              }`}
            >
              T
            </button>
          </Tooltip>

          <Tooltip text="Heading 1" shortcut="H1 (32px)" position="top">
            <button
              type="button"
              onClick={() => handleHeadingClick(1)}
              className={`rounded-md px-1.5 py-1 font-mono text-xs transition ${
                editor.isActive("heading", { level: 1 }) || activeFontSize === "32px" ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
              }`}
            >
              H1
            </button>
          </Tooltip>

          <Tooltip text="Heading 2" shortcut="H2 (24px)" position="top">
            <button
              type="button"
              onClick={() => handleHeadingClick(2)}
              className={`rounded-md px-1.5 py-1 font-mono text-xs transition ${
                editor.isActive("heading", { level: 2 }) || activeFontSize === "24px" ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
              }`}
            >
              H2
            </button>
          </Tooltip>

          <Tooltip text="Heading 3" shortcut="H3 (20px)" position="top">
            <button
              type="button"
              onClick={() => handleHeadingClick(3)}
              className={`rounded-md px-1.5 py-1 font-mono text-xs transition ${
                editor.isActive("heading", { level: 3 }) || activeFontSize === "20px" ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"
              }`}
            >
              H3
            </button>
          </Tooltip>

          <span className="mx-0.5 h-3.5 w-px bg-stone-300/70" />

          {/* Bubble Text Color Picker */}
          <div className="relative editor-popover-container">
            <Tooltip text="Text color" position="top">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowBubbleTextColor(!showBubbleTextColor);
                  setShowBubbleHighlight(false);
                  setShowBubbleFontSize(false);
                  setShowBubbleFontFamily(false);
                }}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 font-medium transition ${
                  showBubbleTextColor ? "bg-stone-200/80 text-stone-900 font-semibold" : "text-stone-700 hover:bg-stone-200/60 hover:text-stone-900"
                }`}
              >
                <div className="flex flex-col items-center">
                  <Baseline size={13} />
                  <span className="h-0.5 w-3 rounded-full mt-0.5 shadow-2xs" style={{ backgroundColor: activeTextColor }} />
                </div>
              </button>
            </Tooltip>

            {/* Bubble Text Color Popover */}
            {showBubbleTextColor && (
              <div className="absolute top-full left-0 mt-2 z-50 flex w-52 flex-wrap gap-1.5 rounded-xl border border-stone-200/90 bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl">
                <div className="w-full text-[10px] font-semibold text-stone-500 pb-1 border-b border-stone-200/70">
                  Text Font Color
                </div>
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => {
                      editor.chain().focus().setColor(c.color).run();
                      setShowBubbleTextColor(false);
                    }}
                    className="size-5 rounded-full border transition hover:scale-110 active:scale-95 shadow-2xs"
                    style={{ backgroundColor: c.color, borderColor: c.border }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetColor().run();
                    setShowBubbleTextColor(false);
                  }}
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-100/90 py-1 text-[11px] text-stone-700 hover:text-stone-900 hover:bg-stone-200/80 transition"
                >
                  <RotateCcw size={10} />
                  <span>Reset color</span>
                </button>
              </div>
            )}
          </div>

          {/* Bubble Highlighter Color Picker */}
          <div className="relative editor-popover-container">
            <Tooltip text="Highlight color" position="top">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowBubbleHighlight(!showBubbleHighlight);
                  setShowBubbleTextColor(false);
                  setShowBubbleFontSize(false);
                  setShowBubbleFontFamily(false);
                }}
                className={`flex items-center gap-1 rounded-md px-1.5 py-1 font-medium transition ${
                  editor.isActive("highlight") || showBubbleHighlight
                    ? "bg-accent/20 text-accent font-semibold"
                    : "text-stone-700 hover:bg-stone-200/60 hover:text-stone-900"
                }`}
              >
                <Highlighter size={13} />
                <span className="size-2 rounded-full border border-black/10 shadow-2xs" style={{ backgroundColor: activeHighlightColor }} />
              </button>
            </Tooltip>

            {/* Bubble Highlighter Swatches Popover */}
            {showBubbleHighlight && (
              <div className="absolute top-full left-0 mt-2 z-50 flex w-52 flex-wrap gap-1.5 rounded-xl border border-stone-200/90 bg-white/95 p-2.5 shadow-2xl backdrop-blur-xl">
                <div className="w-full text-[10px] font-semibold text-stone-500 pb-1 border-b border-stone-200/70">
                  Pastel Highlight
                </div>
                {PASTEL_HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color: c.color }).run();
                      setShowBubbleHighlight(false);
                    }}
                    className="size-5 rounded-full border transition hover:scale-110 active:scale-95 shadow-2xs"
                    style={{ backgroundColor: c.color, borderColor: c.border }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => {
                    editor.chain().focus().unsetHighlight().run();
                    setShowBubbleHighlight(false);
                  }}
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded-lg border border-stone-200 bg-stone-100/90 py-1 text-[11px] text-stone-700 hover:text-stone-900 hover:bg-stone-200/80 transition"
                >
                  <X size={10} />
                  <span>Remove highlight</span>
                </button>
              </div>
            )}
          </div>

          <span className="mx-0.5 h-3.5 w-px bg-stone-300/70" />

          {/* Formatting */}
          <Tooltip text="Bold" shortcut="Ctrl+B" position="top">
            <button
              type="button"
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().toggleBold().run();
              }}
              className={`rounded-md px-1.5 py-1 font-bold text-xs transition ${editor.isActive("bold") ? "bg-stone-200/90 text-stone-900" : "text-stone-700 hover:bg-stone-200/60"}`}
            >
              B
            </button>
          </Tooltip>

          <Tooltip text="Italic" shortcut="Ctrl+I" position="top">
            <button
              type="button"
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().toggleItalic().run();
              }}
              className={`rounded-md px-1.5 py-1 italic text-xs transition ${editor.isActive("italic") ? "bg-stone-200/90 text-stone-900" : "text-stone-700 hover:bg-stone-200/60"}`}
            >
              I
            </button>
          </Tooltip>

          <Tooltip text="Underline" shortcut="Ctrl+U" position="top">
            <button
              type="button"
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().toggleUnderline().run();
              }}
              className={`rounded-md px-1.5 py-1 underline text-xs transition ${editor.isActive("underline") ? "bg-stone-200/90 text-stone-900" : "text-stone-700 hover:bg-stone-200/60"}`}
            >
              U
            </button>
          </Tooltip>

          <Tooltip text="Strikethrough" shortcut="Alt+Shift+5" position="top">
            <button
              type="button"
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().toggleStrike().run();
              }}
              className={`rounded-md px-1.5 py-1 line-through text-xs transition ${editor.isActive("strike") ? "bg-stone-200/90 text-stone-900" : "text-stone-700 hover:bg-stone-200/60"}`}
            >
              S
            </button>
          </Tooltip>

          <span className="mx-0.5 h-3.5 w-px bg-stone-300/70" />

          {/* Inline Code */}
          <Tooltip text="Inline code" shortcut="<>" position="top">
            <button
              type="button"
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().toggleCode().run();
              }}
              className={`rounded-md px-1.5 py-1 font-mono text-xs transition ${editor.isActive("code") ? "bg-stone-200/90 text-stone-900 font-bold" : "text-stone-700 hover:bg-stone-200/60"}`}
            >
              &lt;/&gt;
            </button>
          </Tooltip>
        </div>
      </BubbleMenu>

      {/* ======================================================== */}
      {/* MAIN TOP FORMATTING TOOLBAR                               */}
      {/* ======================================================== */}
      <div 
        role="toolbar" 
        aria-label="Text formatting" 
        className="note-toolbar relative z-20 flex flex-nowrap md:flex-wrap items-center gap-1 rounded-xl border border-border/80 bg-white p-1.5 shadow-2xs max-w-full select-none [&>*]:shrink-0"
      >
        {/* 1. Undo / Redo Group */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip text="Undo" shortcut="Ctrl+Z">
            <button
              type="button"
              disabled={!canUndo}
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().undo().run();
              }}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-cream/60 hover:text-foreground transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <Undo2 size={15} />
              <span className="hidden sm:inline">Undo</span>
            </button>
          </Tooltip>

          <Tooltip text="Redo" shortcut="Ctrl+Y">
            <button
              type="button"
              disabled={!canRedo}
              onClick={() => {
                closeAllPopovers();
                editor.chain().focus().redo().run();
              }}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-cream/60 hover:text-foreground transition disabled:opacity-30 disabled:pointer-events-none"
            >
              <Redo2 size={15} />
              <span className="hidden sm:inline">Redo</span>
            </button>
          </Tooltip>
        </div>

        <span className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 bg-border/80" />

        {/* 2. Common Text Formats: Bold, Italic, Underline (Visible across mobile & desktop) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {button("Bold", editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), <Bold size={15} />, "Ctrl+B")}
          {button("Italic", editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), <Italic size={15} />, "Ctrl+I")}
          {button("Underline", editor.isActive("underline"), () => editor.chain().focus().toggleUnderline().run(), <UnderlineIcon size={15} />, "Ctrl+U")}
        </div>

        <span className="mx-0.5 sm:mx-1 h-4 w-px shrink-0 bg-border/80" />

        {/* 3. Colors: Text Font Color & Highlight */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Text Font Color Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Text font color" shortcut="Color">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowTextColorPicker(!showTextColorPicker);
                  setShowHighlightPicker(false);
                  setShowMobileMore(false);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
                  showTextColorPicker
                    ? "bg-cream text-accent font-semibold shadow-xs"
                    : "text-muted hover:bg-cream/60 hover:text-foreground"
                }`}
              >
                <div className="flex flex-col items-center">
                  <Baseline size={14} />
                  <span 
                    className="h-1 w-3.5 rounded-full mt-0.5 border border-black/10" 
                    style={{ backgroundColor: activeTextColor }} 
                  />
                </div>
              </button>
            </Tooltip>

            {/* Text Color Popover Grid */}
            <AnimatePresence>
              {showTextColorPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="fixed inset-x-4 top-28 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full mt-2 z-[70] sm:w-56 max-w-[calc(100vw-2rem)] flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-xl"
                >
                  <div className="w-full text-[11px] font-semibold text-muted pb-1 border-b border-border/60">
                    Text Font Color
                  </div>
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onClick={() => {
                        editor.chain().focus().setColor(c.color).run();
                        setShowTextColorPicker(false);
                      }}
                      className="size-6 rounded-full border transition hover:scale-110 active:scale-95"
                      style={{ backgroundColor: c.color, borderColor: c.border }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().unsetColor().run();
                      setShowTextColorPicker(false);
                    }}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1.5 text-xs text-muted hover:text-foreground hover:bg-cream/60"
                  >
                    <RotateCcw size={12} />
                    <span>Reset to default color</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Highlighter Color Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Highlight background" shortcut="Highlighter">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowHighlightPicker(!showHighlightPicker);
                  setShowTextColorPicker(false);
                  setShowMobileMore(false);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
                  editor.isActive("highlight") || showHighlightPicker
                    ? "bg-cream text-accent font-semibold shadow-xs"
                    : "text-muted hover:bg-cream/60 hover:text-foreground"
                }`}
              >
                <Highlighter size={15} />
                <span 
                  className="size-2.5 rounded-full border border-black/10 shadow-2xs" 
                  style={{ backgroundColor: activeHighlightColor }} 
                />
              </button>
            </Tooltip>

            {/* Highlight Swatches Popover Grid */}
            <AnimatePresence>
              {showHighlightPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="fixed inset-x-4 top-28 sm:absolute sm:inset-x-auto sm:left-0 sm:top-full mt-2 z-[70] sm:w-56 max-w-[calc(100vw-2rem)] flex flex-wrap gap-2 rounded-xl border border-border bg-card p-3 shadow-xl"
                >
                  <div className="w-full text-[11px] font-semibold text-muted pb-1 border-b border-border/60">
                    Highlight Color
                  </div>
                  {PASTEL_HIGHLIGHT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      title={c.name}
                      onClick={() => {
                        editor.chain().focus().toggleHighlight({ color: c.color }).run();
                        setShowHighlightPicker(false);
                      }}
                      className="size-6 rounded-full border transition hover:scale-110 active:scale-95"
                      style={{ backgroundColor: c.color, borderColor: c.border }}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().unsetHighlight().run();
                      setShowHighlightPicker(false);
                    }}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1.5 text-xs text-muted hover:text-foreground hover:bg-cream/60"
                  >
                    <X size={12} />
                    <span>Remove highlight</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 4. MOBILE MORE OPTIONS BUTTON ("⋮") */}
        <div className="relative editor-popover-container md:hidden ml-auto shrink-0">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setShowMobileMore(!showMobileMore);
              setShowHighlightPicker(false);
              setShowTextColorPicker(false);
            }}
            className={`grid size-8 place-items-center rounded-md text-xs font-medium transition cursor-pointer ${
              showMobileMore
                ? "bg-cream text-accent font-semibold shadow-xs"
                : "text-muted hover:bg-cream/60 hover:text-foreground"
            }`}
            title="Formatting options"
            aria-label="Formatting options"
          >
            <MoreVertical size={18} />
          </button>

          {/* Clean Compact Vertical Dropdown List */}
          <AnimatePresence>
            {showMobileMore && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.95 }}
                className="fixed right-3 top-28 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full mt-2 z-[70] w-52 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-border bg-white p-2 shadow-2xl max-h-[70vh] overflow-y-auto space-y-0.5"
              >
                {/* Section: Headings */}
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                  Headings
                </div>
                <button
                  type="button"
                  onClick={() => { handleParagraphClick(); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("paragraph") && !activeFontSize
                      ? "bg-cream text-accent font-semibold"
                      : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Type size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Normal text</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleHeadingClick(1); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("heading", { level: 1 })
                      ? "bg-cream text-accent font-semibold"
                      : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Heading1 size={15} className="shrink-0 text-accent" />
                  <span className="text-xs">Heading 1 (32px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleHeadingClick(2); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("heading", { level: 2 })
                      ? "bg-cream text-accent font-semibold"
                      : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Heading2 size={15} className="shrink-0 text-accent" />
                  <span className="text-xs">Heading 2 (24px)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { handleHeadingClick(3); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("heading", { level: 3 })
                      ? "bg-cream text-accent font-semibold"
                      : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Heading3 size={15} className="shrink-0 text-accent" />
                  <span className="text-xs">Heading 3 (20px)</span>
                </button>

                <div className="my-1.5 border-t border-border/70" />

                {/* Section: Extra Styling */}
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                  Formatting
                </div>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleStrike().run(); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("strike") ? "bg-cream text-accent font-semibold" : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Strikethrough size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Strikethrough</span>
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleCode().run(); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("code") ? "bg-cream text-accent font-semibold" : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <Code size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Inline code</span>
                </button>

                <div className="my-1.5 border-t border-border/70" />

                {/* Section: Lists & Media */}
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                  Lists & Media
                </div>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleBulletList().run(); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("bulletList") ? "bg-cream text-accent font-semibold" : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <List size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Bulleted list</span>
                </button>
                <button
                  type="button"
                  onClick={() => { editor.chain().focus().toggleOrderedList().run(); setShowMobileMore(false); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                    editor.isActive("orderedList") ? "bg-cream text-accent font-semibold" : "text-foreground hover:bg-cream/60"
                  }`}
                >
                  <ListOrdered size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Numbered list</span>
                </button>
                <button
                  type="button"
                  onClick={() => { inputRef.current?.click(); setShowMobileMore(false); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-foreground hover:bg-cream/60 transition cursor-pointer"
                >
                  <ImagePlus size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Upload image</span>
                </button>

                <div className="my-1.5 border-t border-border/70" />

                {/* Section: Clipboard Actions */}
                <div className="px-2 pt-1 pb-1 text-[10px] font-bold text-muted uppercase tracking-wider">
                  Clipboard
                </div>
                <button
                  type="button"
                  onClick={() => { void handleCut(); setShowMobileMore(false); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-foreground hover:bg-cream/60 transition cursor-pointer"
                >
                  <Scissors size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Cut selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => { void handleCopy(); setShowMobileMore(false); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-foreground hover:bg-cream/60 transition cursor-pointer"
                >
                  <Copy size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Copy selection</span>
                </button>
                <button
                  type="button"
                  onClick={() => { void handlePaste(); setShowMobileMore(false); }}
                  className="flex items-center gap-2.5 w-full px-2.5 py-2 rounded-xl text-left text-foreground hover:bg-cream/60 transition cursor-pointer"
                >
                  <ClipboardPaste size={15} className="shrink-0 text-muted" />
                  <span className="text-xs">Paste from clipboard</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ======================================================== */}
        {/* 6. DESKTOP-ONLY FORMATTING OPTIONS (Hidden on mobile)    */}
        {/* ======================================================== */}
        <div className="hidden md:flex items-center gap-1 flex-wrap">
          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Font Style / Typeface Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Font style / typeface" shortcut="Font">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowFontFamilyPicker(!showFontFamilyPicker);
                  setShowFontSizePicker(false);
                  setShowTextColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
                  showFontFamilyPicker
                    ? "bg-cream text-accent font-semibold shadow-xs"
                    : "text-muted hover:bg-cream/60 hover:text-foreground"
                }`}
              >
                <span className="font-serif italic text-xs text-muted">f</span>
                <span>{currentFamilyLabel}</span>
                <ChevronDown size={12} className="text-muted" />
              </button>
            </Tooltip>

            <AnimatePresence>
              {showFontFamilyPicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-full mt-2 z-50 flex w-52 flex-col gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-xl"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted border-b border-border/60 mb-1">
                    Font Style / Typeface
                  </div>
                  {FONT_FAMILIES.map((fam) => {
                    const isCurrent = activeFontFamily === fam.value;
                    return (
                      <button
                        key={fam.label}
                        type="button"
                        onClick={() => {
                          editor.chain().focus().setFontFamily(fam.value).run();
                          setShowFontFamilyPicker(false);
                        }}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                          isCurrent
                            ? "bg-cream text-accent font-semibold"
                            : "text-muted hover:bg-cream/60 hover:text-foreground"
                        }`}
                      >
                        <span style={{ fontFamily: fam.value }}>{fam.label}</span>
                        {isCurrent && <Check size={12} className="text-accent" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().unsetFontFamily().run();
                      setShowFontFamilyPicker(false);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1 text-xs text-muted hover:text-foreground hover:bg-cream/60 transition"
                  >
                    <RotateCcw size={11} />
                    <span>Reset font style</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Font Size Dropdown */}
          <div className="relative editor-popover-container">
            <Tooltip text="Font size" shortcut="Size">
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setShowFontSizePicker(!showFontSizePicker);
                  setShowFontFamilyPicker(false);
                  setShowTextColorPicker(false);
                  setShowHighlightPicker(false);
                }}
                className={`flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium transition ${
                  showFontSizePicker
                    ? "bg-cream text-accent font-semibold shadow-xs"
                    : "text-muted hover:bg-cream/60 hover:text-foreground"
                }`}
              >
                <span>{currentSizeLabel}</span>
                <ChevronDown size={12} className="text-muted" />
              </button>
            </Tooltip>

            <AnimatePresence>
              {showFontSizePicker && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  className="absolute left-0 top-full mt-2 z-50 flex w-44 flex-col gap-0.5 rounded-xl border border-border bg-card p-1.5 shadow-xl"
                >
                  <div className="px-2 py-1 text-[10px] font-semibold text-muted border-b border-border/60 mb-1">
                    Font Size
                  </div>
                  {FONT_SIZES.map((sz) => {
                    const isCurrent = activeFontSize === sz.value;
                    return (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => {
                          editor.chain().focus().setFontSize(sz.value).run();
                          setShowFontSizePicker(false);
                        }}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                          isCurrent
                            ? "bg-cream text-accent font-semibold"
                            : "text-muted hover:bg-cream/60 hover:text-foreground"
                        }`}
                      >
                        <span>{sz.name}</span>
                        <span className="text-[10px] text-muted font-mono">{sz.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      editor.chain().focus().unsetFontSize().run();
                      setShowFontSizePicker(false);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background py-1 text-xs text-muted hover:text-foreground hover:bg-cream/60 transition"
                  >
                    <RotateCcw size={11} />
                    <span>Reset to default</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Headings */}
          {button("Normal text", editor.isActive("paragraph") && !activeFontSize, handleParagraphClick, <Type size={15} />, "Paragraph")}
          {button("Heading 1", editor.isActive("heading", { level: 1 }) || activeFontSize === "32px", () => handleHeadingClick(1), <Heading1 size={15} />, "H1 (32px)")}
          {button("Heading 2", editor.isActive("heading", { level: 2 }) || activeFontSize === "24px", () => handleHeadingClick(2), <Heading2 size={15} />, "H2 (24px)")}
          {button("Heading 3", editor.isActive("heading", { level: 3 }) || activeFontSize === "20px", () => handleHeadingClick(3), <Heading3 size={15} />, "H3 (20px)")}

          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Strikethrough (Bold, Italic, Underline are already in primary group) */}
          {button("Strikethrough", editor.isActive("strike"), () => editor.chain().focus().toggleStrike().run(), <Strikethrough size={15} />, "Alt+Shift+5")}

          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Lists & Code */}
          {button("Bulleted list", editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), <List size={15} />, "Ctrl+Shift+8")}
          {button("Numbered list", editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered size={15} />, "Ctrl+Shift+7")}
          {button("Inline code", editor.isActive("code"), () => editor.chain().focus().toggleCode().run(), <Code size={15} />, "<>")}

          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Image Upload */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadImage(file);
              event.target.value = "";
            }}
          />
          {button("Upload image", false, () => inputRef.current?.click(), <ImagePlus size={15} />, "Max 5MB")}

          <span className="mx-1 h-4 w-px shrink-0 bg-border/80" />

          {/* Toolbar Cut / Copy / Paste Actions */}
          <Tooltip text="Cut selected" shortcut="Ctrl+X">
            <button
              type="button"
              onClick={() => void handleCut()}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-cream/60 hover:text-foreground transition"
            >
              <Scissors size={14} />
            </button>
          </Tooltip>

          <Tooltip text="Copy selected" shortcut="Ctrl+C">
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-cream/60 hover:text-foreground transition"
            >
              {hasCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
          </Tooltip>

          <Tooltip text="Paste from clipboard" shortcut="Ctrl+V">
            <button
              type="button"
              onClick={() => void handlePaste()}
              className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted hover:bg-cream/60 hover:text-foreground transition"
            >
              <ClipboardPaste size={14} />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Editor Content Area */}
      <div 
        onClick={() => closeAllPopovers()} 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleContainerDrop}
        className={`relative mt-2 flex min-h-0 flex-1 flex-col overflow-auto rounded-xl border bg-white p-4 sm:p-6 shadow-2xs transition-colors focus-within:border-accent/40 ${
          isDragOver ? "border-accent ring-2 ring-accent/30 bg-accent/[0.02]" : "border-border/80"
        }`}
      >
        <EditorContent editor={editor} className="min-h-full" />

        {/* Drag & Drop Visual Dropzone Overlay */}
        <AnimatePresence>
          {isDragOver && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="pointer-events-none absolute inset-0 z-40 flex flex-col items-center justify-center rounded-xl bg-accent/10 backdrop-blur-[2px] border-2 border-dashed border-accent"
            >
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/95 px-6 py-4 shadow-lg border border-accent/20">
                <UploadCloud size={34} className="text-accent animate-bounce" />
                <span className="text-sm font-semibold text-foreground">Drop image here to add to note</span>
                <span className="text-xs text-muted">Supports PNG, JPG, GIF, WebP, SVG (up to 5MB)</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Uploading Progress Floating Card */}
        <AnimatePresence>
          {uploadState && (
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 right-4 z-40 max-w-sm w-full rounded-2xl border border-border/80 bg-white/95 backdrop-blur-md p-3.5 shadow-xl"
            >
              <div className="flex items-center gap-3">
                {uploadState.previewUrl && (
                  <img
                    src={uploadState.previewUrl}
                    alt="Uploading preview"
                    className="size-12 rounded-lg object-cover border border-border/80 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="truncate font-medium text-foreground pr-2">
                      {uploadState.fileName}
                    </span>
                    <span className="shrink-0 font-mono font-semibold text-accent">
                      {uploadState.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-cream">
                    <div
                      className="h-full bg-accent transition-all duration-150 ease-out rounded-full"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                    <Loader2 size={11} className="animate-spin text-accent" />
                    <span>
                      {uploadState.progress < 100
                        ? `Uploading image (${uploadState.progress}%)...`
                        : "Processing & inserting into note..."}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Character Count & Section Limits Footer */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-accent" />
          <span>Note character limit: 20,000 characters</span>
        </span>
        <span className={`font-mono font-medium ${charCount >= MAX_NOTE_CHARS ? "text-red-600 font-bold" : charCount >= 18000 ? "text-amber-600" : "text-muted"}`}>
          {charCount.toLocaleString()} / {MAX_NOTE_CHARS.toLocaleString()} chars
        </span>
      </div>
    </div>
  );
}
