import { useMemo } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import { createPracticeSession } from "../core/practice/PracticeSession";
import { t } from "../i18n/translations";
import { Ladder } from "./Ladder";

export function App() {
  const session = useMemo(() => createPracticeSession({ audio: createWebAudioOutput() }), []);
  const ladder = session.ladder();

  return (
    <main className="practice">
      <header className="practice__header">
        <h1>{t("app.title")}</h1>
        <p>{t("app.tagline")}</p>
      </header>
      <section className="practice__body">
        <h2>{t(`genus.${ladder.genus}`)}</h2>
        <p className="practice__hint">{t("ladder.hint")}</p>
        <Ladder ladder={ladder} onPlayDegree={(id) => session.playDegree(id)} />
        <p className="practice__source" title={ladder.source}>
          {t("ladder.tuning", { name: t(`tuning.${ladder.tuningSystemId}`), moria: ladder.moriaPerOctave })}
        </p>
      </section>
    </main>
  );
}
