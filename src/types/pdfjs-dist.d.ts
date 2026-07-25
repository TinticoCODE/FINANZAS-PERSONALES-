declare module "pdfjs-dist/legacy/build/pdf.mjs" {
  export function getDocument(src: {
    data: Uint8Array;
    password?: string;
    useSystemFonts?: boolean;
    disableFontFace?: boolean;
  }): {
    promise: Promise<{
      numPages: number;
      getPage(pageNumber: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str?: string }>;
        }>;
      }>;
      getMetadata(): Promise<unknown>;
    }>;
  };
}
