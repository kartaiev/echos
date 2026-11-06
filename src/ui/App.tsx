import { useEffect, useMemo, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import { createPracticeSession, REGISTER_OCTAVES, type PitchSettings } from "../core/practice/PracticeSession";
import { transposeNote } from "../core/theory/westernPitch";
import { t } from "../i18n/translations";
import { Ladder } from "./Ladder";
import { noteLabel, SettingsPage } from "./SettingsPage";
import { loadPitchSettings, savePitchSettings } from "./storedSettings";

type View = "practice" | "settings";

function viewFromHash(): View {
  return location.hash === "#/settings" ? "settings" : "practice";
}

export function App() {
  const session = useMemo(() => createPracticeSession({ audio: createWebAudioOutput(), pitchSettings: loadPitchSettings() }), []);
  const [pitch, setPitch] = useState(() => session.pitchSettings());
  const [view, setView] = useState<View>(viewFromHash);
  const ladder = session.ladder();

  useEffect(() => {
    const onHashChange = () => setView(viewFromHash());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function changePitch(next: PitchSettings) {
    session.setReferencePitch(next.referencePitch);
    session.setRegister(next.register);
    savePitchSettings(next);
    setPitch(session.pitchSettings());
  }

  const niNote = noteLabel(transposeNote(pitch.referencePitch.note, REGISTER_OCTAVES[pitch.register]));

  return (
    <main className="practice">
      <header className="practice__header">
        <div>
          <h1>{t("app.title")}</h1>
          <p>{t("app.tagline")}</p>
        </div>
        {view === "practice" ? (
          <a className="header-link" href="#/settings">{t("nav.settings")}</a>
        ) : (
          <a className="header-link" href="#/">{t("nav.practice")}</a>
        )}
      </header>

      {view === "settings" ? (
        <SettingsPage settings={pitch} onChange={changePitch} onPlayNi={() => session.playDegree("Ni")} />
      ) : (
        <section className="practice__body">
          <h2>{t(`genus.${ladder.genus}`)}</h2>
          <p className="practice__hint">
            {t("ladder.hint")}{" "}
            <a href="#/settings">{t("ladder.niPitch", { note: niNote, hz: pitch.niHz.toFixed(2) })}</a>
          </p>
          <Ladder ladder={ladder} onPlayDegree={(id) => session.playDegree(id)} />
          <p className="practice__source" title={ladder.source}>
            {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
          </p>
        </section>
      )}
    </main>
  );
}
