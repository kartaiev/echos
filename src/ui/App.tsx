import { useEffect, useMemo, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import { createPracticeSession, type IsonVoice, type PitchSettings } from "../core/practice/PracticeSession";
import { GENUS_IDS, type GenusId } from "../core/theory/tuningSystems";
import { noteLabel, t } from "../i18n/translations";
import { IsonPanel } from "./IsonPanel";
import { Ladder } from "./Ladder";
import { SettingsPage } from "./SettingsPage";
import { loadIsonVoice, loadPitchSettings, saveIsonVoice, savePitchSettings } from "./storedSettings";

type View = "practice" | "settings";

/** Plain "#name" hashes only: they survive being opened inside claude.ai and other embeds. */
const SETTINGS_HASH = "#pitch";

function viewFromHash(): View {
  return location.hash === SETTINGS_HASH ? "settings" : "practice";
}

export function App() {
  const session = useMemo(
    () =>
      createPracticeSession({ audio: createWebAudioOutput(), pitchSettings: loadPitchSettings(), isonVoice: loadIsonVoice() }),
    [],
  );
  const [pitch, setPitch] = useState(() => session.pitchSettings());
  const [genus, setGenus] = useState<GenusId>(() => session.ladder().genus);
  const [ison, setIson] = useState(() => session.ison());
  const [view, setView] = useState<View>(viewFromHash);
  const ladder = session.ladder();

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function changePitch(change: Partial<PitchSettings>) {
    session.setPitchSettings(change);
    const next = session.pitchSettings();
    savePitchSettings({ referencePitch: next.referencePitch, register: next.register });
    setPitch(next);
  }

  function changeGenus(next: GenusId) {
    session.setGenus(next);
    setGenus(next);
  }

  function holdIson(degreeId: string) {
    session.setIson(degreeId);
    setIson(session.ison());
  }

  function stopIson() {
    session.stopIson();
    setIson(session.ison());
  }

  function toggleIson(degreeId: string) {
    session.toggleIson(degreeId);
    setIson(session.ison());
  }

  function changeIsonVoice(change: Partial<IsonVoice>) {
    session.setIsonVoice(change);
    const { degreeId: _, ...voice } = session.ison();
    saveIsonVoice(voice);
    setIson(session.ison());
  }

  return (
    <main className="practice">
      <header className="practice__header">
        <div>
          <h1>{t("app.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
        {view === "practice" ? (
          <a className="header-link" href={SETTINGS_HASH}>{t("nav.settings")}</a>
        ) : (
          <a className="header-link" href="#practice">{t("nav.practice")}</a>
        )}
      </header>

      {view === "settings" ? (
        <SettingsPage pitch={pitch} onChange={changePitch} onPlayNi={() => session.playDegree("Ni")} />
      ) : (
        <section className="practice__body">
          <div className="segmented segmented--genus" role="radiogroup" aria-label={t("ladder.genus")}>
            {GENUS_IDS.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={genus === id}
                className={genus === id ? "is-selected" : ""}
                onClick={() => changeGenus(id)}
              >
                {t(`genus.${id}`)}
              </button>
            ))}
          </div>
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
            onLongPress={toggleIson}
          />
          <IsonPanel
            ison={ison}
            degrees={ladder.degrees}
            onSetIson={holdIson}
            onStop={stopIson}
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
