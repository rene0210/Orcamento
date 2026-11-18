declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  VITE_API_URL?: string;
}

interface ImportMeta {
  env: ImportMetaEnv;
}
