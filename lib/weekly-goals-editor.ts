export type EditorTheme = "light" | "dark";

type TinyMceEditor = {
  on: (eventName: string, callback: () => void) => void;
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
    padding: 10px 16px;
    margin: 0;
  }
  .mce-content-body {
    padding-left: 22px !important;
  }
  .mce-content-body:before {
    left: 22px !important;
  }
  @media (min-width: 640px) {
    body {
      padding: 10px 25px;
    }
  }
  * {
    background-color: transparent !important;
  }
`;

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
        }
      });
    },
  };
};
