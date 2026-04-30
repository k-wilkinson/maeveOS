declare module "@zenfs/emscripten" {
  import type { FileSystem } from "@zenfs/core";

  export const Emscripten: {
    create(options: { FS: unknown }): Promise<FileSystem>;
    name: string;
    options: Record<string, unknown>;
  };
  export class EmscriptenFS {}
}
