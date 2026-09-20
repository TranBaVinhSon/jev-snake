import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  CheckCircle,
  Eye,
  EyeSlash,
  GearSix,
  Translate,
  Trash,
  X,
} from "@phosphor-icons/react";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow-condensed/800.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/ibm-plex-mono/600.css";
import {
  FRONTIER_MODELS,
  fetchOpenRouterModels,
  requestJevDecision,
  requestOpenRouterDecision,
} from "./api.js";
import {
  BOARD_SIZE,
  applyMove,
  bestLocalMove,
  createGame,
  createPreviewGame,
  simulateDecision,
} from "./game.js";
import {
  LOCALES,
  LOCALE_LABELS,
  createTranslator,
  dateLocale,
  detectLocale,
  normalizeLocale,
} from "./i18n.js";

const STORAGE_KEYS = Object.freeze({
  credentials: "snakebench.credentials.v1",
  history: "snakebench.history.v1",
  locale: "snakebench.locale.v1",
  model: "snakebench.openrouter-model.v1",
});

const RACE_DURATION_MS = 40_000;
const RACE_DURATION_SECONDS = RACE_DURATION_MS / 1000;

function readStoredJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

function initialLocale() {
  const stored = window.localStorage.getItem(STORAGE_KEYS.locale);
  return stored
    ? normalizeLocale(stored)
    : detectLocale(window.navigator.languages ?? [window.navigator.language]);
}

function emptyMetrics() {
  return {
    decisions: 0,
    validDecisions: 0,
    latencyTotal: 0,
    lastLatency: 0,
    cost: 0,
    confidenceTotal: 0,
  };
}

function previewAgent(side) {
  const isJev = side === "jev";
  return {
    game: createPreviewGame(side),
    metrics: {
      decisions: 128,
      validDecisions: isJev ? 128 : 127,
      latencyTotal: (isJev ? 24 : 915) * 128,
      lastLatency: isJev ? 24 : 915,
      cost: isJev ? 0.0003 : 0.0121,
      confidenceTotal: (isJev ? 0.96 : 0) * 128,
    },
    status: "preview",
  };
}

function initialAgents() {
  return {
    jev: previewAgent("jev"),
    llm: previewAgent("llm"),
  };
}

function averageLatency(metrics) {
  return metrics.decisions > 0
    ? metrics.latencyTotal / metrics.decisions
    : 0;
}

function validRate(metrics) {
  return metrics.decisions > 0
    ? (metrics.validDecisions / metrics.decisions) * 100
    : 100;
}

function formatLatency(metrics) {
  const average = averageLatency(metrics);
  return average > 0 ? `${Math.round(average)} ms` : "--";
}

function formatCost(cost) {
  if (cost === 0) {
    return "$0.0000";
  }
  return cost < 0.0001 ? `$${cost.toFixed(6)}` : `$${cost.toFixed(4)}`;
}

function formatTimer(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function modelShortName(model) {
  const name = model?.name || model?.id || "OpenRouter model";
  return name
    .replace(/^[^:]{1,24}:\s*/, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function snakeCells(game) {
  return new Map(
    game.snake.map((position, index) => [
      `${position.x}:${position.y}`,
      index === 0 ? "head" : "body",
    ]),
  );
}

function LanguageSwitch({ locale, onChange, t }) {
  return (
    <div aria-label={t("lang.label")} className="lang-switch" role="group">
      <span aria-hidden="true" className="lang-switch-icon">
        <Translate size={19} />
      </span>
      {LOCALES.map((code) => (
        <button
          aria-pressed={code === locale}
          className={code === locale ? "active" : ""}
          key={code}
          lang={code}
          onClick={() => onChange(code)}
          type="button"
        >
          {LOCALE_LABELS[code]}
        </button>
      ))}
    </div>
  );
}

function Board({ game, accent, label, t }) {
  const occupied = useMemo(() => snakeCells(game), [game]);
  const foodKey = `${game.food.x}:${game.food.y}`;
  const cells = [];

  for (let index = 0; index < BOARD_SIZE * BOARD_SIZE; index += 1) {
    const x = index % BOARD_SIZE;
    const y = Math.floor(index / BOARD_SIZE);
    const key = `${x}:${y}`;
    const segment = occupied.get(key);
    const classNames = ["board-cell"];

    if (segment) {
      classNames.push("snake-cell", segment, accent);
    }
    if (key === foodKey) {
      classNames.push("food-cell");
    }

    cells.push(<span aria-hidden="true" className={classNames.join(" ")} key={key} />);
  }

  return (
    <div
      aria-label={t("board.aria", {
        name: label,
        score: game.score,
        state: t(game.alive ? "board.alive" : "board.crashed"),
      })}
      className={`game-board dir-${game.direction}`}
      role="img"
      style={{ "--board-size": BOARD_SIZE }}
    >
      {cells}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function AgentPanel({ accent, agent, elapsed, name, t }) {
  return (
    <article className={`agent-panel ${accent}`}>
      <header className="agent-heading">
        <div className="agent-title-wrap">
          <span aria-hidden="true" className={`agent-swatch ${accent}`} />
          <h2 title={name}>{name}</h2>
        </div>
        <p>{t("agent.eyebrow")}</p>
      </header>

      <div className="board-frame">
        <div className="board-score">
          <span>{t("metric.score")}</span>
          <strong>{agent.game.score}</strong>
        </div>
        <Board accent={accent} game={agent.game} label={name} t={t} />
      </div>

      <dl className="metrics-row">
        <Metric label={t("metric.score")} value={agent.game.score} />
        <Metric label={t("metric.moves")} value={agent.game.moves} />
        <Metric label={t("metric.latency")} value={formatLatency(agent.metrics)} />
        <Metric label={t("metric.cost")} value={formatCost(agent.metrics.cost)} />
        <Metric
          label={t("metric.validDecisions")}
          value={`${Math.round(validRate(agent.metrics))}%`}
        />
      </dl>

      <div className="agent-status">
        <span className={`status-dot ${agent.status}`} />
        <span>{t(`status.${agent.status}`)}</span>
        <span className="agent-play-time">
          {t("agent.playTime")}&nbsp; {formatTimer(elapsed)}
        </span>
      </div>
    </article>
  );
}

function Scoreboard({ elapsed, jevScore, llmScore, phase, t }) {
  const subline =
    phase === "finished"
      ? t("scoreboard.finished")
      : phase === "running"
        ? t("scoreboard.live")
        : t("scoreboard.demo");

  return (
    <aside className="scoreboard" aria-label={t("scoreboard.aria")}>
      <div className="score-block time-block">
        <span>{t("scoreboard.matchTime")}</span>
        <strong>{formatTimer(elapsed)}</strong>
        <small className="time-limit">
          {t("scoreboard.limit", { limit: formatTimer(RACE_DURATION_MS) })}
        </small>
      </div>
      <div className="score-rule" />
      <div className="score-block points-block">
        <span>{t("scoreboard.score")}</span>
        <div className="points">
          <strong className="jev-points">{jevScore}</strong>
          <i aria-hidden="true">−</i>
          <strong className="llm-points">{llmScore}</strong>
        </div>
      </div>
      <div className="score-rule" />
      <p>{subline}</p>
      <span aria-hidden="true" className="score-tail" />
    </aside>
  );
}

function DemoCallout({ onOpenSettings, t }) {
  return (
    <section className="demo-callout" role="status">
      <div className="demo-callout-copy">
        <span className="mode-badge">{t("demoCallout.badge")}</span>
        <h2>{t("demoCallout.title")}</h2>
        <p>{t("demoCallout.body")}</p>
      </div>
      <button onClick={onOpenSettings} type="button">
        <GearSix size={18} weight="bold" />
        <span>{t("demoCallout.action")}</span>
      </button>
    </section>
  );
}

function CredentialField({ getKeyHref, id, label, onChange, t, value }) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="credential-field" htmlFor={id}>
      <div className="credential-field-heading">
        <span>{label}</span>
        <a
          className="credential-help-link"
          href={getKeyHref}
          rel="noreferrer"
          target="_blank"
        >
          {t("dialog.getKey")}
          <ArrowSquareOut size={14} weight="bold" />
        </a>
      </div>
      <div className="credential-input-wrap">
        <input
          autoComplete="off"
          id={id}
          onChange={(event) => onChange(event.target.value)}
          placeholder={t("dialog.keyPlaceholder")}
          spellCheck="false"
          type={visible ? "text" : "password"}
          value={value}
        />
        <button
          aria-label={t(visible ? "dialog.hideKey" : "dialog.showKey", { label })}
          className="icon-button field-icon"
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
        </button>
      </div>
    </label>
  );
}

function SettingsDialog({
  credentials,
  history,
  locale,
  onClearHistory,
  onClose,
  onDeleteKeys,
  onSave,
  t,
}) {
  const [draft, setDraft] = useState(credentials);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <section
        aria-labelledby="settings-title"
        aria-modal="true"
        className="settings-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="dialog-header">
          <div>
            <p>{t("dialog.eyebrow")}</p>
            <h2 id="settings-title">{t("dialog.title")}</h2>
          </div>
          <button
            aria-label={t("dialog.close")}
            className="icon-button"
            onClick={onClose}
            type="button"
          >
            <X size={24} />
          </button>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              jevKey: draft.jevKey.trim(),
              openRouterKey: draft.openRouterKey.trim(),
            });
          }}
        >
          <CredentialField
            getKeyHref="https://console.typesafe.ai/keys"
            id="jev-key"
            label={t("dialog.jevKey")}
            onChange={(value) =>
              setDraft((current) => ({ ...current, jevKey: value }))
            }
            t={t}
            value={draft.jevKey}
          />
          <CredentialField
            getKeyHref="https://openrouter.ai/keys"
            id="openrouter-key"
            label={t("dialog.openRouterKey")}
            onChange={(value) =>
              setDraft((current) => ({ ...current, openRouterKey: value }))
            }
            t={t}
            value={draft.openRouterKey}
          />

          <div className="local-storage-note">
            <CheckCircle size={22} weight="fill" />
            <p>{t("dialog.storageNote")}</p>
          </div>

          <p className="cors-note">{t("dialog.corsNote")}</p>

          <div className="dialog-actions">
            <button
              className="text-button danger"
              onClick={() => {
                setDraft({ jevKey: "", openRouterKey: "" });
                onDeleteKeys();
              }}
              type="button"
            >
              <Trash size={18} /> {t("dialog.deleteKeys")}
            </button>
            <button className="primary-button compact" type="submit">
              {t("dialog.save")}
            </button>
          </div>
        </form>

        <section className="history-section">
          <div className="history-heading">
            <h3>{t("history.title")}</h3>
            {history.length > 0 ? (
              <button className="text-button" onClick={onClearHistory} type="button">
                {t("history.clear")}
              </button>
            ) : null}
          </div>
          {history.length === 0 ? (
            <p className="empty-history">{t("history.empty")}</p>
          ) : (
            <ol className="history-list">
              {history.slice(0, 5).map((match) => (
                <li key={match.id}>
                  <div>
                    <strong>
                      Jev {match.jevScore} − {match.llmScore} {match.modelName}
                    </strong>
                    <span>
                      {t(
                        match.mode === "live"
                          ? "history.modeLive"
                          : "history.modeDemo",
                      )}
                    </span>
                  </div>
                  <time dateTime={match.createdAt}>
                    {new Intl.DateTimeFormat(dateLocale(locale), {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(match.createdAt))}
                  </time>
                </li>
              ))}
            </ol>
          )}
        </section>
      </section>
    </div>
  );
}

export function App() {
  const [agents, setAgents] = useState(initialAgents);
  const [phase, setPhase] = useState("preview");
  const [elapsed, setElapsed] = useState(38_000);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locale, setLocale] = useState(initialLocale);
  const [credentials, setCredentials] = useState(() =>
    readStoredJson(STORAGE_KEYS.credentials, {
      jevKey: "",
      openRouterKey: "",
    }),
  );
  const [history, setHistory] = useState(() =>
    readStoredJson(STORAGE_KEYS.history, []),
  );
  const [models, setModels] = useState([...FRONTIER_MODELS]);
  const [modelsStatus, setModelsStatus] = useState("loading");
  const [selectedModelId, setSelectedModelId] = useState(
    () =>
      window.localStorage.getItem(STORAGE_KEYS.model) ||
      FRONTIER_MODELS[0].id,
  );
  const [errors, setErrors] = useState({});
  // A notice outlives a language switch, so it is held as a translation key and
  // resolved at render time rather than stored as a finished sentence.
  const [notice, setNotice] = useState("");
  const controllerRef = useRef(null);
  const stopRequestedRef = useRef(false);

  const t = useMemo(() => createTranslator(locale), [locale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t("meta.title");
  }, [locale, t]);

  useEffect(() => {
    const controller = new AbortController();
    fetchOpenRouterModels(controller.signal)
      .then((nextModels) => {
        setModels(nextModels);
        setModelsStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setModelsStatus("fallback");
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      controllerRef.current?.abort();
    },
    [],
  );

  const selectedModel = useMemo(
    () =>
      models.find((model) => model.id === selectedModelId) ||
      FRONTIER_MODELS.find((model) => model.id === selectedModelId) || {
        id: selectedModelId,
        name: selectedModelId,
        pricing: { prompt: 0, completion: 0 },
      },
    [models, selectedModelId],
  );

  const modelGroups = useMemo(() => {
    const catalog = new Map(models.map((model) => [model.id, model]));
    const latest = FRONTIER_MODELS.map((model) => catalog.get(model.id) ?? model);
    const latestIds = new Set(latest.map((model) => model.id));
    const others = models.filter((model) => !latestIds.has(model.id));

    if (!latestIds.has(selectedModelId) && !catalog.has(selectedModelId)) {
      others.unshift(selectedModel);
    }

    return { latest, others };
  }, [models, selectedModel, selectedModelId]);

  const bothKeysStored = Boolean(
    credentials.jevKey && credentials.openRouterKey,
  );

  function changeLocale(nextLocale) {
    setLocale(nextLocale);
    window.localStorage.setItem(STORAGE_KEYS.locale, nextLocale);
  }

  function publishAgent(side, snapshot) {
    setAgents((current) => ({ ...current, [side]: snapshot }));
  }

  async function runAgent({ side, mode, signal, seed }) {
    let game = createGame(seed);
    let metrics = emptyMetrics();
    let status = "running";
    publishAgent(side, { game, metrics, status });

    while (!signal.aborted && game.alive) {
      let decision;

      try {
        if (mode === "demo") {
          decision = await simulateDecision({ actor: side, game, signal });
        } else if (side === "jev") {
          decision = await requestJevDecision({
            apiKey: credentials.jevKey,
            game,
            signal,
          });
        } else {
          decision = await requestOpenRouterDecision({
            apiKey: credentials.openRouterKey,
            game,
            model: selectedModel.id,
            pricing: selectedModel.pricing,
            signal,
          });
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          break;
        }
        status = "error";
        setErrors((current) => ({
          ...current,
          [side]: describeError(error),
        }));
        break;
      }

      const requestedDirection = decision.outputValid
        ? decision.direction
        : bestLocalMove(game);
      const move = applyMove(game, requestedDirection);
      game = move.game;
      metrics = {
        decisions: metrics.decisions + 1,
        validDecisions:
          metrics.validDecisions +
          (decision.outputValid && move.accepted ? 1 : 0),
        latencyTotal: metrics.latencyTotal + decision.latency,
        lastLatency: decision.latency,
        cost: metrics.cost + decision.cost,
        confidenceTotal: metrics.confidenceTotal + decision.confidence,
      };
      status = game.alive ? "running" : "crashed";
      publishAgent(side, { game, metrics, status });
    }

    if (status === "running") {
      status = "finished";
    }

    const snapshot = { game, metrics, status };
    publishAgent(side, snapshot);
    return snapshot;
  }

  function storeMatch({ jev, llm, mode }) {
    const entry = {
      id: `${Date.now()}-${Math.round(Math.random() * 10000)}`,
      createdAt: new Date().toISOString(),
      mode,
      modelId: selectedModel.id,
      modelName: modelShortName(selectedModel),
      jevScore: jev.game.score,
      llmScore: llm.game.score,
      jevLatency: averageLatency(jev.metrics),
      llmLatency: averageLatency(llm.metrics),
    };
    const nextHistory = [entry, ...history].slice(0, 10);
    setHistory(nextHistory);
    writeStoredJson(STORAGE_KEYS.history, nextHistory);
  }

  async function startRace() {
    const mode = bothKeysStored ? "live" : "demo";
    const controller = new AbortController();
    const startedAt = performance.now();
    const seed = Math.floor(Date.now() / 1000);
    controllerRef.current = controller;
    stopRequestedRef.current = false;
    setErrors({});
    // In demo mode the callout above already says the race is simulated.
    setNotice(mode === "demo" ? "" : "notice.liveStarted");
    setPhase("running");
    setElapsed(0);

    const timer = window.setInterval(() => {
      setElapsed(Math.min(performance.now() - startedAt, RACE_DURATION_MS));
    }, 100);
    const deadline = window.setTimeout(() => {
      controller.abort();
    }, RACE_DURATION_MS);

    const [jev, llm] = await Promise.all([
      runAgent({ side: "jev", mode, signal: controller.signal, seed }),
      runAgent({ side: "llm", mode, signal: controller.signal, seed }),
    ]);

    window.clearInterval(timer);
    window.clearTimeout(deadline);
    setElapsed((current) =>
      stopRequestedRef.current ? current : RACE_DURATION_MS,
    );
    setPhase("finished");
    controllerRef.current = null;
    storeMatch({ jev, llm, mode });

    if (!stopRequestedRef.current) {
      const failed = jev.status === "error" || llm.status === "error";
      setNotice(
        failed
          ? "notice.apiFailed"
          : mode === "demo"
            ? "notice.demoComplete"
            : "notice.liveComplete",
      );
    }
  }

  function stopRace() {
    stopRequestedRef.current = true;
    controllerRef.current?.abort();
    setNotice("notice.stopped");
  }

  function saveCredentials(nextCredentials) {
    setCredentials(nextCredentials);
    writeStoredJson(STORAGE_KEYS.credentials, nextCredentials);
    setSettingsOpen(false);
    setNotice(
      nextCredentials.jevKey && nextCredentials.openRouterKey
        ? "notice.keysSavedBoth"
        : "notice.keysSavedPartial",
    );
  }

  function deleteKeys() {
    const cleared = { jevKey: "", openRouterKey: "" };
    setCredentials(cleared);
    window.localStorage.removeItem(STORAGE_KEYS.credentials);
    setNotice("notice.keysDeleted");
  }

  function clearHistory() {
    setHistory([]);
    window.localStorage.removeItem(STORAGE_KEYS.history);
  }

  const jevLatency = averageLatency(agents.jev.metrics);
  const llmLatency = averageLatency(agents.llm.metrics);
  const ratio =
    jevLatency > 0 && llmLatency > 0 ? Math.max(1, llmLatency / jevLatency) : 1;
  const result =
    Object.keys(errors).length > 0
      ? {
          lead: t("result.incompleteLead"),
          accent: t("result.incompleteAccent"),
          tail: "",
        }
      : ratio >= 1
        ? {
            lead: t("result.fasterLead", { name: "Jev" }),
            accent: `${Math.round(ratio)}×`,
            tail: t("result.fasterTail"),
          }
        : {
            lead: t("result.fasterLead", {
              name: modelShortName(selectedModel),
            }),
            accent: `${Math.round(1 / ratio)}×`,
            tail: t("result.fasterTail"),
          };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <h1 lang="en">SNAKE<span>BENCH</span></h1>
          <p>
            {t("brand.taglineLine1")}
            <br />
            {t("brand.taglineLine2")}
          </p>
        </div>
        <div className="topbar-actions">
          <LanguageSwitch locale={locale} onChange={changeLocale} t={t} />
          <button
            className="settings-button"
            onClick={() => setSettingsOpen(true)}
            type="button"
          >
            <GearSix size={24} weight="bold" />
            <span>{t("settings.button")}</span>
            <i aria-hidden="true" />
            <small>
              {t(bothKeysStored ? "settings.keysStored" : "settings.keysLocal")}
            </small>
          </button>
        </div>
      </header>

      <section className="race-controls" aria-label={t("controls.aria")}>
        <label className="model-field" htmlFor="model-select">
          <span>
            {t("controls.modelLabel")}
            <small>
              {modelsStatus === "loading"
                ? t("controls.catalogLoading")
                : modelsStatus === "fallback"
                  ? t("controls.catalogFallback")
                  : t("controls.catalogCount", { count: models.length })}
            </small>
          </span>
          <select
            disabled={phase === "running"}
            id="model-select"
            onChange={(event) => {
              setSelectedModelId(event.target.value);
              window.localStorage.setItem(STORAGE_KEYS.model, event.target.value);
            }}
            value={selectedModelId}
          >
            <optgroup label={t("controls.groupLatest")}>
              {modelGroups.latest.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.id}
                </option>
              ))}
            </optgroup>
            {modelGroups.others.length > 0 ? (
              <optgroup label={t("controls.groupAll")}>
                {modelGroups.others.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.id}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>

        <button
          className={`primary-button ${phase === "running" ? "stop" : ""}`}
          onClick={phase === "running" ? stopRace : startRace}
          type="button"
        >
          {t(phase === "running" ? "controls.stop" : "controls.start")}
        </button>

        <div className="race-explainer">
          <span className={`mode-badge ${bothKeysStored ? "live" : "demo"}`}>
            {t(bothKeysStored ? "controls.badgeLive" : "controls.badgeDemo")}
          </span>
          <p>
            {t("controls.explainerLine1")}
            <br />
            {t("controls.explainerLine2", { seconds: RACE_DURATION_SECONDS })}
          </p>
        </div>
      </section>

      {bothKeysStored ? null : (
        <DemoCallout onOpenSettings={() => setSettingsOpen(true)} t={t} />
      )}

      {notice ? (
        <div className="notice-bar" role="status">
          <span>{t(notice)}</span>
          <button
            aria-label={t("notice.dismiss")}
            onClick={() => setNotice("")}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div className="error-bar" role="alert">
          {errors.jev ? (
            <span>
              <strong>Jev:</strong> {errorText(t, errors.jev)}
            </span>
          ) : null}
          {errors.llm ? (
            <span>
              <strong>OpenRouter:</strong> {errorText(t, errors.llm)}
            </span>
          ) : null}
        </div>
      ) : null}

      <section className="race-arena" aria-label={t("arena.aria")}>
        <AgentPanel
          accent="jev"
          agent={agents.jev}
          elapsed={elapsed}
          name="JEV"
          t={t}
        />
        <Scoreboard
          elapsed={elapsed}
          jevScore={agents.jev.game.score}
          llmScore={agents.llm.game.score}
          phase={phase}
          t={t}
        />
        <AgentPanel
          accent="llm"
          agent={agents.llm}
          elapsed={elapsed}
          name={modelShortName(selectedModel).toUpperCase()}
          t={t}
        />
      </section>

      <section className="result-strip" aria-live="polite">
        <div className="result-copy">
          <p>
            {t(
              phase === "running"
                ? "result.eyebrowLive"
                : "result.eyebrowSoFar",
            )}
          </p>
          <h2>
            {result.lead} <em>{result.accent}</em> {result.tail}
          </h2>
        </div>
        <div className="result-meta">
          <p>
            {t(
              phase === "preview" ? "result.previewNote" : "result.storedNote",
            )}
          </p>
          <time dateTime={new Date().toISOString()}>
            {new Intl.DateTimeFormat(dateLocale(locale), {
              month: "short",
              day: "numeric",
              year: "numeric",
            }).format(new Date())}
          </time>
        </div>
      </section>

      {settingsOpen ? (
        <SettingsDialog
          credentials={credentials}
          history={history}
          locale={locale}
          onClearHistory={clearHistory}
          onClose={() => setSettingsOpen(false)}
          onDeleteKeys={deleteKeys}
          onSave={saveCredentials}
          t={t}
        />
      ) : null}
    </main>
  );
}

// API failures the app raises itself carry a code, so they can be re-translated
// when the language changes. Anything relayed from an API keeps its own wording.
function describeError(error) {
  if (error?.code) {
    return { key: `error.${error.code}` };
  }
  return error instanceof Error && error.message
    ? { message: error.message }
    : { key: "error.unknown" };
}

function errorText(t, descriptor) {
  return descriptor.key ? t(descriptor.key) : descriptor.message;
}
