export const LOCALES = Object.freeze(["en", "ja"]);

export const LOCALE_LABELS = Object.freeze({
  en: "EN",
  ja: "日本語",
});

const DATE_LOCALES = Object.freeze({
  en: "en-US",
  ja: "ja-JP",
});

const en = Object.freeze({
  "meta.title": "SnakeBench | Jev vs LLMs",

  "lang.label": "Language",

  "brand.taglineLine1": "Real-time AI.",
  "brand.taglineLine2": "A clearer picture.",

  "settings.button": "Settings",
  "settings.keysStored": "2 keys stored locally",
  "settings.keysLocal": "Keys stay in this browser",

  "controls.aria": "Race controls",
  "controls.modelLabel": "OpenRouter model",
  "controls.catalogLoading": "Loading catalog",
  "controls.catalogFallback": "Fallback list",
  "controls.catalogCount": "{count} available",
  "controls.groupLatest": "Latest models",
  "controls.groupAll": "All OpenRouter models",
  "controls.start": "Start race",
  "controls.stop": "Stop race",
  "controls.badgeLive": "Live ready",
  "controls.badgeDemo": "Demo ready",
  "controls.explainerLine1": "Both AIs start at the same time.",
  "controls.explainerLine2":
    "Each race runs {seconds} seconds. Highest score wins.",

  "notice.dismiss": "Dismiss notice",
  "notice.demoStarted":
    "Demo mode is running. Add both API keys in Settings for a live race.",
  "notice.liveStarted":
    "Live API race started. Both models received the same board seed.",
  "notice.apiFailed": "The race ended early because an API call failed.",
  "notice.demoComplete": "Demo race complete. The score is saved in this browser.",
  "notice.liveComplete": "Live race complete. The score is saved in this browser.",
  "notice.stopped": "Race stopped. The partial score was saved on this device.",
  "notice.keysSavedBoth":
    "Both API keys are stored in this browser. The next race will use live APIs.",
  "notice.keysSavedPartial": "Keys saved. Add both keys to enable a live race.",
  "notice.keysDeleted": "Stored API keys were removed from this browser.",

  "error.unknown": "Unknown API error",
  "error.jev-relay-unreachable":
    "Could not reach the Jev relay. Check your connection and try again.",
  "error.model-list-unexpected": "OpenRouter returned an unexpected model list.",

  "arena.aria": "Head-to-head Snake race",
  "agent.eyebrow": "AI-controlled Snake",
  "agent.playTime": "Play time",

  "board.aria": "{name} Snake board. Score {score}. {state}",
  "board.alive": "Snake is active.",
  "board.crashed": "Snake crashed.",

  "metric.score": "Score",
  "metric.moves": "Moves",
  "metric.latency": "Latency",
  "metric.cost": "Cost",
  "metric.validDecisions": "Valid Decisions",

  "status.preview": "Demo preview",
  "status.ready": "Ready",
  "status.running": "Running",
  "status.crashed": "Crashed",
  "status.finished": "Finished",
  "status.error": "API error",

  "scoreboard.aria": "Match scoreboard",
  "scoreboard.matchTime": "Match time",
  "scoreboard.limit": "of {limit} limit",
  "scoreboard.score": "Score",
  "scoreboard.finished": "Match complete",
  "scoreboard.live": "Live head-to-head Snake benchmark",
  "scoreboard.demo": "Demo head-to-head Snake benchmark",

  "result.eyebrowLive": "Race result (live)",
  "result.eyebrowSoFar": "Race result (so far)",
  "result.fasterLead": "{name} is",
  "result.fasterTail": "faster",
  "result.incompleteLead": "Race",
  "result.incompleteAccent": "incomplete",
  "result.previewNote":
    "This is a demo snapshot. Run your own race with your API keys to get real results.",
  "result.storedNote":
    "This match score and its latency summary are stored only in this browser.",

  "dialog.eyebrow": "Browser settings",
  "dialog.title": "Connect your models",
  "dialog.close": "Close settings",
  "dialog.jevKey": "Jev API key",
  "dialog.openRouterKey": "OpenRouter API key",
  "dialog.getKey": "Get a key",
  "dialog.keyPlaceholder": "Paste key",
  "dialog.showKey": "Show {label}",
  "dialog.hideKey": "Hide {label}",
  "dialog.storageNote":
    "Keys are stored unencrypted in this browser's localStorage. They are sent only to TypeSafe and OpenRouter when you start a live race.",
  "dialog.corsNote":
    "TypeSafe currently blocks requests from arbitrary browser origins. A live Jev race needs this deployed origin on TypeSafe's CORS allowlist. Demo races work without keys.",
  "dialog.deleteKeys": "Delete stored keys",
  "dialog.save": "Save in this browser",

  "history.title": "Recent matches",
  "history.clear": "Clear history",
  "history.empty": "Completed scores stay on this device.",
  "history.modeLive": "Live APIs",
  "history.modeDemo": "Demo",
});

const ja = Object.freeze({
  "meta.title": "SnakeBench | Jev 対 LLM",

  "lang.label": "言語",

  "brand.taglineLine1": "リアルタイムAI。",
  "brand.taglineLine2": "より明確な比較を。",

  "settings.button": "設定",
  "settings.keysStored": "キー2件をこの端末に保存済み",
  "settings.keysLocal": "キーはこのブラウザに保存されます",

  "controls.aria": "レース設定",
  "controls.modelLabel": "OpenRouter モデル",
  "controls.catalogLoading": "カタログを読み込み中",
  "controls.catalogFallback": "フォールバック一覧",
  "controls.catalogCount": "{count} 件利用可能",
  "controls.groupLatest": "最新モデル",
  "controls.groupAll": "OpenRouter の全モデル",
  "controls.start": "レース開始",
  "controls.stop": "レース停止",
  "controls.badgeLive": "ライブ実行可",
  "controls.badgeDemo": "デモ実行可",
  "controls.explainerLine1": "2つのAIが同時にスタートします。",
  "controls.explainerLine2":
    "1レースは{seconds}秒。スコアが高いほうが勝ちです。",

  "notice.dismiss": "通知を閉じる",
  "notice.demoStarted":
    "デモモードで実行中です。ライブレースには設定で両方のAPIキーを追加してください。",
  "notice.liveStarted":
    "ライブAPIレースを開始しました。両方のモデルに同じ盤面シードを渡しています。",
  "notice.apiFailed": "APIリクエストが失敗したため、レースは途中で終了しました。",
  "notice.demoComplete":
    "デモレースが完了しました。スコアはこのブラウザに保存されます。",
  "notice.liveComplete":
    "ライブレースが完了しました。スコアはこのブラウザに保存されます。",
  "notice.stopped":
    "レースを停止しました。途中までのスコアをこの端末に保存しました。",
  "notice.keysSavedBoth":
    "両方のAPIキーをこのブラウザに保存しました。次のレースはライブAPIで実行されます。",
  "notice.keysSavedPartial":
    "キーを保存しました。ライブレースには両方のキーが必要です。",
  "notice.keysDeleted": "保存されていたAPIキーをこのブラウザから削除しました。",

  "error.unknown": "不明なAPIエラー",
  "error.jev-relay-unreachable":
    "Jevリレーに接続できませんでした。通信環境を確認してからもう一度お試しください。",
  "error.model-list-unexpected":
    "OpenRouter から想定外のモデル一覧が返されました。",

  "arena.aria": "スネーク対戦レース",
  "agent.eyebrow": "AI操作のスネーク",
  "agent.playTime": "プレイ時間",

  "board.aria": "{name} のスネーク盤面。スコア {score}。{state}",
  "board.alive": "スネークは稼働中です。",
  "board.crashed": "スネークはクラッシュしました。",

  "metric.score": "スコア",
  "metric.moves": "手数",
  "metric.latency": "レイテンシ",
  "metric.cost": "コスト",
  "metric.validDecisions": "有効判断率",

  "status.preview": "デモプレビュー",
  "status.ready": "準備完了",
  "status.running": "実行中",
  "status.crashed": "クラッシュ",
  "status.finished": "終了",
  "status.error": "APIエラー",

  "scoreboard.aria": "対戦スコアボード",
  "scoreboard.matchTime": "経過時間",
  "scoreboard.limit": "上限 {limit}",
  "scoreboard.score": "スコア",
  "scoreboard.finished": "対戦終了",
  "scoreboard.live": "ライブ対戦スネークベンチマーク",
  "scoreboard.demo": "デモ対戦スネークベンチマーク",

  "result.eyebrowLive": "レース結果（ライブ）",
  "result.eyebrowSoFar": "レース結果（暫定）",
  "result.fasterLead": "{name} が",
  "result.fasterTail": "高速",
  "result.incompleteLead": "レースは",
  "result.incompleteAccent": "未完了",
  "result.previewNote":
    "これはデモのスナップショットです。実際の結果を見るには、ご自身のAPIキーでレースを実行してください。",
  "result.storedNote":
    "この対戦スコアとレイテンシの集計は、このブラウザ内にのみ保存されます。",

  "dialog.eyebrow": "ブラウザ設定",
  "dialog.title": "モデルを接続する",
  "dialog.close": "設定を閉じる",
  "dialog.jevKey": "Jev APIキー",
  "dialog.openRouterKey": "OpenRouter APIキー",
  "dialog.getKey": "キーを取得",
  "dialog.keyPlaceholder": "キーを貼り付け",
  "dialog.showKey": "{label}を表示",
  "dialog.hideKey": "{label}を非表示",
  "dialog.storageNote":
    "キーは暗号化されずにこのブラウザの localStorage に保存されます。送信先は、ライブレースを開始したときの TypeSafe と OpenRouter だけです。",
  "dialog.corsNote":
    "TypeSafe は現在、任意のブラウザオリジンからのリクエストをブロックしています。ライブの Jev レースには、このデプロイ先オリジンを TypeSafe の CORS 許可リストへ追加する必要があります。デモレースはキーなしで動作します。",
  "dialog.deleteKeys": "保存済みキーを削除",
  "dialog.save": "このブラウザに保存",

  "history.title": "最近の対戦",
  "history.clear": "履歴を消去",
  "history.empty": "完了したスコアはこの端末に残ります。",
  "history.modeLive": "ライブAPI",
  "history.modeDemo": "デモ",
});

const DICTIONARIES = Object.freeze({ en, ja });

export const DEFAULT_LOCALE = "en";

export function normalizeLocale(value) {
  return LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function detectLocale(languages) {
  const tags = Array.isArray(languages) ? languages : [];
  const match = tags.find((tag) =>
    LOCALES.includes(String(tag).slice(0, 2).toLowerCase()),
  );
  return match ? String(match).slice(0, 2).toLowerCase() : DEFAULT_LOCALE;
}

export function dateLocale(locale) {
  return DATE_LOCALES[normalizeLocale(locale)];
}

export function createTranslator(locale) {
  const table = DICTIONARIES[normalizeLocale(locale)];

  return function translate(key, values) {
    // English is the source dictionary, so it backstops any key a translation misses.
    const template = table[key] ?? en[key] ?? key;
    if (!values) {
      return template;
    }
    return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
      Object.hasOwn(values, name) ? String(values[name]) : placeholder,
    );
  };
}
