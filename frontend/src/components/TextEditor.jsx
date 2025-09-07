import React, { useState, useEffect, useRef } from "react";

const TextEditor = ({ value, onChange, onCursorChange, readOnly = false }) => {
  const [content, setContent] = useState(value || "");
  const editorRef = useRef(null);

  useEffect(() => {
    setContent(value || "");
  }, [value]);

  // 🔹 Track typing
  const handleInput = (e) => {
    const newValue = e.target.innerHTML;
    setContent(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };

  // 🔹 Track cursor position
  useEffect(() => {
    const handleSelection = () => {
      if (!editorRef.current || !onCursorChange) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // calculate cursor index relative to editor content
        let position = range.startOffset;

        // If inside a node, add offsets from previous siblings
        let node = range.startContainer;
        while (node && node !== editorRef.current) {
          let prev = node.previousSibling;
          while (prev) {
            position += prev.textContent?.length || 0;
            prev = prev.previousSibling;
          }
          node = node.parentNode;
        }

        onCursorChange(position);
      }
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => {
      document.removeEventListener("selectionchange", handleSelection);
    };
  }, [onCursorChange]);

  const applyFormat = (format) => {
    document.execCommand(format, false, null);
    editorRef.current.focus();
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {!readOnly && (
        <div className="bg-gray-100 p-2 border-b">
          <button
            type="button"
            onClick={() => applyFormat("bold")}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => applyFormat("italic")}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => applyFormat("underline")}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => applyFormat("insertUnorderedList")}
            className="px-2 py-1 mr-1 bg-white border rounded"
          >
            • List
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        dangerouslySetInnerHTML={{ __html: content }}
        className="p-4 min-h-[300px] focus:outline-none"
      />
    </div>
  );
};

export default TextEditor;
