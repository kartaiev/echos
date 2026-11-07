import type { PracticeSession, TempoPreset } from "../core/practice/PracticeSession";
import { MELOS_IDS, MODE_IDS, type ModeVariantKey } from "../core/theory/modeVariants";
import type { DegreePosition } from "../core/theory/scale";
import { GENUS_IDS, type GenusId, type ReviewStatus } from "../core/theory/tuningSystems";
import { degreeLabel, t } from "../i18n/translations";
import { ModeName } from "./ModeName";
import { intonationText } from "./intonationText";
import { martyriaGlyphs } from "./martyriaGlyphs";

interface TheoryTablesPageProps {
  session: PracticeSession;
}

const REPOSITORY = "https://github.com/kartaiev/echos";
const label = ({ name, octave }: DegreePosition) => degreeLabel(name, octave);

/** A new GitHub issue about one table, with its values and source filled in for the reviewer to correct. */
function remarkUrl(subject: string, values: string, source: string): string {
  const body = [`Values: ${values}`, `Source: ${source}`, "", "What should it be, and according to which source?", ""].join("\n");
  const query = new URLSearchParams({ title: `Theory remark: ${subject}`, body, labels: "needs-triage" });
  return `${REPOSITORY}/issues/new?${query}`;
}

function Status({ status }: { status: ReviewStatus }) {
  return <span className={`tables__status is-${status}`}>{t(`review.${status}`)}</span>;
}

function Sourced({ source, status, remark }: { source: string; status: ReviewStatus; remark: string }) {
  return (
    <p className="tables__source">
      <Status status={status} /> {source}{" "}
      <a href={remark} target="_blank" rel="noreferrer">
        {t("tables.remark")}
      </a>
    </p>
  );
}

function GenusTable({ session, genus }: { session: PracticeSession; genus: GenusId }) {
  const scale = session.describeScale(genus);
  const name = t(`genus.${genus}`);
  const cycle = `${t(`degree.${scale.intervals.value.from}`)}: ${scale.intervals.value.intervals.join(", ")}`;
  return (
    <article className="tables__card">
      <div className="tables__heading">
        <h3>{name}</h3>
        <button type="button" className="secondary-button" onClick={() => session.playScale(genus)}>
          {t("tables.playScale")}
        </button>
      </div>
      <p className="tables__cycle">{t("tables.cycle", { cycle })}</p>
      <Sourced
        source={scale.intervals.source}
        status={scale.intervals.reviewStatus}
        remark={remarkUrl(`${name} intervals`, cycle, scale.intervals.source)}
      />
      <table className="tables__degrees">
        <thead>
          <tr>
            <th scope="col">{t("tables.degree")}</th>
            <th scope="col">{t("tables.martyria")}</th>
            <th scope="col">{t("tables.moria")}</th>
            <th scope="col">{t("tables.toNext")}</th>
            <th scope="col">{t("tables.hz")}</th>
            <th scope="col">
              <span className="visually-hidden">{t("tables.play")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {[...scale.degrees].reverse().map((d) => {
            const glyphs = martyriaGlyphs(d.name, d.martyria);
            return (
              <tr key={d.id}>
                <th scope="row">{label(d)}</th>
                <td className="tables__martyria" aria-hidden="true">
                  <span className="ladder__martyria">
                    {glyphs.letterAndSign}
                    {glyphs.fthora && <span className="ladder__fthora">{glyphs.fthora}</span>}
                  </span>
                </td>
                <td>{d.moria}</td>
                <td>{d.moriaToNext ?? ""}</td>
                <td>{d.frequency.toFixed(2)}</td>
                <td>
                  <button
                    type="button"
                    className="tables__play"
                    aria-label={t("ladder.playDegree", { degree: label(d) })}
                    onClick={() => session.playDegreeIn(genus, d.id)}
                  >
                    {t("tables.play")}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Sourced
        source={scale.martyriaSource}
        status="unreviewed"
        remark={remarkUrl(
          `${name} Martyria`,
          scale.degrees.map((d) => `${d.id} ${d.martyria.rootSign}${d.martyria.fthora ? ` + ${d.martyria.fthora} fthora` : ""}`).join("; "),
          scale.martyriaSource,
        )}
      />
      {scale.attractions.map(({ value, source, reviewStatus }) => (
        <div key={value.id} className="tables__attraction">
          <p>{t(`attraction.${value.id}`)}</p>
          <Sourced
            source={source}
            status={reviewStatus}
            remark={remarkUrl(t(`attraction.${value.id}`), `${value.moria} moria`, source)}
          />
        </div>
      ))}
    </article>
  );
}

function ModeVariantRow({ session, variantKey }: { session: PracticeSession; variantKey: ModeVariantKey }) {
  const variant = session.describeModeVariant(variantKey);
  const title = `${t(`mode.${variantKey.mode}`)} ${t(`melos.${variantKey.melos}`)}`;
  const steps = variant.intonation?.steps.map((s) => `${label(s.degree)} ${s.chronoi}`).join(" · ");
  const cadences = variant.cadences.value.map((c) => `${t(`modes.cadenceKind.${c.kind}`)} ${label(c.degree)}`).join(", ");
  const values = [
    `${t("modes.genus")} ${t(`genus.${variant.genus}`)}`,
    `${t("modes.base")} ${label(variant.base)}`,
    `${t("modes.dominants")} ${variant.dominants.map(label).join(", ")}`,
    variant.intonation ? `${t("modes.intonation")} ${variant.intonation.text}: ${steps}` : `${t("modes.intonation")} -`,
  ].join("; ");
  return (
    <div className="tables__variant">
      <h4>{t(`melos.${variantKey.melos}`)}</h4>
      <dl>
        <dt>{t("modes.genus")}</dt>
        <dd>{t(`genus.${variant.genus}`)}</dd>
        <dt>{t("modes.base")}</dt>
        <dd>{label(variant.base)}</dd>
        <dt>{t("modes.dominants")}</dt>
        <dd>{variant.dominants.map(label).join(", ")}</dd>
        <dt>{t("modes.intonation")}</dt>
        <dd>
          {variant.intonation ? (
            <>
              {intonationText(variant.intonation)}
              <span className="tables__steps">{t("tables.intonationSteps", { steps: steps! })}</span>
            </>
          ) : (
            <span className="mode-card__missing">{t("modes.noSource")}</span>
          )}
        </dd>
      </dl>
      {variant.intonation && (
        <button type="button" className="secondary-button" onClick={() => session.playIntonation(variantKey)}>
          {t("modes.playIntonation")}
        </button>
      )}
      <Sourced source={variant.source} status={variant.reviewStatus} remark={remarkUrl(title, values, variant.source)} />
      <p className="tables__cadences">
        {t("modes.cadences")}: {cadences}
      </p>
      <Sourced
        source={variant.cadences.source}
        status={variant.cadences.reviewStatus}
        remark={remarkUrl(`${title} Cadences`, cadences, variant.cadences.source)}
      />
    </div>
  );
}

function TempoRow({ preset }: { preset: TempoPreset }) {
  const { minChronoiPerMinute: min, maxChronoiPerMinute: max } = preset.value;
  const range = max === null ? `${min}+` : `${min}–${max}`;
  const name = t(`tempo.${preset.id}`);
  return (
    <li className="tables__tempo">
      <span>
        {name}: {t("metronome.cpm", { n: range })}
      </span>
      <Sourced source={preset.source} status={preset.reviewStatus} remark={remarkUrl(`Tempo Preset ${name}`, range, preset.source)} />
    </li>
  );
}

/**
 * Every value the app sings or shows, read from the same data the practice screen uses, with its source and review
 * status, so a reviewer can listen, check and leave a remark as a GitHub issue.
 */
export function TheoryTablesPage({ session }: TheoryTablesPageProps) {
  const pmc = session.describeScale("diatonic");
  return (
    <section className="tables">
      <h2>{t("tables.title")}</h2>
      <p className="tables__intro">{t("tables.intro")}</p>

      <h2>{t("tables.tuningSystem", { name: t(`tuning.${pmc.tuningSystemId}`), moria: pmc.moriaPerOctave })}</h2>
      {GENUS_IDS.map((genus) => (
        <GenusTable key={genus} session={session} genus={genus} />
      ))}

      <h2>{t("modes.title")}</h2>
      {MODE_IDS.map((mode) => (
        <article key={mode} className="tables__card">
          <h3>
            <ModeName mode={mode} />
          </h3>
          {MELOS_IDS.map((melos) => (
            <ModeVariantRow key={melos} session={session} variantKey={{ mode, melos }} />
          ))}
        </article>
      ))}

      <h2>{t("metronome.presets")}</h2>
      <ul className="tables__card tables__tempos">
        {session.tempoPresets().map((preset) => (
          <TempoRow key={preset.id} preset={preset} />
        ))}
      </ul>
    </section>
  );
}
