import { useEffect, useRef, useState } from "react";
import { deckStanding, startReview, type CardProgressRecord, type CardReview, type Grade } from "../core/cards/cardReview";
import { DECK_IDS, DECKS, type Card, type DeckId } from "../core/cards/decks";
import { currentLanguage, degreeLabel, t } from "../i18n/translations";
import { fthoraGlyph, martyriaGlyphs, neumeGlyph } from "./martyriaGlyphs";

interface CardsPageProps {
  progress: CardProgressRecord;
  today: string;
  onProgress: (progress: CardProgressRecord) => void;
}

interface Running {
  deck: DeckId;
  review: CardReview;
}

const cardsOf = (deck: DeckId) => new Map(DECKS[deck].cards.map((card) => [card.id, card]));
const ids = (deck: DeckId) => DECKS[deck].cards.map((card) => card.id);

function dayLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat(currentLanguage(), { day: "numeric", month: "long" }).format(new Date(year, month - 1, date));
}

/** The sign on the face of a Card, in the Neanes font; it is the question, so it is not read out. */
function CardFace({ card }: { card: Card }) {
  if (card.kind === "neume" || card.kind === "interval") {
    return (
      <span className="flashcard__sign flashcard__sign--neume" aria-hidden="true">
        <span className="flashcard__ink">{neumeGlyph(card.kind === "neume" ? card.neume : card.sign)}</span>
      </span>
    );
  }
  if (card.kind === "fthora") {
    return (
      <span className="flashcard__sign" aria-hidden="true">
        <span className="flashcard__ink">{fthoraGlyph(card.sign)}</span>
      </span>
    );
  }
  const { letterAndSign, fthora } = martyriaGlyphs(card.degree.name, card.martyria);
  return (
    <span className="flashcard__sign flashcard__sign--martyria" aria-hidden="true">
      {letterAndSign}
      {fthora && <span className="flashcard__fthora">{fthora}</span>}
    </span>
  );
}

/** One step of the melody in words: up or down so many Degrees, or the same Degree. */
const stepLabel = (step: number) => (step === 0 ? t("cards.same") : t(step > 0 ? "cards.up" : "cards.down", { n: Math.abs(step) }));

function CardAnswer({ card }: { card: Card }) {
  if (card.kind === "neume") return <p className="flashcard__answer">{t(`neume.${card.neume}`)}</p>;
  if (card.kind === "interval") {
    const [first, ...rest] = card.steps.map(stepLabel);
    return (
      <>
        <p className="flashcard__answer">{rest.reduce((said, next) => t("cards.then", { first: said, next: next.toLowerCase() }), first!)}</p>
        {card.ornament && <p className="flashcard__also">{t("cards.withPetasti")}</p>}
      </>
    );
  }
  if (card.kind === "fthora") {
    const [named, ...others] = card.degrees;
    return (
      <>
        <p className="flashcard__answer">{t("cards.fthoraAnswer", { genus: t(`genus.${card.genus}`), degree: degreeLabel(named!.name, named!.octave) })}</p>
        {others.length > 0 && (
          <p className="flashcard__also">{t("cards.alsoOn", { degrees: others.map((d) => degreeLabel(d.name, d.octave)).join(" · ") })}</p>
        )}
      </>
    );
  }
  return (
    <p className="flashcard__answer">
      {t("cards.martyriaAnswer", { degree: degreeLabel(card.degree.name, card.degree.octave), genus: t(`genus.${card.genus}`) })}
    </p>
  );
}

/**
 * Cards on the signs of the notation, each coming back after a longer wait while it is remembered (ADR-0013). The
 * student answers in mind, turns the Card, and says whether they knew it.
 */
export function CardsPage({ progress, today, onProgress }: CardsPageProps) {
  const [running, setRunning] = useState<Running | null>(null);
  const [revealed, setRevealed] = useState(false);
  // The Review keeps its own queue; this redraws after each answer.
  const [, setAnswers] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const showButton = useRef<HTMLButtonElement>(null);
  const rememberedButton = useRef<HTMLButtonElement>(null);

  const cardId = running?.review.current() ?? null;

  // The focus follows the one thing to do next, so the whole Review runs from the keyboard.
  useEffect(() => {
    if (!running) return;
    if (cardId === null) heading.current?.focus();
    else if (revealed) rememberedButton.current?.focus();
    else showButton.current?.focus();
  }, [running, cardId, revealed]);

  function start(deck: DeckId) {
    setRunning({ deck, review: startReview({ cards: ids(deck), progress, today }) });
    setRevealed(false);
  }

  function answer(grade: Grade) {
    if (!running) return;
    running.review.answer(grade);
    onProgress(running.review.progress());
    setRevealed(false);
    setAnswers((n) => n + 1);
  }

  if (running) {
    const card = cardId ? cardsOf(running.deck).get(cardId) : undefined;
    const standing = deckStanding(ids(running.deck), progress, today);
    return (
      <section className="cards">
        <div className="cards__bar">
          <h2 ref={heading} tabIndex={-1}>
            {t(`deck.${running.deck}`)}
          </h2>
          {card && <span className="cards__left">{t("cards.left", { n: running.review.left() })}</span>}
          <button type="button" className="secondary-button" onClick={() => setRunning(null)}>
            {card ? t("cards.end") : t("cards.back")}
          </button>
        </div>
        {card ? (
          <article className="flashcard" aria-live="polite">
            <p className="flashcard__question">{t(`cards.question.${card.kind}`)}</p>
            <CardFace card={card} />
            {revealed ? (
              <>
                <div className="flashcard__reveal">
                  <CardAnswer card={card} />
                </div>
                <div className="flashcard__grades">
                  <button type="button" className="secondary-button" onClick={() => answer("forgot")}>
                    {t("cards.forgot")}
                  </button>
                  <button ref={rememberedButton} type="button" className="primary-button" onClick={() => answer("remembered")}>
                    {t("cards.remembered")}
                  </button>
                </div>
              </>
            ) : (
              <button ref={showButton} type="button" className="primary-button flashcard__show" onClick={() => setRevealed(true)}>
                {t("cards.show")}
              </button>
            )}
          </article>
        ) : (
          <div className="flashcard flashcard--done" role="status">
            <p className="flashcard__answer">{t("cards.done")}</p>
            {standing.nextDue && <p className="flashcard__also">{t("cards.next", { date: dayLabel(standing.nextDue) })}</p>}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="cards">
      <h2>{t("cards.title")}</h2>
      <p className="cards__intro">{t("cards.intro")}</p>
      {DECK_IDS.map((deck) => {
        const standing = deckStanding(ids(deck), progress, today);
        const ready = standing.due + standing.fresh > 0;
        return (
          <article key={deck} className="deck">
            <div className="deck__text">
              <h3>{t(`deck.${deck}`)}</h3>
              <p className="deck__standing">
                {t("cards.standing", { due: standing.due, fresh: standing.fresh, learned: standing.learned, total: standing.total })}
              </p>
              {!ready && standing.nextDue && <p className="deck__standing">{t("cards.next", { date: dayLabel(standing.nextDue) })}</p>}
            </div>
            <button
              type="button"
              className="primary-button"
              disabled={!ready}
              aria-label={`${t("cards.start")}: ${t(`deck.${deck}`)}`}
              onClick={() => start(deck)}
            >
              {t("cards.start")}
            </button>
          </article>
        );
      })}
    </section>
  );
}
