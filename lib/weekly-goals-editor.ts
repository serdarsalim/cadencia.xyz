export type EditorTheme = "light" | "dark";

type TinyMceEditor = {
  on: (eventName: string, callback: (event?: unknown) => void) => void;
  getContentAreaContainer: () => Element | null;
  getDoc: () => Document | null;
};

type WeeklyGoalsEditorInitOptions = {
  readonly?: boolean;
  placeholder?: string;
  height?: number;
  minHeight?: number;
};

const buildWeeklyGoalsContentStyle = (theme: EditorTheme): string => `
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap');
  html {
    background-color: ${theme === "dark" ? "#0a0a0a" : "#fdfcfb"} !important;
  }
  body {
    background-color: ${theme === "dark" ? "#0a0a0a" : "#fdfcfb"} !important;
    color: ${theme === "dark" ? "#d1d5db" : "#0f172a"} !important;
    font-family: "Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    font-size: 14px;
    line-height: 1.55;
    padding: 8px 8px;
    margin: 0;
  }
  .mce-content-body {
    padding-left: 10px !important;
  }
  .mce-content-body:before {
    left: 10px !important;
  }
  @media (min-width: 640px) {
    body {
      padding: 10px 25px;
    }
    .mce-content-body {
      padding-left: 22px !important;
    }
    .mce-content-body:before {
      left: 22px !important;
    }
  }
  * {
    background-color: transparent !important;
  }
  input.task-checkbox {
    width: 14px;
    height: 14px;
    margin-right: 8px;
    vertical-align: -1px;
    accent-color: ${theme === "dark" ? "#93c5fd" : "#1d4ed8"};
  }
`;

const checklistPrefixPattern = /^\s*(?:\[\s*\]|\[\s*x\s*\])\s+/i;

const parseChecklistPrefix = (
  value: string
): { checked: boolean; text: string } | null => {
  const match = value.match(/^\s*\[(\s*|x)\]\s+/i);
  if (!match) {
    return null;
  }
  const checked = match[1]?.toLowerCase() === "x";
  const text = value.replace(checklistPrefixPattern, "");
  return { checked, text };
};

const convertChecklistForBlock = (block: HTMLElement | null) => {
  if (!block) return false;
  if (block.querySelector("input.task-checkbox")) return false;
  const parsed = parseChecklistPrefix(block.textContent ?? "");
  if (!parsed) return false;

  const checkbox = block.ownerDocument.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "task-checkbox";
  checkbox.checked = parsed.checked;
  checkbox.setAttribute("aria-label", "Checklist item");

  const trailingText = block.ownerDocument.createTextNode(parsed.text);

  while (block.firstChild) {
    block.removeChild(block.firstChild);
  }
  block.appendChild(checkbox);
  block.appendChild(trailingText);
  return true;
};

const getSelectionBlock = (doc: Document): HTMLElement | null => {
  const selection = doc.getSelection();
  if (!selection || !selection.anchorNode) return null;

  const anchorElement =
    selection.anchorNode instanceof Element
      ? selection.anchorNode
      : selection.anchorNode.parentElement;
  if (!anchorElement) return null;

  return anchorElement.closest("p,li,div");
};

const convertChecklistAcrossDoc = (doc: Document) => {
  const blocks = Array.from(doc.querySelectorAll("p, li, div")) as HTMLElement[];
  blocks.forEach((block) => {
    convertChecklistForBlock(block);
  });
};

export const createWeeklyGoalsEditorInit = (
  theme: EditorTheme,
  options: WeeklyGoalsEditorInitOptions = {}
): Record<string, unknown> => {
  const {
    readonly = false,
    placeholder = "",
    height = 430,
    minHeight = 260,
  } = options;

  return {
    menubar: false,
    statusbar: false,
    height,
    license_key: "gpl",
    plugins: "lists quickbars link autoresize",
    readonly,
    skin: theme === "dark" ? "oxide-dark" : "oxide",
    content_css: false,
    toolbar: false,
    autoresize_bottom_margin: 8,
    min_height: minHeight,
    extended_valid_elements: "input[type|checked|class|aria-label]",
    quickbars_selection_toolbar: readonly
      ? false
      : "bold italic bullist numlist link",
    quickbars_insert_toolbar: false,
    content_style: buildWeeklyGoalsContentStyle(theme),
    inline_styles: true,
    branding: false,
    placeholder,
    setup: (editor: TinyMceEditor) => {
      editor.on("PreInit", () => {
        const iframe = editor.getContentAreaContainer()?.querySelector("iframe");
        if (iframe instanceof HTMLIFrameElement && iframe.contentDocument) {
          const doc = iframe.contentDocument;
          const style = doc.createElement("style");
          style.textContent = `
            html, body {
              background-color: ${theme === "dark" ? "#0a0a0a" : "#fdfcfb"} !important;
            }
          `;
          doc.head?.appendChild(style);
        }
      });

      editor.on("init", () => {
        const doc = editor.getDoc();
        if (doc && doc.documentElement) {
          doc.documentElement.style.backgroundColor =
            theme === "dark" ? "#0a0a0a" : "#fdfcfb";
          if (doc.body) {
            doc.body.style.backgroundColor =
            theme === "dark" ? "#0a0a0a" : "#fdfcfb";
          }

          if (!readonly) {
            doc.addEventListener("click", (event) => {
              const target = event.target;
              if (!(target instanceof HTMLInputElement)) return;
              if (!target.classList.contains("task-checkbox")) return;
              target.toggleAttribute("checked", target.checked);
            });
          }
        }
      });

      if (!readonly) {
        const tryConvertChecklist = () => {
          const doc = editor.getDoc();
          if (!doc) return;
          const block = getSelectionBlock(doc);
          if (convertChecklistForBlock(block)) {
            const selection = doc.getSelection();
            if (selection && block?.lastChild) {
              selection.collapse(block.lastChild, block.lastChild.textContent?.length ?? 0);
            }
          } else {
            convertChecklistAcrossDoc(doc);
          }
        };

        editor.on("keydown", (event) => {
          const key = event && typeof event === "object" && "key" in event
            ? String((event as { key?: unknown }).key ?? "")
            : "";
          if (key === " " || key === "Enter") {
            window.requestAnimationFrame(() => {
              tryConvertChecklist();
            });
          }
        });

        editor.on("input", () => {
          window.requestAnimationFrame(() => {
            tryConvertChecklist();
          });
        });

        editor.on("SetContent", () => {
          window.requestAnimationFrame(() => {
            const doc = editor.getDoc();
            if (!doc) return;
            convertChecklistAcrossDoc(doc);
          });
        });
      }
    },
  };
};
