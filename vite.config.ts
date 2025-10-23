import { defineConfig } from 'vite';
import { crx, defineManifest } from '@crxjs/vite-plugin';

const manifest = defineManifest({
  manifest_version: 3,
  name: "POS アシスタント",
  description: "学力POSの動作を改善",
  version: "1.2.1",
  icons: {
    16: "public/icons/16.png",
    48: "public/icons/48.png",
    128: "public/icons/128.png"
  },
  permissions: [
    "downloads",
    "storage"
  ],
  host_permissions: [
    "https://*.toshin.com/*"
  ],
  background: {
    service_worker: "src/background.ts",
    type: "module"
  },
  content_scripts: [
    {
      matches: [
        "https://www.toshin.com/pos*",
        "https://toshin.com/pos*",
        "https://pos.toshin.com/SSO1/SSOMenu/PosApplication.aspx",
        "https://pos.toshin.com/sso1/ssomenu/sessionerror.html*",
        "https://pos.toshin.com/SSO1/SSOMenu/sessionerror.html*",
        "https://pos2.toshin.com/RBT2/RBT_Student/Page/ErrorPages/RBTLoginError.aspx",
        "https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/EnshuJisshi*",
        "https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/EnshuKaishi*",
        "https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/MondaiKaitoInsatsu*",
        "https://pos.toshin.com/TGT/OPCTSS/OPCTSS_Student/KekkaShousai*",
        "https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/KekkaShosai*",
        "https://pos.toshin.com/TGT/OPCTTS/OPCTTS_Student/NendobetsuRireki*"
      ],
      js: [
        "src/content.ts"
      ],
      run_at: "document_end",
      all_frames: true
    }
  ],
  web_accessible_resources: [
    {
      resources: [
        "src/lib/enshu_assistant/content.ts",
        "src/lib/enshu_assistant/pdf_renamer/shared.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_mondai/enshu_jisshi.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_mondai/mondai_kaito_insatsu.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_mondai/background.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_kaisetsu/kekka_shousai.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_kaisetsu/download.ts",
        "src/lib/enshu_assistant/pdf_renamer/get_kaisetsu/background.ts",
        "src/lib/enshu_assistant/marksheet_enhancer/enshu_jisshi.ts",
        "src/lib/enshu_assistant/daimon_navigation/kekka_shosai.ts",
        "src/lib/enshu_assistant/daimon_navigation/nendobetsu_rireki.ts",
        "src/lib/session_manager/content.ts",
        "src/lib/session_manager/constants.ts",
        "src/lib/pos_application_enhancer/content.ts",
        "src/storage.ts"
      ],
      matches: [
        "https://*.toshin.com/*"
      ]
    }
  ]
});

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    },
    hmr: {
      port: 5173,
    },
  },
});
