import { useRef, useCallback } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

interface MonacoMarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export function MonacoMarkdownEditor({
  value,
  onChange,
  onSave,
}: MonacoMarkdownEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);

  const handleMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      monaco.editor.defineTheme("cadence-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#0a0a0a",
          "editor.foreground": "#e5e5e5",
          "editorLineNumber.foreground": "#525252",
          "editorLineNumber.activeForeground": "#a3a3a3",
          "editor.selectionBackground": "#262626",
          "editor.lineHighlightBackground": "#171717",
          "editorCursor.foreground": "#e5e5e5",
          "editorWidget.background": "#171717",
          "editorWidget.border": "#262626",
          "input.background": "#171717",
          "input.border": "#262626",
          "focusBorder": "#525252",
        },
      });
      monaco.editor.setTheme("cadence-dark");

      // Ctrl+S / Cmd+S to format with Prettier then save
      editor.addCommand(
        monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS,
        async () => {
          const currentValue = editor.getValue();
          try {
            const [prettier, markdownPlugin] = await Promise.all([
              import("prettier/standalone"),
              import("prettier/plugins/markdown"),
            ]);
            const formatted = await prettier.format(currentValue, {
              parser: "markdown",
              plugins: [markdownPlugin.default],
              proseWrap: "preserve",
              tabWidth: 2,
            });
            // Only update if formatting actually changed something
            if (formatted !== currentValue) {
              editor.setValue(formatted);
              onChange(formatted);
            }
          } catch {
            // If Prettier fails, just save as-is
          }
          onSave?.();
        }
      );
    },
    [onChange, onSave]
  );

  return (
    <div className="overflow-hidden rounded-md border border-input">
      <Editor
        height="500px"
        defaultLanguage="markdown"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        options={{
          minimap: { enabled: false },
          wordWrap: "on",
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          fontSize: 14,
          fontFamily: "ui-monospace, monospace",
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "line",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          contextmenu: false,
        }}
      />
    </div>
  );
}
