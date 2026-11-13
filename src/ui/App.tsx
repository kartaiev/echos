import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createWebAudioOutput } from "../audio/webAudioOutput";
import {
  createPracticeSession,
  type IsonVoice,
  type MetronomeSettings,
  type PitchSettings,
  type TempoPresetId,
} from "../core/practice/PracticeSession";
import type { ModeVariantKey } from "../core/theory/modeVariants";
import type { GenusId } from "../core/theory/tuningSystems";
import { chronosMs } from "../core/practice/metronomeSettings";
import { degreeLabel, setLanguage, t, type Language } from "../i18n/translations";
import { Ladder, useLadderLayout } from "./Ladder";
import { useMetronomeCount } from "./MetronomePanel";
import { ModesPage } from "./ModesPage";
import { CardsPage } from "./CardsPage";
import { localToday, type CardProgressRecord } from "../core/cards/cardReview";
import { FthoraBar, type FthoraPlacing } from "./FthoraBar";
import { PracticeSetup } from "./PracticeSetup";
import { SettingsPage } from "./SettingsPage";
import { applyTheme, type Theme } from "./theme";
import { TransportBar } from "./TransportBar";
import { useSoundHeld, useWakeLock } from "./whileSinging";
import { useVoiceCheck } from "./voiceCheck";
import {
  loadCardProgress,
  loadIsonVoice,
  loadLanguage,
  loadTheme,
  loadMetronomeSettings,
  loadModeVariant,
  loadPitchSettings,
  saveCardProgress,
  saveIsonVoice,
  saveLanguage,
  saveTheme,
  saveMetronomeSettings,
  saveModeVariant,
  savePitchSettings,
} from "./storedSettings";

/** Plain "#name" hashes only: they survive being opened inside claude.ai and other embeds. */
const VIEW_HASHES = { practice: "#practice", modes: "#modes", cards: "#cards", settings: "#pitch" } as const;
type View = keyof typeof VIEW_HASHES;
const VIEWS = Object.keys(VIEW_HASHES) as View[];

function viewFromHash(): View {
  return VIEWS.find((view) => VIEW_HASHES[view] === location.hash) ?? "practice";
}

/** The saved choice, else Greek for a Greek-speaking device, else English. */
function startLanguage(): Language {
  const language = loadLanguage() ?? (navigator.language.toLowerCase().startsWith("el") ? "el" : "en");
  setLanguage(language);
  document.documentElement.lang = language;
  return language;
}

export function App() {
  const [language, setLanguageState] = useState<Language>(startLanguage);
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = loadTheme() ?? "system";
    applyTheme(saved);
    return saved;
  });
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
  // After "Practise" on a Mode card the focus goes to the setup line, which reads out the Mode just chosen.
  const focusSetup = useRef(false);
  useEffect(() => {
    if (view !== "practice" || !focusSetup.current) return;
    focusSetup.current = false;
    document.querySelector<HTMLElement>(".setup__summary")?.focus({ preventScroll: true });
  }, [view]);
  const [cardProgress, setCardProgress] = useState<CardProgressRecord>(() => loadCardProgress() ?? {});
  // How the ladder is drawn is a matter of the screen, not of practice, so it lives in the UI.
  const layout = useLadderLayout();
  const pitch = session.pitchSettings();
  const ison = session.ison();
  const ladder = session.ladder();
  const modeVariant = session.modeVariant();
  const metronome = session.metronome();
  const readCount = useCallback(() => session.metronome().count, [session]);
  // Read aloud by screen readers: the Ison can start and stop from a long press, away from its menu.
  const [announcement, setAnnouncement] = useState("");
  const count = useMetronomeCount(metronome.running, readCount);
  // Placing a Fthora: first the Degree, then the Genus. Null when not placing.
  const [placing, setPlacing] = useState<FthoraPlacing | null>(null);
  const somethingSounds = ison.degreeId !== null || metronome.running;
  // Voice Check listens only on the practice view; it stops when the student leaves it.
  const [listening, setListening] = useState(false);
  const voice = useVoiceCheck(listening && view === "practice", (hz) => session.readVoice(hz));
  useWakeLock(somethingSounds || (listening && view === "practice"));
  const sound = useSoundHeld(somethingSounds, () => session.soundIsHeld());

  useEffect(() => {
    // Each view opens at its top, not at the scroll position the last one was left at.
    const onHashChange = () => {
      setView(viewFromHash());
      window.scrollTo(0, 0);
    };
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

  /** Every string is read through t(), so switching the language and redrawing is enough. */
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    document.documentElement.lang = next;
    saveLanguage(next);
    setLanguageState(next);
  };

  const changeTheme = (next: Theme) => {
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  };

  /** Runs an Ison command, then says where the Ison now is. */
  const actOnIson = (command: () => void) =>
    act(() => {
      command();
      const id = session.ison().degreeId;
      const degree = session.ladder().degrees.find((d) => d.id === id);
      setAnnouncement(degree ? t("ison.announceOn", { degree: degreeLabel(degree.name, degree.octave) }) : t("ison.announceOff"));
    });

  const toggleMetronome = () => act(() => (session.metronome().running ? session.stopMetronome() : session.startMetronome()));

  // Space starts and stops the metronome on the practice view, unless a control has the focus and wants the key.
  useEffect(() => {
    if (view !== "practice") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest("button, input, select, textarea, a, summary")) return;
      e.preventDefault();
      toggleMetronome();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const resumeSound = () =>
    act(() => {
      session.restartSound();
      sound.clear();
    });

  return (
    <main className="practice">
      <header className="practice__header">
        <h1>{t("app.title")}</h1>
        <nav className="header-nav">
          {VIEWS.map((v) => (
            <a key={v} className="header-link" href={VIEW_HASHES[v]} aria-current={view === v ? "page" : undefined}>
              {t(`nav.${v}`)}
            </a>
          ))}
        </nav>
      </header>

      {view === "settings" ? (
        <SettingsPage
          pitch={pitch}
          onChange={changePitch}
          onPlayNi={() => session.playDegree("Ni")}
          language={language}
          onChangeLanguage={changeLanguage}
          theme={theme}
          onChangeTheme={changeTheme}
        />
      ) : view === "cards" ? (
        <CardsPage
          progress={cardProgress}
          today={localToday()}
          onProgress={(progress) => {
            setCardProgress(progress);
            saveCardProgress(progress);
          }}
        />
      ) : view === "modes" ? (
        <ModesPage
          describe={(key) => session.describeModeVariant(key)}
          onPlayIntonation={(key) => session.playIntonation(key)}
          onPractise={(key) => {
            focusSetup.current = true;
            chooseModeVariant(key);
            location.hash = VIEW_HASHES.practice;
          }}
        />
      ) : (
        <section className="practice__body">
          <PracticeSetup
            modeVariant={modeVariant}
            ladder={ladder}
            pitch={pitch}
            settingsHref={VIEW_HASHES.settings}
            onChooseModeVariant={chooseModeVariant}
            onChangeGenus={changeGenus}
            onToggleAttraction={(id) => act(() => session.toggleAttraction(id))}
            fthoraActive={placing !== null || ladder.fthora !== null}
            onFthora={() => setPlacing(placing ? null : { step: "degree" })}
            listening={listening && voice.problem === null}
            onListen={() => setListening(!(listening && voice.problem === null))}
          />
          {listening && voice.problem && (
            <p className="voice-notice" role="status">
              {t(voice.problem === "refused" ? "voice.refused" : "voice.unavailable")}
            </p>
          )}
          <FthoraBar
            placing={placing}
            fthora={ladder.fthora}
            degrees={ladder.degrees}
            choices={placing?.step === "genus" ? session.fthoraChoices(placing.degreeId) : []}
            onChoose={(sign) => {
              if (placing?.step !== "genus") return;
              act(() => session.placeFthora(placing.degreeId, sign));
              setPlacing(null);
            }}
            onCancel={() => setPlacing(null)}
            onShow={(shown) => act(() => session.showFthora(shown))}
            onRemove={() => act(() => session.clearFthora())}
          />
          <Ladder
            ladder={ladder}
            layout={layout}
            isonDegreeId={ison.degreeId}
            beat={count}
            chronosMs={chronosMs(metronome.chronoiPerMinute)}
            onPlayDegree={(id) => {
              session.playDegree(id);
              sound.checkSoon();
            }}
            onLongPress={(id) => actOnIson(() => session.toggleIson(id))}
            onSpace={toggleMetronome}
            choosing={placing !== null}
            onChoose={(id) => setPlacing({ step: "genus", degreeId: id })}
            voice={voice.reading}
          />
          <TransportBar
            ison={ison}
            degrees={ladder.degrees}
            metronome={metronome}
            count={count}
            presets={session.tempoPresets()}
            soundHeld={sound.held}
            onResumeSound={resumeSound}
            onSetIson={(id) => actOnIson(() => session.setIson(id))}
            onStopIson={() => actOnIson(() => session.stopIson())}
            onChangeVoice={changeIsonVoice}
            onStartMetronome={() => act(() => session.startMetronome())}
            onStopMetronome={() => act(() => session.stopMetronome())}
            onChangeMetronome={changeMetronome}
            onChoosePreset={chooseTempoPreset}
          />
          <p className="visually-hidden" aria-live="polite">
            {announcement}
          </p>
        </section>
      )}
    </main>
  );
}
