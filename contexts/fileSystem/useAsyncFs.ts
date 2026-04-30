import { join } from "path";
import { useEffect, useMemo, useRef, useState } from "react";
import { configure, fs as zenFs, Stats } from "@zenfs/core";
import {
  ICON_CACHE,
  ICON_CACHE_EXTENSION,
  SESSION_FILE,
} from "utils/constants";
import {
  IDX_FILE_MODE,
  UNKNOWN_STATE_CODES,
  get9pSize,
  supportsIndexedDB,
} from "contexts/fileSystem/core";
import FileSystemConfig from "contexts/fileSystem/FileSystemConfig";
import { isExistingFile } from "components/system/Files/FileEntry/functions";

export type { Stats } from "@zenfs/core";

export type EmscriptenFS = {
  DB_NAME: () => string;
  DB_STORE_NAME: string;
};

export type ExtendedEmscriptenFileSystem = Omit<EmscriptenFS, "_FS"> & {
  _FS?: EmscriptenFS;
};

export type Mount = {
  _data?: Buffer;
  data?: Buffer;
  getName: () => string;
};

export type RootFileSystem = {
  _getFs?: (path: string) => { fs: any };
  mntMap: Record<string, Mount>;
  mount?: (path: string, fsInstance: any) => Promise<void> | void;
  mountList: string[];
  umount?: (path: string) => Promise<void> | void;
};

export type AsyncFS = {
  exists: (path: string) => Promise<boolean>;
  lstat: (path: string) => Promise<Stats>;
  mkdir: (path: string, overwrite?: boolean) => Promise<boolean>;
  readFile: (path: string) => Promise<Buffer>;
  readdir: (path: string) => Promise<string[]>;
  rename: (oldPath: string, newPath: string) => Promise<boolean>;
  rmdir: (path: string) => Promise<boolean>;
  stat: (path: string) => Promise<Stats>;
  unlink: (path: string) => Promise<boolean>;
  writeFile: (
    path: string,
    data: Buffer | string,
    overwrite?: boolean
  ) => Promise<boolean>;
};

type AsyncFSModule = AsyncFS & {
  fs?: any;
  rootFs?: RootFileSystem;
};

type FsQueueCall = [string, unknown[]];

const mockFsCallQueue: FsQueueCall[] = [];

const runQueuedFsCalls = (fsInstance: any): void => {
  if (mockFsCallQueue.length > 0) {
    const [name, args] = mockFsCallQueue.shift() as FsQueueCall;

    if (name in fsInstance) {
      const fsCall = fsInstance[name];

      if (typeof fsCall === "function") {

        (fsCall as (...args: unknown[]) => unknown)(...args);
      }
    }

    runQueuedFsCalls(fsInstance);
  }
};

const useAsyncFs = (): AsyncFSModule => {
  const [fs, setFs] = useState<any>();
  const fsRef = useRef<any>(undefined);
  const [rootFs, setRootFs] = useState<RootFileSystem>();
  const asyncFs: AsyncFS = useMemo(
    () => ({
      exists: (path) =>
        new Promise((resolve) => {
          fs?.exists(path, resolve);
        }),
      lstat: (path) =>
        new Promise((resolve, reject) => {
          fs?.lstat(
            path,
            (error: any, stats: Stats = Object.create(null) as Stats) =>
              error ? reject(error) : resolve(stats)
          );
        }),
      mkdir: (path, overwrite = false) =>
        new Promise((resolve, reject) => {
          fs?.mkdir(path, { flag: overwrite ? "w" : "wx" }, (error: any) =>
            error ? reject(error) : resolve(true)
          );
        }),
      readFile: (path) =>
        new Promise((resolve, reject) => {
          fs?.readFile(path, (error: any, data: Buffer = Buffer.from("")) => {
            if (!error || UNKNOWN_STATE_CODES.has(error.code)) {
              return resolve(data);
            }

            if (error.code === "EISDIR" && rootFs?.mntMap[path]) {
              const mountData =
                rootFs.mntMap[path]._data || rootFs.mntMap[path].data;

              if (mountData) return resolve(mountData);
            }

            return reject(error);
          });
        }),
      readdir: (path) =>
        new Promise((resolve, reject) => {
          fs?.readdir(path, (error: any, data: string[] = []) =>
            error ? reject(error) : resolve(data)
          );
        }),
      rename: (oldPath, newPath) =>
        new Promise((resolve, reject) => {
          fs?.rename(oldPath, newPath, (renameError: any) => {
            if (!renameError) {
              resolve(true);
            } else if (renameError.code === "ENOTSUP") {
              fs.lstat(
                oldPath,
                (
                  _statsError: any,
                  stats: Stats = Object.create(null) as Stats
                ) => {
                  if (stats.isDirectory()) {
                    reject(new Error("Renaming directories is not supported."));
                  } else {
                    fs.readFile(oldPath, (readError: any, data: Buffer) =>
                      fs.writeFile(newPath, data, (writeError: any) =>
                        readError || writeError
                          ? reject(
                              readError ||
                                writeError ||
                                new Error("Failed to rename file.")
                            )
                          : resolve(false)
                      )
                    );
                  }
                }
              );
            } else if (renameError.code === "EISDIR") {
              rootFs?.umount?.(oldPath);
              asyncFs.rename(oldPath, newPath).then(resolve, reject);
            } else if (UNKNOWN_STATE_CODES.has(renameError.code)) {
              resolve(false);
            } else {
              reject(renameError);
            }
          });
        }),
      rmdir: (path) =>
        new Promise((resolve, reject) => {
          fs?.rmdir(path, (error: any) =>
            error ? reject(error) : resolve(true)
          );
        }),
      stat: (path) =>
        new Promise((resolve, reject) => {
          fs?.stat(
            path,
            (error: any, stats: Stats = Object.create(null) as Stats) => {
              if (error) {
                return UNKNOWN_STATE_CODES.has(error.code)
                  ? resolve(new Stats({ mode: IDX_FILE_MODE, size: 0 }))
                  : reject(error);
              }

              return resolve(
                stats.size === -1 && isExistingFile(stats)
                  ? new Stats({
                      atimeMs: stats.atimeMs,
                      birthtimeMs: stats.birthtimeMs,
                      ctimeMs: stats.ctimeMs,
                      mode: stats.mode || IDX_FILE_MODE,
                      mtimeMs: stats.mtimeMs,
                      size: get9pSize(path),
                    })
                  : stats
              );
            }
          );
        }),
      unlink: (path) =>
        new Promise((resolve, reject) => {
          fs?.unlink(path, (error: any) => {
            if (error) {
              return UNKNOWN_STATE_CODES.has(error.code)
                ? resolve(false)
                : reject(error);
            }

            return resolve(true);
          });
        }),
      writeFile: (path, data, overwrite = false) =>
        new Promise((resolve, reject) => {
          fs?.writeFile(
            path,
            data,
            { flag: overwrite ? "w" : "wx" },
            (error: any) => {
              if (error && (!overwrite || error.code !== "EEXIST")) {
                if (error.code === "ENOENT" && error.path === "/") {
                  import("contexts/fileSystem/functions").then(
                    ({ resetStorage }) =>
                      resetStorage(rootFs).finally(() =>
                        window.location.reload()
                      )
                  );
                }

                reject(error);
              } else {
                resolve(!error);

                try {
                  if (path !== SESSION_FILE) {
                    const cachedIconPath = join(
                      ICON_CACHE,
                      `${path}${ICON_CACHE_EXTENSION}`
                    );

                    fs?.exists(
                      cachedIconPath,
                      (exists: boolean) => exists && fs?.unlink(cachedIconPath)
                    );
                  }
                } catch {
                  // Ignore icon cache issues
                }
              }
            }
          );
        }),
    }),
    [fs, rootFs]
  );

  useEffect(() => {
    if (!fs) {
      const queueFsCall =
        (name: string) =>
        (...args: unknown[]) => {
          if (fsRef.current) {

            (fsRef.current[name] as (...args: unknown[]) => unknown)(...args);
          } else mockFsCallQueue.push([name, args]);
        };

      setFs({
        exists: queueFsCall("exists"),
        lstat: queueFsCall("lstat"),
        mkdir: queueFsCall("mkdir"),
        readFile: queueFsCall("readFile"),
        readdir: queueFsCall("readdir"),
        rename: queueFsCall("rename"),
        rmdir: queueFsCall("rmdir"),
        stat: queueFsCall("stat"),
        unlink: queueFsCall("unlink"),
        writeFile: queueFsCall("writeFile"),
      });
    } else if (fs === zenFs) {
      runQueuedFsCalls(fs);
    } else {
      const setupFs = async (writeToIndexedDB: boolean): Promise<void> => {
        await configure(FileSystemConfig(!writeToIndexedDB) as any);

        fsRef.current = zenFs;
        setFs(zenFs);
        setRootFs({
          _getFs: (_path: string) => ({ fs: zenFs }),
          mntMap: Object.create(null) as Record<string, Mount>,
          mount: async (path: string, newFsInstance: any) => {
            const { mount } = await import("@zenfs/core");
            await mount(path, newFsInstance);
          },
          mountList: [],
          umount: async (path: string) => {
            const { umount } = await import("@zenfs/core");
            await umount(path);
          },
        });
      };

      supportsIndexedDB().then(setupFs);
    }
  }, [fs]);

  return useMemo(
    () => ({
      ...asyncFs,
      fs,
      rootFs,
    }),
    [asyncFs, fs, rootFs]
  );
};

export default useAsyncFs;
