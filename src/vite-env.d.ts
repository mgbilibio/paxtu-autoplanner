/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_AUTH_X?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.html?raw' {
  const content: string;
  export default content;
}

interface GoogleIdConfiguration {
  client_id: string;
  callback: (response: { credential?: string }) => void;
  ux_mode?: 'popup' | 'redirect';
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

interface GoogleButtonConfiguration {
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  locale?: string;
  width?: number;
}

interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: { access_token?: string; error?: string }) => void;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleIdConfiguration) => void;
        renderButton: (parent: HTMLElement, config: GoogleButtonConfiguration) => void;
      };
      oauth2: {
        initTokenClient: (config: GoogleTokenClientConfig) => {
          requestAccessToken: (override?: { prompt?: string }) => void;
        };
      };
    };
  };
  fileSystem?: {
    selectFolder: () => Promise<string | null>
    readData: (folderPath: string, fileName: string) => Promise<string | null>
    writeData: (folderPath: string, fileName: string, content: string) => Promise<boolean>
    checkExists: (folderPath: string, fileName: string) => Promise<boolean>
    listFiles: (folderPath: string) => Promise<string[]>
    deletePath: (folderPath: string, relativePath: string) => Promise<boolean>
    openPdfAtPage: (relativePath: string, page: number) => Promise<{ ok: boolean; url?: string; error?: string }>
    openGuide?: () => Promise<{ ok: boolean; url?: string; error?: string }>
    ollamaRequest: (method: string, url: string, body?: string, timeoutMs?: number, authBearer?: string) => Promise<{ ok: boolean; status: number; body: string; error?: string }>
    cancelOllamaRequests?: () => Promise<{ ok: boolean }>
    searchLibrary?: (query: string, limit?: number) => Promise<{
      ok: boolean
      results: Array<{
        id: number
        sourcePath: string
        blockIndex: number
        title: string
        snippet: string
        pdfPage?: number | null
        sourcePdf?: string | null
      }>
      error?: string
    }>
  }
  showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<{ name: string }>
}
