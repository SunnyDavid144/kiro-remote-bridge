"use client";

import { useCallback, useRef, useState } from "react";
import { tapLight, soundSend } from "../lib/haptics";

interface ChatInputProps {
  onSend: (text: string, imageFile?: File) => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled: boolean;
}

export function ChatInput({ onSend, onCancel, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if ((!trimmed && !attachedImage) || disabled) return;
    tapLight();
    soundSend();
    onSend(trimmed, attachedImage || undefined);
    setValue("");
    setAttachedImage(null);
    setImagePreview(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [value, disabled, onSend, attachedImage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 120) + "px";
    }
  }, []);

  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedImage(file);
    // Create preview
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    tapLight();
  }, []);

  const removeImage = useCallback(() => {
    setAttachedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  return (
    <div className="border-t border-[var(--border-dim)] bg-[var(--bg-secondary)]/95 backdrop-blur-md px-3 py-3 pb-[env(safe-area-inset-bottom,12px)]">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-2 relative inline-block animate-scale-in">
          <img
            src={imagePreview}
            alt="Attached"
            className="h-16 w-auto rounded-lg border border-[var(--border-dim)] object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[var(--error)] text-white flex items-center justify-center text-[10px] shadow-sm"
          >
            ×
          </button>
        </div>
      )}

      <div
        className={`flex items-end gap-2 rounded-2xl border transition-all duration-200 px-1 py-1 ${
          isFocused
            ? "border-[var(--accent)]/50 bg-[var(--bg-input)] shadow-md shadow-[var(--accent)]/5"
            : "border-[var(--border-dim)] bg-[var(--bg-input)]"
        }`}
      >
        {/* Image attach button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="press-feedback flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-30"
          aria-label="Attach image"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="5.5" cy="6.5" r="1.25" stroke="currentColor" strokeWidth="1" />
            <path d="M2 11L5.5 8L8 10L11 7L14 11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={disabled ? "Waiting for connection..." : "Message Kiro..."}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none disabled:opacity-40 leading-relaxed"
          style={{ maxHeight: "120px" }}
        />

        {/* Action button */}
        {isStreaming ? (
          <button
            onClick={onCancel}
            className="press-feedback flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--error)]/15 border border-[var(--error)]/30 flex items-center justify-center text-[var(--error)] transition-all hover:bg-[var(--error)]/25"
            aria-label="Cancel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="3" y="3" width="8" height="8" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={(!value.trim() && !attachedImage) || disabled}
            className="press-feedback flex-shrink-0 w-9 h-9 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white transition-all shadow-md shadow-[var(--accent)]/20 disabled:opacity-20 disabled:shadow-none disabled:pointer-events-none hover:brightness-110"
            aria-label="Send"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2 12L12 7L2 2V5.5L8 7L2 8.5V12Z"
                fill="currentColor"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
