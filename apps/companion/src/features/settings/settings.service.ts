import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import { type Settings, settingsSchema } from "./settings.schema";
import { invalidateApiClient } from "../../shared/api/client";

async function getStore() {
  return load("settings.json", { defaults: {}, autoSave: 200 });
}

export async function loadSettings(): Promise<Settings> {
  const store = await getStore();
  const raw = {
    api_url: (await store.get<string>("api_url")) ?? "",
    onboarding_completed:
      (await store.get<boolean>("onboarding_completed")) ?? false,
    api_key_stored: (await store.get<boolean>("api_key_stored")) ?? false,
    after_upload_action:
      (await store.get<string>("after_upload_action")) ?? "copy",
    notifications_enabled:
      (await store.get<boolean>("notifications_enabled")) ?? true,
    autostart_enabled:
      (await store.get<boolean>("autostart_enabled")) ?? false,
    global_shortcut: (await store.get<string>("global_shortcut")) ?? "",
    language: (await store.get<string>("language")) ?? "",
  };
  return settingsSchema.parse(raw);
}

export async function saveApiUrl(url: string): Promise<void> {
  const store = await getStore();
  await store.set("api_url", url);
  await store.save();
  invalidateApiClient();
}

export async function markApiKeyStored(stored: boolean): Promise<void> {
  const store = await getStore();
  await store.set("api_key_stored", stored);
  await store.save();
}

export async function markOnboardingCompleted(): Promise<void> {
  const store = await getStore();
  await store.set("onboarding_completed", true);
  await store.save();
}

export async function saveAfterUploadAction(
  action: Settings["after_upload_action"]
): Promise<void> {
  const store = await getStore();
  await store.set("after_upload_action", action);
  await store.save();
}

export async function saveNotificationsEnabled(enabled: boolean): Promise<void> {
  const store = await getStore();
  await store.set("notifications_enabled", enabled);
  await store.save();
}

export async function saveAutostartEnabled(enabled: boolean): Promise<void> {
  try {
    if (enabled) {
      await enable();
    } else {
      await disable();
    }
    const actual = await isEnabled();
    const store = await getStore();
    await store.set("autostart_enabled", actual);
    await store.save();
  } catch {
    // autostart not supported on this platform — save the intent anyway
    const store = await getStore();
    await store.set("autostart_enabled", enabled);
    await store.save();
  }
}

export async function setApiKey(key: string): Promise<void> {
  await invoke("set_api_key", { key });
  await markApiKeyStored(true);
  invalidateApiClient();
}

export async function deleteApiKey(): Promise<void> {
  await invoke("delete_api_key");
  await markApiKeyStored(false);
  invalidateApiClient();
}

export async function getApiKey(): Promise<string | null> {
  return invoke<string | null>("get_api_key");
}

export async function saveGlobalShortcut(shortcut: string): Promise<void> {
  const store = await getStore();
  await store.set("global_shortcut", shortcut);
  await store.save();
}

export async function saveLanguage(language: string): Promise<void> {
  const store = await getStore();
  await store.set("language", language);
  await store.save();
}
