import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, Check, Image as ImageIcon, Mic, Paperclip, X, FileText, Pencil } from "lucide-react";
import { cn } from "../../lib/cn";
import { attachmentKind, checkFile, MAX_ATTACHMENTS, prepareImage } from "../../lib/media";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { recordingSupported, useVoiceRecorder } from "../../hooks/useVoiceRecorder";
import { useChatActions } from "../../context/ChatContext";
import { Menu, MenuItem } from "../../components/ui/Menu";
import { IconButton } from "../../components/ui/IconButton";
import { useToast } from "../../components/ui/Toast";
import { AttachmentTray } from "./AttachmentTray";
import { RecordingBar } from "./RecordingBar";
import { ReplyQuote } from "./message/ReplyQuote";

export const MAX_LENGTH = 4000;
const SHOW_COUNTER_AT = 3500;
const MAX_HEIGHT = 160; // ~6 lines
const TYPING_IDLE_MS = 2500;

// Unsent text survives switching chats (kept for the lifetime of the tab).
const drafts = new Map();
let trayId = 0;

/** A banner above the input: who you're replying to, or the message being edited. */
function ContextBar({ icon: Icon, title, children, onClose }) {
  return (
    <div className="mx-auto mb-2 flex max-w-3xl animate-pop-in items-center gap-2" style={{ transformOrigin: "bottom left" }}>
      <div className="min-w-0 flex-1">
        {title && (
          <p className="mb-1 flex items-center gap-1.5 text-caption font-semibold text-ink-2">
            <Icon size={13} aria-hidden /> {title}
          </p>
        )}
        {children}
      </div>
      <IconButton label="Cancel" icon={X} size="sm" variant="soft" onClick={onClose} />
    </div>
  );
}

/**
 * Message input.
 *  – Enter sends, Shift+Enter adds a line (on touch keyboards Enter adds a line)
 *  – grows with content, then scrolls
 *  – photos/files via the paperclip, paste or drag-and-drop; voice notes via the mic
 *  – replies and edits show a banner and send through the same field
 * Mount with `key={chatId}` so each chat gets its own draft and typing state.
 * `ref.addFiles(fileList)` lets the parent feed it dropped files.
 */
export const Composer = forwardRef(function Composer({ chatId, replyTo, onCancelReply, editing, onDoneEditing, onEditLast, meId }, ref) {
  const { sendMessage, sendAttachment, editMessage, emitTyping } = useChatActions();
  const toast = useToast();
  const [text, setText] = useState(() => drafts.get(chatId) || "");
  const [tray, setTray] = useState([]);
  const field = useRef(null);
  const imageInput = useRef(null);
  const fileInput = useRef(null);
  const typing = useRef({ on: false, timer: null });
  const stash = useRef(null); // the draft, while an edit borrows the field
  const touch = useMediaQuery("(pointer: coarse)");

  const sendVoice = useCallback(
    (note) => note && sendAttachment(chatId, { kind: "voice", file: note.file, meta: { duration: note.duration, waveform: note.waveform }, replyTo }),
    [chatId, sendAttachment, replyTo]
  );
  const recorder = useVoiceRecorder({ onLimit: (note) => { sendVoice(note); onCancelReply?.(); toast.info("Voice message sent", "That was the 5 minute limit."); } });

  const preparing = tray.some((t) => t.preparing);
  const hasContent = text.trim().length > 0 || tray.length > 0;
  const canSend = hasContent && !preparing;
  const showMic = !hasContent && !editing && recordingSupported();

  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [text, recorder.status]);

  const stopTyping = useCallback(() => {
    const t = typing.current;
    clearTimeout(t.timer);
    if (t.on) {
      t.on = false;
      emitTyping(chatId, false);
    }
  }, [chatId, emitTyping]);
  useEffect(() => stopTyping, [stopTyping]);

  // Entering edit mode lends the field to the message; leaving it hands the draft back.
  const editingId = editing?._id;
  useEffect(() => {
    if (editingId) {
      stash.current = { text: drafts.get(chatId) || "" };
      setText(editing.content);
      requestAnimationFrame(() => {
        field.current?.focus();
        const n = field.current?.value.length ?? 0;
        field.current?.setSelectionRange(n, n);
      });
    } else if (stash.current) {
      setText(stash.current.text);
      stash.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  useEffect(() => {
    if (replyTo) field.current?.focus();
  }, [replyTo]);

  useEffect(() => () => tray.forEach((t) => URL.revokeObjectURL(t.previewUrl)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(
    (list) => {
      const files = [...list];
      if (!files.length || editing) return;
      const room = MAX_ATTACHMENTS - tray.length;
      if (files.length > room) toast.info(`Up to ${MAX_ATTACHMENTS} files at a time`, room > 0 ? `Added the first ${room}.` : undefined);
      files.slice(0, Math.max(0, room)).forEach((file) => {
        const kind = attachmentKind(file);
        const problem = checkFile(file, kind);
        if (problem) return toast.error("Can’t attach file", problem);
        const id = ++trayId;
        const item = { id, kind, file, previewUrl: kind === "image" ? URL.createObjectURL(file) : null, preparing: kind === "image" };
        setTray((t) => [...t, item]);
        if (kind === "image") {
          prepareImage(file).then(({ file: prepared, width, height }) =>
            setTray((t) => t.map((x) => (x.id === id ? { ...x, file: prepared, width, height, preparing: false } : x)))
          );
        }
      });
    },
    [tray.length, toast, editing]
  );
  useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

  const removeFromTray = (id) =>
    setTray((t) => {
      t.find((x) => x.id === id && x.previewUrl && URL.revokeObjectURL(x.previewUrl));
      return t.filter((x) => x.id !== id);
    });

  const onChange = (e) => {
    const value = e.target.value;
    setText(value);
    if (editing) return;
    if (value) drafts.set(chatId, value);
    else drafts.delete(chatId);

    const t = typing.current;
    if (!value.trim()) return stopTyping();
    if (!t.on) {
      t.on = true;
      emitTyping(chatId, true);
    }
    clearTimeout(t.timer);
    t.timer = setTimeout(stopTyping, TYPING_IDLE_MS);
  };

  const send = async () => {
    if (!canSend) return;
    if (editing) {
      const ok = await editMessage(chatId, editing._id, text);
      if (ok) onDoneEditing();
      return;
    }
    const caption = text.trim();
    if (tray.length) {
      // The caption and the reply ride on the first item; the rest follow as plain attachments.
      tray.forEach((item, i) => {
        sendAttachment(chatId, {
          kind: item.kind,
          file: item.file,
          content: i === 0 ? caption : "",
          meta: item.kind === "image" ? { width: item.width, height: item.height } : {},
          replyTo: i === 0 ? replyTo : undefined,
        });
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
      setTray([]);
    } else {
      sendMessage(chatId, text, { replyTo });
    }
    onCancelReply?.();
    setText("");
    drafts.delete(chatId);
    stopTyping();
    field.current?.focus();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape" && (editing || replyTo)) {
      e.preventDefault();
      return editing ? onDoneEditing() : onCancelReply();
    }
    if (e.key === "ArrowUp" && !text && !tray.length && !touch) {
      e.preventDefault();
      return onEditLast?.();
    }
    if (e.key !== "Enter" || e.shiftKey || touch || e.nativeEvent.isComposing) return;
    e.preventDefault();
    send();
  };

  const onPaste = (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (!files.length) return;
    e.preventDefault();
    addFiles(files.map((f) => (/^image\/(png|jpe?g)$/.test(f.type) && /^image\.\w+$/.test(f.name) ? new File([f], `Pasted image.${f.type.split("/")[1].replace("jpeg", "jpg")}`, { type: f.type }) : f)));
  };

  // Surface recorder problems in words people can act on.
  useEffect(() => {
    if (!recorder.error) return;
    const messages = {
      denied: ["Microphone is blocked", "Allow microphone access for this site in your browser settings, then try again."],
      unsupported: ["Voice messages aren’t supported here", "Try a recent version of Chrome, Safari or Firefox."],
      failed: ["Couldn’t start recording", "Check that a microphone is connected and not in use."],
    };
    toast.error(...messages[recorder.error]);
    recorder.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.error]);

  const finishRecording = async () => {
    sendVoice(await recorder.stop());
    onCancelReply?.();
  };

  const recording = recorder.status === "recording";

  return (
    <div className="glass border-t border-line px-3 pb-[calc(var(--safe-bottom)+10px)] pt-2.5 md:px-6">
      {replyTo && !editing && (
        <ContextBar icon={null} onClose={onCancelReply}>
          <ReplyQuote reply={{ ...replyTo, sender: replyTo.sender }} mine={false} meId={meId} />
        </ContextBar>
      )}
      {editing && (
        <ContextBar icon={Pencil} title="Editing message" onClose={onDoneEditing}>
          <p className="truncate rounded-[10px] bg-ink/5 px-3 py-1.5 text-footnote text-ink-2">{editing.content}</p>
        </ContextBar>
      )}

      <AttachmentTray items={tray} onRemove={removeFromTray} />

      {recording ? (
        <RecordingBar elapsed={recorder.elapsed} levels={recorder.levels} onCancel={recorder.cancel} onSend={finishRecording} />
      ) : (
        <div className="mx-auto flex max-w-3xl items-end gap-2">
          {!editing && (
            <Menu
              side="top"
              align="start"
              trigger={<IconButton label="Attach" icon={Paperclip} className="mb-0.5 !h-10 !w-10" />}
            >
              <MenuItem icon={ImageIcon} onSelect={() => imageInput.current?.click()}>Photo</MenuItem>
              <MenuItem icon={FileText} onSelect={() => fileInput.current?.click()}>File</MenuItem>
            </Menu>
          )}
          <input ref={imageInput} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={fileInput} type="file" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />

          <div className="flex min-w-0 flex-1 items-end rounded-[22px] bg-sunken ring-1 ring-inset ring-line transition-shadow duration-160 ease-out focus-within:ring-2 focus-within:ring-accent-ink">
            <textarea
              ref={field}
              rows={1}
              value={text}
              maxLength={MAX_LENGTH}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onBlur={stopTyping}
              aria-label="Message"
              placeholder={tray.length ? "Add a caption" : "Message"}
              enterKeyHint={touch ? "enter" : "send"}
              autoComplete="off"
              className="max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-4 py-[11px] text-body text-ink outline-none placeholder:text-ink-3"
            />
            {text.length >= SHOW_COUNTER_AT && (
              <span className={cn("pb-3 pr-3 text-caption tabular-nums", text.length >= MAX_LENGTH ? "text-danger" : "text-ink-3")}>
                {MAX_LENGTH - text.length}
              </span>
            )}
          </div>

          {showMic ? (
            <button
              type="button"
              onClick={recorder.start}
              disabled={recorder.status === "requesting"}
              aria-label="Record voice message"
              className="press relative mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink-2 hover:text-ink after:absolute after:-inset-1 after:content-['']"
            >
              <Mic size={20} aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              onClick={send}
              // Keep focus in the field so the touch keyboard doesn't collapse on every send.
              onPointerDown={(e) => e.preventDefault()}
              disabled={!canSend}
              aria-label={editing ? "Save edit" : "Send message"}
              className={cn(
                "press relative mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                "after:absolute after:-inset-1 after:content-['']",
                canSend ? "bg-accent text-accent-fg shadow-raised hover:bg-accent-hover" : "bg-ink/10 text-ink-3"
              )}
            >
              {editing ? <Check size={20} strokeWidth={2.5} aria-hidden /> : <ArrowUp size={20} strokeWidth={2.5} aria-hidden />}
            </button>
          )}
        </div>
      )}
    </div>
  );
});
