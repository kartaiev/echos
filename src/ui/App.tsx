import { useEffect, useMemo, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import { createPracticeSession, type IsonVoice, type PitchSettings } from "../core/practice/PracticeSession";
import type { ModeVariantKey } from "../core/theory/modeVariants";
import { GENUS_IDS, type GenusId } from "../core/theory/tuningSystems";
import { noteLabel, t } from "../i18n/translations";
import { IsonPanel } from "./IsonPanel";
import { Ladder } from "./Ladder";
import { ModePicker } from "./ModePicker";
import { ModesPage } from "./ModesPage";
import { SettingsPage } from "./SettingsPage";
import {
  loadIsonVoice,
  loadModeVariant,
  loadPitchSettings,
  saveIsonVoice,
  saveModeVariant,
  savePitchSettings,
} from "./storedSettings";

/** Plain "#name" hashes only: they survive being opened inside claude.ai and other embeds. */
const VIEW_HASHES = { practice: "#practice", modes: "#modes", settings: "#pitch" } as const;
type View = keyof typeof VIEW_HASHES;
const SETTINGS_HASH = VIEW_HASHES.settings;

function viewFromHash(): View {
  const found = (Object.keys(VIEW_HASHES) as View[]).find((view) => VIEW_HASHES[view] === location.hash);
  return found ?? "practice";
}

export function App() {
  const session = useMemo(
    () =>
      createPracticeSession({
        audio: createWebAudioOutput(),
        pitchSettings: loadPitchSettings(),
        isonVoice: loadIsonVoice(),
        modeVariant: loadModeVariant(),
      }),
    [],
  );
  // The Practice Session holds the state; the UI re-reads it after every command.
  const [, setVersion] = useState(0);
  const [view, setView] = useState<View>(viewFromHash);
  const pitch = session.pitchSettings();
  const ison = session.ison();
  const ladder = session.ladder();
  const modeVariant = session.modeVariant();

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

  return (
    <main className="practice">
      <header className="practice__header">
        <div>
          <h1>{t("app.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
        <nav className="header-nav">
          {(Object.keys(VIEW_HASHES) as View[]).map((v) => (
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
          <a className="pitch-card" href={SETTINGS_HASH}>
            <span className="pitch-card__text">
              <span className="pitch-card__label">{t("settings.referencePitch")}</span>
              <span className="pitch-card__value">{t("ladder.niPitch", { note: noteLabel(pitch.niNote), hz: pitch.niHz.toFixed(2) })}</span>
            </span>
            <span className="pitch-card__action" aria-hidden="true">{t("ladder.changePitch")} ›</span>
          </a>
          <p className="practice__hint">{t("ladder.hint")}</p>
          <Ladder
            ladder={ladder}
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
          <p className="practice__source" title={ladder.source}>
            {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
          </p>
        </section>
      )}
    </main>
  );
}
