import { basename, dirname, isAbsolute, join } from "path";
import { useCallback, useEffect, useRef, useState } from "react";
import useTransferDialog from "components/system/Dialogs/Transfer/useTransferDialog";
import {
  type InputChangeEvent,
  getEventData,
  handleFileInputEvent,
  iterateFileName,
  removeInvalidFilenameCharacters,
} from "components/system/Files/FileManager/functions";
import { type NewPath } from "components/system/Files/FileManager/useFolder";
import {
  convertFs9pToZenFsIndex,
  getFileSystemHandles,
  hasIndexedDB,
  isMountedFolder,
  KEYVAL_DB,
  type FS9PV4,
} from "contexts/fileSystem/core";
import useAsyncFs, {
  type AsyncFS,
  type EmscriptenFS,
  type RootFileSystem,
} from "contexts/fileSystem/useAsyncFs";
import { useProcesses } from "contexts/process";
import { type UpdateFiles } from "contexts/session/types";
import {
  CLIPBOARD_FILE_EXTENSIONS,
  DESKTOP_PATH,
  PROCESS_DELIMITER,
  TRANSITIONS_IN_MILLISECONDS,
} from "utils/constants";
import { bufferToBlob, getExtension, getMimeType } from "utils/functions";

// Minimal ApiError type to replace removed browserfs type
interface ApiError {
  code?: string;
  path?: string;
}

export type FileSystemObserver = {
  disconnect: () => void;
  observe: (
    handle: FileSystemDirectoryHandle,
    options: { recursive: boolean }
  ) => Promise<void>;
};

type FileSystemChangeRecord = {
  relativePathComponents: string[];
  relativePathMovedFrom: string[] | null;
  type: "appeared" | "disappeared" | "moved";
};

declare global {
  interface Window {
    FileSystemObserver: new (
      callback: (records: FileSystemChangeRecord[]) => void
    ) => FileSystemObserver;
  }
}

type FilePasteOperations = Record<string, "copy" | "move">;

type FileSystemWatchers = Record<string, UpdateFiles[]>;

type FileSystemContextState = AsyncFS & {
  addFile: (
    directory: string,
    callback: NewPath,
    accept?: string,
    multiple?: boolean
  ) => Promise<string[]>;
  addFsWatcher: (folder: string, updateFiles: UpdateFiles) => void;
  copyEntries: (entries: string[]) => void;
  createPath: (
    name: string,
    directory: string,
    buffer?: Buffer,
    iteration?: number,
    overwrite?: boolean
  ) => Promise<string>;
  deletePath: (path: string) => Promise<boolean>;
  fs?: any;
  mapFs: (
    directory: string,
    existingHandle?: FileSystemDirectoryHandle
  ) => Promise<string>;
  mkdirRecursive: (path: string) => Promise<void>;
  mountEmscriptenFs: (FS: EmscriptenFS, fsName?: string) => Promise<string>;
  mountFs: (url: string) => Promise<void>;
  mountHttpRequestFs: (
    mountPoint: string,
    url: string,
    baseUrl?: string
  ) => Promise<void>;
  moveEntries: (entries: string[]) => void;
  pasteList: FilePasteOperations;
  removeFsWatcher: (folder: string, updateFiles: UpdateFiles) => void;
  rootFs?: RootFileSystem;
  setPasteList: React.Dispatch<React.SetStateAction<FilePasteOperations>>;
  unMapFs: (directory: string, hasNoHandle?: boolean) => Promise<void>;
  unMountFs: (url: string) => Promise<void>;
  updateFolder: (
    folder: string,
    newFile?: string,
    oldFile?: string
  ) => Promise<void>;
};

const SYSTEM_DIRECTORIES = new Set(["/OPFS"]);

const useFileSystemContextState = (): FileSystemContextState => {
  const asyncFs = useAsyncFs();
  const {
    exists,
    mkdir,
    readdir,
    readFile,
    rename,
    rmdir,
    rootFs,
    unlink,
    writeFile,
  } = asyncFs;
  const { closeWithTransition } = useProcesses();
  const fsWatchersRef = useRef<FileSystemWatchers>(
    Object.create(null) as FileSystemWatchers
  );
  const [pasteList, setPasteList] = useState<FilePasteOperations>(
    Object.create(null) as FilePasteOperations
  );
  const updatePasteEntries = useCallback(
    (entries: string[], operation: "copy" | "move"): void =>
      setPasteList(
        Object.fromEntries(entries.map((entry) => [entry, operation]))
      ),
    []
  );
  const copyToClipboard = useCallback(
    (entry: string) => {
      if (!CLIPBOARD_FILE_EXTENSIONS.has(getExtension(entry))) return;

      let type = getMimeType(entry);

      if (!type) return;

      // Bypass "Type image/jpeg not supported on write."
      if (type === "image/jpeg") type = "image/png";

      try {
        navigator.clipboard?.write?.([
          new ClipboardItem({
            [type]: readFile(entry).then((buffer) =>
              bufferToBlob(buffer, type)
            ),
          }),
        ]);
      } catch {
        // Ignore failure to copy image to clipboard
      }
    },
    [readFile]
  );
  const copyEntries = useCallback(
    (entries: string[]): void => {
      if (entries.length === 1) copyToClipboard(entries[0]);
      updatePasteEntries(entries, "copy");
    },
    [copyToClipboard, updatePasteEntries]
  );
  const moveEntries = useCallback(
    (entries: string[]): void => updatePasteEntries(entries, "move"),
    [updatePasteEntries]
  );
  const addFsWatcher = useCallback(
    (folder: string, updateFiles: UpdateFiles): void => {
      fsWatchersRef.current[folder] = [
        ...(fsWatchersRef.current[folder] || []),
        updateFiles,
      ];
    },
    []
  );
  const unusedMountsCleanupTimerRef = useRef(0);
  const cleanupUnusedMounts = useCallback(
    (secondCheck?: boolean) => {
      if (rootFs) {
        const mountedPaths = Object.keys(rootFs.mntMap || {}).filter(
          (mountedPath) => mountedPath !== "/"
        );

        if (mountedPaths.length === 0) return;

        const watchedPaths = Object.keys(fsWatchersRef.current).filter(
          (watchedPath) => fsWatchersRef.current[watchedPath].length > 0
        );

        mountedPaths.forEach((mountedPath) => {
          if (
            !watchedPaths.some((watchedPath) =>
              watchedPath.startsWith(mountedPath)
            ) &&
            !isMountedFolder(rootFs.mntMap[mountedPath])
          ) {
            if (secondCheck) {
              rootFs.umount?.(mountedPath);
            } else {
              unusedMountsCleanupTimerRef.current = window.setTimeout(
                () => cleanupUnusedMounts(true),
                TRANSITIONS_IN_MILLISECONDS.WINDOW
              );
            }
          }
        });
      }
    },
    [rootFs]
  );
  const removeFsWatcher = useCallback(
    (folder: string, updateFiles: UpdateFiles): void => {
      fsWatchersRef.current[folder] = (
        fsWatchersRef.current[folder] || []
      ).filter((updateFilesInstance) => updateFilesInstance !== updateFiles);

      if (unusedMountsCleanupTimerRef.current) {
        window.clearTimeout(unusedMountsCleanupTimerRef.current);
      }
      unusedMountsCleanupTimerRef.current = window.setTimeout(
        cleanupUnusedMounts,
        TRANSITIONS_IN_MILLISECONDS.WINDOW
      );
    },
    [cleanupUnusedMounts]
  );
  const updateFolder = useCallback(
    async (
      folder: string,
      newFile?: string,
      oldFile?: string
    ): Promise<void> => {
      const { [folder]: folderWatchers } = fsWatchersRef.current;

      if (folderWatchers) {
        await Promise.all(
          folderWatchers.map((updateFiles) => updateFiles(newFile, oldFile))
        );
      }
    },
    []
  );

  // mountEmscriptenFs - already updated to ZenFS in previous edit
  const mountEmscriptenFs = useCallback(
    async (FS: EmscriptenFS, fsName?: string) =>
      new Promise<string>(async (resolve, reject) => {
        try {
          const { Emscripten } = await import("@zenfs/emscripten");
          const { resolveMountConfig, mount } = await import("@zenfs/core");

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newFs = await resolveMountConfig({ FS, backend: Emscripten } as any);

          if (!newFs) {
            reject(new Error("Error while mounting Emscripten FS."));
            return;
          }

          const dbName =
            fsName ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            `${(FS as any).DB_NAME?.().replace(/\/+$/, "") || "emscripten"}${
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (FS as any).DB_STORE_NAME || ""
            }`;

          await mount(join("/", dbName), newFs);

          resolve(dbName);
        } catch (error) {
          reject(error);
        }
      }),
    [rootFs]
  );

  const mountHttpRequestFs = useCallback(
    async (
      mountPoint: string,
      url: string,
      baseUrl?: string
    ): Promise<void> => {
      const index = (await (await fetch(url)).json()) as object;

      if (!(typeof index === "object" && "fsroot" in index)) {
        throw new Error("Invalid HTTPRequest FS object.");
      }

      const { Fetch, resolveMountConfig, mount } = await import("@zenfs/core");

      const newFs = await resolveMountConfig({
        backend: Fetch,
        baseUrl: baseUrl ?? "/",
        index: convertFs9pToZenFsIndex(index.fsroot as FS9PV4[]),
      });

      if (!newFs) {
        throw new Error("Error while mounting Fetch FS.");
      }

      await mount(mountPoint, newFs);
    },
    [rootFs]
  );

  const mapFs = useCallback(
    async (
      directory: string,
      existingHandle?: FileSystemDirectoryHandle
    ): Promise<string> => {
      let handle: FileSystemDirectoryHandle | undefined;

      try {
        handle =
          existingHandle ??
          (await window.showDirectoryPicker({
            id: "MapDirectoryPicker",
            mode: "readwrite",
            startIn: "desktop",
          }));
      } catch {
        // Ignore cancelling the dialog
      }

      if (!handle) {
        throw new Error("No directory handle provided or selected.");
      }

      const { WebAccess } = await import("@zenfs/dom");
      const { resolveMountConfig, mount } = await import("@zenfs/core");

      const newFs = await resolveMountConfig({ backend: WebAccess, handle });

      if (!newFs) {
        throw new Error("Error while mounting WebAccess FS.");
      }

      const systemDirectory = SYSTEM_DIRECTORIES.has(directory);
      const mappedName =
        removeInvalidFilenameCharacters(handle.name).trim() ||
        (systemDirectory ? "" : "mapped");
      const mappedPath = join(directory, mappedName);

      await mount(mappedPath, newFs);

      // FileSystemObserver for live updates (if supported)
      if ("FileSystemObserver" in window) {
        try {
          const observer = new window.FileSystemObserver((records) => {
            for (const record of records) {
              const { relativePathComponents, relativePathMovedFrom, type } =
                record;
              let newFile = "";
              let oldFile = "";

              if (type === "appeared") {
                newFile =
                  relativePathComponents[relativePathComponents.length - 1];
              } else if (type === "disappeared") {
                oldFile =
                  relativePathComponents[relativePathComponents.length - 1];
              } else if (relativePathMovedFrom && type === "moved") {
                oldFile =
                  relativePathMovedFrom[relativePathMovedFrom.length - 1];
                newFile =
                  relativePathComponents[relativePathComponents.length - 1];
              }

              if (newFile || oldFile) {
                updateFolder(
                  join(mappedPath, ...relativePathComponents.slice(0, -1)),
                  newFile,
                  oldFile
                );
              }
            }
          });

          await observer.observe(handle, { recursive: true });
        } catch {
          // Observer not supported or failed - non-critical
        }
      }

      import("contexts/fileSystem/functions").then(({ addFileSystemHandle }) =>
        addFileSystemHandle(directory, handle, mappedName)
      );

      return systemDirectory ? directory : mappedName;
    },
    [rootFs, updateFolder]
  );

  const mountFs = useCallback(
    async (url: string): Promise<void> => {
      const fileData = await readFile(url);

      const isIso = getExtension(url) === ".iso";
      const { Zip, Iso } = await import("@zenfs/archives");
      const { resolveMountConfig, mount } = await import("@zenfs/core");

      const newFs = await resolveMountConfig({
        backend: isIso ? Iso : Zip,
        data: fileData,
      });

      if (newFs) {
        await mount(url, newFs);
      } else {
        throw new Error(`Error while mounting ${isIso ? "ISO" : "ZIP"} FS.`);
      }
    },
    [readFile, rootFs]
  );

  const unMountFs = useCallback(
    async (url: string): Promise<void> => {
      if (rootFs?.umount) {
        await rootFs.umount(url);
      } else {
        const { umount } = await import("@zenfs/core");
        await umount(url);
      }
    },
    [rootFs]
  );

  const unMapFs = useCallback(
    async (directory: string, hasNoHandle?: boolean): Promise<void> => {
      await unMountFs(directory);
      updateFolder(dirname(directory), undefined, directory);

      if (hasNoHandle) return;

      const { removeFileSystemHandle } = await import(
        "contexts/fileSystem/functions"
      );

      removeFileSystemHandle(directory);
    },
    [unMountFs, updateFolder]
  );

  const { openTransferDialog } = useTransferDialog();

  const addFile = useCallback(
    (
      directory: string,
      callback: NewPath,
      accept?: string,
      multiple = true
    ): Promise<string[]> =>
      new Promise((resolve) => {
        const fileInput = document.createElement("input");

        fileInput.type = "file";
        fileInput.multiple = multiple;
        if (accept) fileInput.accept = accept;
        fileInput.setAttribute("style", "display: none");
        fileInput.addEventListener(
          "change",
          (event) => {
            handleFileInputEvent(
              event as InputChangeEvent,
              callback,
              directory,
              openTransferDialog
            );

            const { files } = getEventData(event as InputChangeEvent);

            if (files) {
              resolve(
                [...files].map((file) =>
                  files instanceof FileList
                    ? (file as File).name
                    : (
                        (
                          file as DataTransferItem
                        ).webkitGetAsEntry() as FileSystemEntry
                      ).name
                )
              );
            }

            fileInput.remove();
          },
          { once: true }
        );
        document.body.append(fileInput);
        fileInput.click();
      }),
    [openTransferDialog]
  );

  const mkdirRecursive = useCallback(
    async (path: string): Promise<void> => {
      const pathParts = path.split("/").filter(Boolean);
      const recursePath = async (position = 1, retry = 0): Promise<void> => {
        const makePath = join("/", pathParts.slice(0, position).join("/"));
        let created: boolean;

        try {
          created = (await exists(makePath)) || (await mkdir(makePath));
        } catch {
          created = false;
        }

        if (created) {
          if (position !== pathParts.length) {
            await recursePath(position + 1);
          }
        } else if (retry < 3) {
          await recursePath(position, retry + 1);
        }
      };

      await recursePath();
    },
    [exists, mkdir]
  );

  const deletePath = useCallback(
    async (path: string): Promise<boolean> => {
      let deleted = false;

      try {
        deleted = await unlink(path);
      } catch (error: any) {
        if (error?.code === "EISDIR") {
          const dirContents = await readdir(path);

          await Promise.all(
            dirContents.map((entry) => deletePath(join(path, entry)))
          );
          deleted = await rmdir(path);
        }
      }

      if (Object.keys(fsWatchersRef.current || {}).includes(path)) {
        closeWithTransition(`FileExplorer${PROCESS_DELIMITER}${path}`);
      }

      return deleted;
    },
    [closeWithTransition, readdir, rmdir, unlink]
  );

  const createPath = useCallback(
    async (
      name: string,
      directory: string,
      buffer?: Buffer,
      iteration = 0,
      overwrite = false
    ): Promise<string> => {
      if (!name.trim()) return "";

      const isInternal = !buffer && isAbsolute(name);
      const baseName = isInternal ? basename(name) : name;
      const uniqueName = iteration
        ? iterateFileName(baseName, iteration)
        : baseName;
      const fullNewPath = join(directory, uniqueName);

      if (isInternal) {
        if (
          name !== fullNewPath &&
          directory !== name &&
          !directory.startsWith(`${name}/`) &&
          !rootFs?.mntMap[name]
        ) {
          if (await exists(fullNewPath)) {
            return createPath(name, directory, buffer, iteration + 1);
          }

          if (await rename(name, fullNewPath)) {
            updateFolder(dirname(name), "", name);
          }

          return uniqueName;
        }
      } else {
        const maybeMakePath = async (makePath: string): Promise<void> => {
          try {
            if (!(await exists(makePath))) {
              await mkdir(makePath);
              updateFolder(dirname(makePath), basename(makePath));
            }
          } catch (error: any) {
            if (error?.code === "ENOENT") {
              await maybeMakePath(dirname(makePath));
              await maybeMakePath(makePath);
            }
          }
        };

        await maybeMakePath(dirname(fullNewPath));

        try {
          if (
            buffer
              ? await writeFile(fullNewPath, buffer, overwrite)
              : await mkdir(fullNewPath)
          ) {
            return uniqueName;
          }
        } catch (error: any) {
          if (error?.code === "EEXIST") {
            return createPath(name, directory, buffer, iteration + 1);
          }
        }
      }

      return "";
    },
    [exists, mkdir, rename, rootFs?.mntMap, updateFolder, writeFile]
  );

  const restoredFsHandles = useRef(false);

  useEffect(() => {
    if (!restoredFsHandles.current && rootFs) {
      const restoreFsHandles = async (): Promise<void> => {
        restoredFsHandles.current = true;

        let mappedOntoDesktop = false;

        if (await hasIndexedDB(KEYVAL_DB)) {
          await Promise.all(
            Object.entries(await getFileSystemHandles()).map(
              async ([handleDirectory, handle]) => {
                if (!(await exists(handleDirectory))) {
                  try {
                    const mapDirectory = SYSTEM_DIRECTORIES.has(handleDirectory)
                      ? handleDirectory
                      : dirname(handleDirectory);

                    await mapFs(mapDirectory, handle);

                    if (mapDirectory === DESKTOP_PATH) mappedOntoDesktop = true;
                  } catch {
                    // Ignore failure
                  }
                }
              }
            )
          );
        }

        if (mappedOntoDesktop) updateFolder(DESKTOP_PATH);
      };

      restoreFsHandles();
    }
  }, [exists, mapFs, rootFs, updateFolder]);

  return {
    addFile,
    addFsWatcher,
    copyEntries,
    createPath,
    deletePath,
    mapFs,
    mkdirRecursive,
    mountEmscriptenFs,
    mountFs,
    mountHttpRequestFs,
    moveEntries,
    pasteList,
    removeFsWatcher,
    setPasteList,
    unMapFs,
    unMountFs,
    updateFolder,
    ...asyncFs,
  };
};

export default useFileSystemContextState;
