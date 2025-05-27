import { Config } from "../../config/config";
import fs from "fs";

export interface WatcherInterface {
  init_watchers: () => void;
  //   config: Config;
  //   current_theme_json_file_changed_watcher: fs.FSWatcher;
}
