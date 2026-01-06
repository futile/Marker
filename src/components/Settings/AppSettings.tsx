import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme, Theme } from "@/ThemeProvider";
import { Switch } from "../ui/switch";
import useStore from "@/store/appStore";
import { useShallow } from "zustand/react/shallow";
import { isTauri } from "@/utils/tauri";
import {
  check,
  type DownloadEvent,
  type Update,
} from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

const AppSettings = () => {
  const { setTheme } = useTheme();
  const { settings, setSettings } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      setSettings: s.setSettings,
    })),
  );

  const [open, setOpen] = useState(false);
  const [updateState, setUpdateState] = useState<
    | "idle"
    | "checking"
    | "available"
    | "upToDate"
    | "downloading"
    | "installed"
    | "error"
  >("idle");
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [downloadPercent, setDownloadPercent] = useState<number | null>(null);
  const isDesktop = isTauri();
  useEffect(() => {
    if (!isDesktop) return;
    let unlisten: UnlistenFn | null = null;
    listen("menu://settings", () => {
      setOpen(true);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [isDesktop]);

  useEffect(() => {
    return () => {
      if (availableUpdate) {
        void availableUpdate.close();
      }
    };
  }, [availableUpdate]);

  const isUpdateBusy =
    updateState === "checking" || updateState === "downloading";

  async function checkForUpdates() {
    if (!isDesktop || isUpdateBusy) return;
    setUpdateState("checking");
    setDownloadPercent(null);
    setAvailableUpdate(null);
    try {
      const update = await check();
      if (update) {
        setAvailableUpdate(update);
        setUpdateState("available");
        toast.info("Update available", {
          description: `Version ${update.version} is ready to install.`,
        });
        return;
      }
      setUpdateState("upToDate");
      toast.success("You're up to date", {
        description: "No updates are available right now.",
      });
    } catch (error) {
      setUpdateState("error");
      toast.error("Update check failed", {
        description:
          error instanceof Error
            ? error.message
            : "Unable to check for updates.",
      });
    }
  }

  async function installUpdate() {
    if (!availableUpdate || isUpdateBusy) return;
    setUpdateState("downloading");
    setDownloadPercent(null);
    let totalBytes = 0;
    let downloadedBytes = 0;
    try {
      await availableUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          totalBytes = event.data.contentLength ?? 0;
          downloadedBytes = 0;
          setDownloadPercent(totalBytes ? 0 : null);
        }
        if (event.event === "Progress") {
          downloadedBytes += event.data.chunkLength;
          if (totalBytes > 0) {
            const percent = Math.min(
              100,
              Math.round((downloadedBytes / totalBytes) * 100),
            );
            setDownloadPercent(percent);
          }
        }
        if (event.event === "Finished") {
          setDownloadPercent(100);
        }
      });
      setUpdateState("installed");
      toast.success("Update installed", {
        description: "Restart Marker to finish applying the update.",
      });
    } catch (error) {
      setUpdateState("error");
      toast.error("Update failed", {
        description:
          error instanceof Error ? error.message : "Unable to install update.",
      });
    } finally {
      setAvailableUpdate(null);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>App Settings</DialogTitle>
          <DialogDescription>
            Adjust the app configuration here.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-7">
          <div className="justify-between items-center flex">
            <div>
              <h1>Color Scheme</h1>
              <p className="text-neutral-500 text-xs">
                Choose the default theme for Marker
              </p>
            </div>
            <div>
              <Select
                defaultValue={localStorage.getItem("ui-theme") || "system"}
                onValueChange={(val: Theme) => setTheme(val)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Choose a theme..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="justify-between items-center flex">
            <div>
              <h1>Show Table of Contents</h1>
              <p className="text-neutral-500 text-xs">
                Toggle the table of contents next to the text editor.
              </p>
            </div>
            <div>
              <Switch
                checked={settings.showTOC}
                onCheckedChange={(e) => {
                  setSettings({ ...settings, showTOC: e });
                }}
                className="border-accent data-[state=checked]:bg-primary data-[state=unchecked]:bg-border"
              />
            </div>
          </div>

          {isDesktop && (
            <div className="justify-between items-center flex">
              <div>
                <h1>Updates</h1>
                <p className="text-neutral-500 text-xs">
                  Check for new releases and install them.
                </p>
                {updateState === "checking" && (
                  <p className="text-neutral-500 text-xs">
                    Checking for updates...
                  </p>
                )}
                {updateState === "available" && availableUpdate && (
                  <p className="text-neutral-500 text-xs">
                    Version {availableUpdate.version} is ready to install.
                  </p>
                )}
                {updateState === "upToDate" && (
                  <p className="text-neutral-500 text-xs">
                    You're already on the latest version.
                  </p>
                )}
                {updateState === "downloading" && (
                  <p className="text-neutral-500 text-xs">
                    Downloading update
                    {downloadPercent !== null
                      ? ` (${downloadPercent}%)`
                      : "..."}
                  </p>
                )}
                {updateState === "installed" && (
                  <p className="text-neutral-500 text-xs">
                    Update installed. Restart Marker to apply it.
                  </p>
                )}
                {updateState === "error" && (
                  <p className="text-neutral-500 text-xs">
                    Update failed. Check logs for details.
                  </p>
                )}
              </div>
              <div>
                {updateState === "available" ? (
                  <Button onClick={installUpdate} disabled={isUpdateBusy}>
                    Install update
                  </Button>
                ) : (
                  <Button onClick={checkForUpdates} disabled={isUpdateBusy}>
                    Check for updates
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default AppSettings;
