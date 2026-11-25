import { useEffect, useState } from "react";
import { onSoundLog, soundLogLines } from "../audio/soundLog";
import { soundStatus } from "../audio/webAudioOutput";
import { t } from "../i18n/translations";

/**
 * What the sound went through, for a singer to copy and send when it fails on a phone nobody else can look at.
 * Closed until asked for; while open it follows the sound as it changes.
 */
export function SoundLog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    const refresh = () => setText([`now: ${soundStatus()}`, `${navigator.userAgent}`, "", ...soundLogLines()].join("\n"));
    refresh();
    const stop = onSoundLog(refresh);
    const timer = window.setInterval(refresh, 1000);
    return () => {
      stop();
      window.clearInterval(timer);
    };
  }, [open]);

  function copy() {
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  }

  return (
    <details className="settings__group sound-log" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>{t("settings.soundLog")}</summary>
      <p className="settings__help">{t("settings.soundLogHelp")}</p>
      <button type="button" className="secondary-button sound-log__copy" onClick={copy}>
        {copied ? t("settings.soundLogCopied") : t("settings.soundLogCopy")}
      </button>
      <pre className="sound-log__text">{text}</pre>
    </details>
  );
}
