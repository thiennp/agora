import { createAppStore, registerAppStore, registeredAppStore, repoAppIds, type AppStore } from "@/lib/app-config";
import { loadEnv } from "@/lib/env";
import { appBackendFromEnv } from "./app-persistence";

/** The store of apps created as data, created on first use from the environment and registered so `loadApp` can find them. */
export function getAppStore(): AppStore {
  return registeredAppStore() ?? createAndRegister();
}

function createAndRegister(): AppStore {
  const store = createAppStore(appBackendFromEnv(loadEnv()), { reserved: repoAppIds() });
  registerAppStore(store);
  return store;
}

/** Replace the store (tests, and the demo reset when it wants stored apps gone too). */
export function useAppStore(store: AppStore | undefined): void {
  registerAppStore(store);
}
