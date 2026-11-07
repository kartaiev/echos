import { useCallback, useEffect, useMemo, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import {
  createPracticeSession,
  type IsonVoice,
  type MetronomeSettings,
  type PitchSettings,
  type TempoPresetId,
} from "../core/practice/PracticeSession";
import type { ModeVariantKey } from "../core/theory/modeVariants";
import { GENUS_IDS, type GenusId } from "../core/theory/tuningSystems";
import { noteLabel, t } from "../i18n/translations";
import { IsonPanel } from "./IsonPanel";
import { LADDER_LAYOUTS, Ladder, type LadderLayout } from "./Ladder";
import { MetronomePanel } from "./MetronomePanel";
import { ModePicker } from "./ModePicker";
import { ModesPage } from "./ModesPage";
import { SettingsPage } from "./SettingsPage";
import {
  loadIsonVoice,
  loadLadderLayout,
  loadMetronomeSettings,
  loadModeVariant,
  loadPitchSettings,
  saveIsonVoice,
  saveLadderLayout,
  saveMetronomeSettings,
  saveModeVariant,
  savePitchSettings,
} from "./storedSettings";

/** Plain "#name" hashes only: they survive being opened inside claude.ai and other embeds. */
const VIEW_HASHES = { practice: "#practice", modes: "#modes", settings: "#pitch" } as const;
type View = keyof typeof VIEW_HASHES;
const VIEWS = Object.keys(VIEW_HASHES) as View[];

function viewFromHash(): View {
  return VIEWS.find((view) => VIEW_HASHES[view] === location.hash) ?? "practice";
}

export function App() {
  const session = useMemo(
    () =>
      createPracticeSession({
        audio: createWebAudioOutput(),
        pitchSettings: loadPitchSettings(),
        isonVoice: loadIsonVoice(),
        modeVariant: loadModeVariant(),
        metronome: loadMetronomeSettings(),
      }),
    [],
  );
  // The Practice Session holds the state; the UI re-reads it after every command.
  const [, setVersion] = useState(0);
  const [view, setView] = useState<View>(viewFromHash);
  // How the ladder is drawn is a matter of the screen, not of practice, so it lives in the UI.
  const [layout, setLayout] = useState<LadderLayout>(() => loadLadderLayout() ?? "vertical");
  const pitch = session.pitchSettings();
  const ison = session.ison();
  const ladder = session.ladder();
  const modeVariant = session.modeVariant();
  const metronome = session.metronome();
  const readCount = useCallback(() => session.metronome().count, [session]);

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  /** Runs a command on the session, then redraws. */
  function act(command: () => void) {
    command();
    setVersion((v) => v + 1);
  }

  const changePitch = (change: Partial<PitchSettings>) =>
    act(() => {
      session.setPitchSettings(change);
      const { referencePitch, register } = session.pitchSettings();
      savePitchSettings({ referencePitch, register });
    });

  /** Runs a command that may change the Mode Variant, then remembers whatever the session now has. */
  const actOnModeVariant = (command: () => void) =>
    act(() => {
      command();
      saveModeVariant(session.modeVariant());
    });

  const chooseModeVariant = (key: ModeVariantKey | null) =>
    actOnModeVariant(() => (key ? session.setModeVariant(key) : session.leaveModeVariant()));

  const changeGenus = (genus: GenusId) => actOnModeVariant(() => session.setGenus(genus));

  const changeIsonVoice = (change: Partial<IsonVoice>) =>
    act(() => {
      session.setIsonVoice(change);
      const { vowel, volume } = session.ison();
      saveIsonVoice({ vowel, volume });
    });

  /** Runs a command that may change tempo or grouping, then remembers them. */
  const actOnMetronome = (command: () => void) =>
    act(() => {
      command();
      const { chronoiPerMinute, grouping } = session.metronome();
      saveMetronomeSettings({ chronoiPerMinute, grouping });
    });

  const changeMetronome = (change: Partial<MetronomeSettings>) => actOnMetronome(() => session.setMetronome(change));
  const chooseTempoPreset = (id: TempoPresetId) => actOnMetronome(() => session.chooseTempoPreset(id));

  const changeLayout = (next: LadderLayout) => {
    setLayout(next);
    saveLadderLayout(next);
  };

  return (
    <main className="practice">
      <header className="practice__header">
        <div>
          <h1>{t("app.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
        <nav className="header-nav">
          {VIEWS.map((v) => (
            <a key={v} className="header-link" href={VIEW_HASHES[v]} aria-current={view === v ? "page" : undefined}>
              {t(`nav.${v}`)}
            </a>
          ))}
        </nav>
      </header>

      {view === "settings" ? (
        <SettingsPage pitch={pitch} onChange={changePitch} onPlayNi={() => session.playDegree("Ni")} />
      ) : view === "modes" ? (
        <ModesPage
          onPlayIntonation={(key) => session.playIntonation(key)}
          onPractise={(key) => {
            chooseModeVariant(key);
            location.hash = VIEW_HASHES.practice;
          }}
        />
      ) : (
        <section className="practice__body">
          <ModePicker choice={modeVariant} onChoose={chooseModeVariant} onLeave={() => chooseModeVariant(null)} />
          {modeVariant ? (
            // The Mode Variant sets the Genus; choosing "No Mode" brings back the Genus buttons.
            <p className="practice__genus">{t("ladder.genusOf", { genus: t(`genus.${ladder.genus}`) })}</p>
          ) : (
            <div className="segmented segmented--genus" role="radiogroup" aria-label={t("ladder.genus")}>
              {GENUS_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={ladder.genus === id}
                  className={ladder.genus === id ? "is-selected" : ""}
                  onClick={() => changeGenus(id)}
                >
                  {t(`genus.${id}`)}
                </button>
              ))}
            </div>
          )}
          <a className="pitch-card" href={VIEW_HASHES.settings}>
            <span className="pitch-card__text">
              <span className="pitch-card__label">{t("settings.referencePitch")}</span>
              <span className="pitch-card__value">{t("ladder.niPitch", { note: noteLabel(pitch.niNote), hz: pitch.niHz.toFixed(2) })}</span>
            </span>
            <span className="pitch-card__action" aria-hidden="true">{t("ladder.changePitch")} ›</span>
          </a>
          <p className="practice__hint">{t("ladder.hint")}</p>
          <div className="practice__ladder-bar">
            <span className="practice__ladder-label">{t("ladder.layout")}</span>
            <div className="segmented segmented--layout" role="radiogroup" aria-label={t("ladder.layout")}>
              {LADDER_LAYOUTS.map((l) => (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={layout === l}
                  className={layout === l ? "is-selected" : ""}
                  onClick={() => changeLayout(l)}
                >
                  {t(`layout.${l}`)}
                </button>
              ))}
            </div>
          </div>
          <Ladder
            ladder={ladder}
            layout={layout}
            isonDegreeId={ison.degreeId}
            onPlayDegree={(id) => session.playDegree(id)}
            onLongPress={(id) => act(() => session.toggleIson(id))}
          />
          <IsonPanel
            ison={ison}
            degrees={ladder.degrees}
            onSetIson={(id) => act(() => session.setIson(id))}
            onStop={() => act(() => session.stopIson())}
            onChangeVoice={changeIsonVoice}
          />
          <MetronomePanel
            metronome={metronome}
            presets={session.tempoPresets()}
            readCount={readCount}
            onStart={() => act(() => session.startMetronome())}
            onStop={() => act(() => session.stopMetronome())}
            onChange={changeMetronome}
            onChoosePreset={chooseTempoPreset}
          />
          <p className="practice__source" title={ladder.source}>
            {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
          </p>
        </section>
      )}
    </main>
  );
}
