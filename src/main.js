import disableDevtool from "disable-devtool";

const env = process.env;
const isProd = env.NODE_ENV === "production";
const enableConfigJS = env.VUE_APP_CONFIGJS == "true";
const enableAntiDebugging = env.VUE_APP_DEBUGGING == "true";

(async () => {
  try {
    if (!isProd || !enableConfigJS) {
      const res = await import('./config/index.js');
      if (typeof window !== 'undefined') {
        window.EZ_CONFIG = res.config || res.default || res;
      }
    }
    
    // 反調試邏輯
    if (isProd && enableAntiDebugging) {
      disableDevtool()
    }
    
    // 確保在設定載入後再初始化應用。
    await import('./appInit.js');
  } catch (error) {
    console.error(error);
  }
})();
