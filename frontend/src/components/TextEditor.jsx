import React, { useEffect, useRef } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import QuillCursors from "quill-cursors";
import { useSocket } from "../context/SocketContext";

Quill.register("modules/cursors", QuillCursors);

const TextEditor = ({ docId, role = "Editor", initialDelta = null, onSaveComplete }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const saveTimeout = useRef(null);
  const socket = useSocket();
  const cursorsModuleRef = useRef(null);

  // Init Quill once
  useEffect(() => {
    if (!editorRef.current || quillRef.current) return;

    quillRef.current = new Quill(editorRef.current, {
      theme: "snow",
      readOnly: role === "Viewer",
      modules: {
        toolbar:
          role === "Viewer"
            ? false
            : [
                ["bold", "italic", "underline"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["clean"]
              ],
        cursors: true,
        clipboard: { matchVisual: false },
      },
    });

    cursorsModuleRef.current = quillRef.current.getModule("cursors");

    // Paste plain text only
    quillRef.current.root.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      const sel = quillRef.current.getSelection(true);
      quillRef.current.insertText(sel.index, text);
      quillRef.current.setSelection(sel.index + text.length, 0);
    });

    // Emit deltas and auto-save
    quillRef.current.on("text-change", (delta, oldDelta, source) => {
      if (source !== "user" || !socket) return;
      socket.emit("doc-delta", { documentId: docId, delta });

      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        const contentDelta = quillRef.current.getContents();
        socket.emit("save-doc", { documentId: docId, contentDelta });
        if (onSaveComplete) onSaveComplete(contentDelta);
      }, 1500);
    });

    // Cursor updates
    quillRef.current.on("selection-change", (range, oldRange, source) => {
      if (source !== "user" || !socket) return;
      socket.emit("cursor-update", { documentId: docId, range });
    });

  }, [docId, role, socket, onSaveComplete]);

  // Socket events
  useEffect(() => {
    if (!socket || !quillRef.current) return;

    socket.emit("join-doc", { documentId: docId });

    socket.on("document-state", ({ contentDelta }) => {
      if (contentDelta) quillRef.current.setContents(contentDelta);
    });

    socket.on("doc-delta", ({ delta }) => {
      if (delta) quillRef.current.updateContents(delta, "api");
    });

    socket.on("cursor-update", ({ userId, range }) => {
      if (!cursorsModuleRef.current) return;
      cursorsModuleRef.current.createCursor(userId, `User ${userId}`, 'blue');
      if (range) cursorsModuleRef.current.moveCursor(userId, range);
    });

    return () => {
      socket.off("document-state");
      socket.off("doc-delta");
      socket.off("cursor-update");
      clearTimeout(saveTimeout.current);
    };
  }, [socket, docId]);

  // Initial delta fallback
  useEffect(() => {
    if (initialDelta && quillRef.current) {
      quillRef.current.setContents(initialDelta);
    }
  }, [initialDelta]);

  return <div ref={editorRef} className="min-h-[300px] h-full bg-white" />;
};

export default TextEditor;