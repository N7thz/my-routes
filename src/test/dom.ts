import { GlobalRegistrator } from "@happy-dom/global-registrator";

declare global {
  var __UI_SDK_STRICT__: boolean | undefined;
}

GlobalRegistrator.register();
globalThis.__UI_SDK_STRICT__ = true;
