import { type configure, CopyOnWrite, Fetch, InMemory } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { fs9pToZenFsIndex } from "contexts/fileSystem/core";

type FileSystemConfigType = Parameters<typeof configure>[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FileSystemConfig = (writeToMemory = false): FileSystemConfigType => ({
  mounts: {
    "/": {
      backend: CopyOnWrite,
      readable: {
        backend: Fetch,
        baseUrl: typeof window !== "undefined" ? window.location.origin : "/",
        index: fs9pToZenFsIndex(),
      },
      writable: writeToMemory ? { backend: InMemory } : { backend: IndexedDB },
    } as any,
  },
});

export default FileSystemConfig;
