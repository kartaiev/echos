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
import type { GenusId } from "../core/theory/tuningSystems";
import { chronosMs } from "../core/practice/metronomeSettings";
import { degreeLabel, setLanguage, t, type Language } from "../i18n/translations";
import { Ladder, type LadderLayout } from "./Ladder";
import { useMetronomeCount } from "./MetronomePanel";
import { ModesPage } from "./ModesPage";
import { PracticeSetup } from "./PracticeSetup";
import { SettingsPage } from "./SettingsPage";
import { applyTheme, type Theme } from "./theme";
import { TransportBar } from "./TransportBar";
import { useSoundHeld, useWakeLock } from "./whileSinging";
import {
  loadIsonVoice,
  loadLadderLayout,
  loadLanguage,
  loadTheme,
  loadMetronomeSettings,
  loadModeVariant,
  loadPitchSettings,
  saveIsonVoice,
  saveLadderLayout,
  saveLanguage,
  saveTheme,
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
  // How the ladder is drawn is a matter of the screen, not of practice, so it lives in the UI.
  const [layout, setLayout] = useState<LadderLayout>(() => loadLadderLayout() ?? "vertical");
  const pitch = session.pitchSettings();
  const ison = session.ison();
  const ladder = session.ladder();
  const modeVariant = session.modeVariant();
  const metronome = session.metronome();
  const readCount = useCallback(() => session.metronome().count, [session]);
  // Read aloud by screen readers: the Ison can start and stop from a long press, away from its menu.
  const [announcement, setAnnouncement] = useState("");
  const count = useMetronomeCount(metronome.running, readCount);
  const somethingSounds = ison.degreeId !== null || metronome.running;
  useWakeLock(somethingSounds);
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

  const changeLayout = (next: LadderLayout) => {
    setLayout(next);
    saveLadderLayout(next);
  };

  return (
    <main className="practice">
      <header className="practice__header">
        <div className="practice__brand">
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
        <SettingsPage
          pitch={pitch}
          onChange={changePitch}
          onPlayNi={() => session.playDegree("Ni")}
          language={language}
          onChangeLanguage={changeLanguage}
          theme={theme}
          onChangeTheme={changeTheme}
        />
      ) : view === "modes" ? (
        <ModesPage
          describe={(key) => session.describeModeVariant(key)}
          onPlayIntonation={(key) => session.playIntonation(key)}
          onPractise={(key) => {
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
            layout={layout}
            settingsHref={VIEW_HASHES.settings}
            onChooseModeVariant={chooseModeVariant}
            onChangeGenus={changeGenus}
            onToggleAttraction={(id) => act(() => session.toggleAttraction(id))}
            onChangeLayout={changeLayout}
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
