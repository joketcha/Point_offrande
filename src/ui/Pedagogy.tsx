/**
 * RÈGLE PÉDAGOGIQUE ABSOLUE — ne jamais donner immédiatement la réponse.
 * En cas d'erreur : 1) conséquence  2) question  3) raisonnement demandé
 * 4) indices progressifs  5) méthode  6) bonne pratique  7) refaire la décision.
 */
import { useState, type ReactNode } from 'react';
import { MENTORS } from '../data/mentors';
import type { MissionMeta } from '../data/missions';
import { ERROR_LABEL, SKILL_LABEL, missionScore, stepScore } from '../engine/progression';
import type { MentorId, SkillId, StepResult } from '../engine/types';

export interface Verdict {
  ok: boolean;
  /** Ce qui se passe dans l'usine si on applique cette décision */
  consequence?: string;
  /** Question socratique */
  question?: string;
  hints?: string[];
  method?: string;
  bestPractice?: string;
  errorTag?: string;
  /** Commentaire sur une bonne réponse (renforcement du raisonnement) */
  why?: string;
}

interface DecisionProps {
  id: string;
  title: string;
  skills: SkillId[];
  prompt?: ReactNode;
  children?: ReactNode;
  check: () => Verdict;
  onDone: (r: StepResult) => void;
  mentor?: { id: MentorId; text: string };
  submitLabel?: string;
}

export function Decision({ id, title, skills, prompt, children, check, onDone, mentor, submitLabel = 'Valider ma décision' }: DecisionProps) {
  const [attempts, setAttempts] = useState(0);
  const [hints, setHints] = useState(0);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [reasoning, setReasoning] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [shownHints, setShownHints] = useState<string[]>([]);
  const wrong = verdict && !verdict.ok;

  const submit = () => {
    const v = check();
    setAttempts((a) => a + 1);
    setVerdict(v);
    if (!v.ok && v.errorTag) setErrors((e) => [...e, v.errorTag!]);
  };

  const retry = () => {
    if (reasoning.trim()) setLog((l) => [...l, reasoning.trim()]);
    setReasoning('');
    setVerdict(null);
  };

  const nextHint = () => {
    const pool = verdict?.hints ?? [];
    const h = pool[shownHints.length];
    if (h) {
      setShownHints((s) => [...s, h]);
      setHints((x) => x + 1);
    }
  };

  const finish = () => {
    onDone({ stepId: id, score: stepScore(attempts, hints), attempts, hints, skills, errorTags: [...new Set(errors)], reasoning: log });
  };

  return (
    <div className="card fade-in">
      <div className="card-title">
        <h3>{title}</h3>
        <div className="row">
          {skills.map((s) => (
            <span key={s} className="pill">
              {SKILL_LABEL[s]}
            </span>
          ))}
        </div>
      </div>
      {prompt && <div className="text-2">{prompt}</div>}
      {mentor && <MentorLine id={mentor.id} text={mentor.text} />}
      <fieldset disabled={!!verdict} style={{ border: 0, padding: 0, margin: '10px 0 0', minWidth: 0 }}>
        {children}
      </fieldset>

      {!verdict && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={submit}>
            {submitLabel}
          </button>
          {attempts > 0 && <span className="small muted">Tentative {attempts + 1}</span>}
        </div>
      )}

      {verdict?.ok && (
        <div className="callout good fade-in">
          <b>Décision validée.</b> {verdict.why}
          {attempts > 1 && verdict.bestPractice && <p style={{ marginTop: 6 }}>{verdict.bestPractice}</p>}
          <div style={{ marginTop: 10 }}>
            <button className="btn primary" onClick={finish}>
              Continuer →
            </button>
          </div>
        </div>
      )}

      {wrong && (
        <div className="fade-in">
          {verdict.consequence && (
            <div className="callout bad">
              <b>Conséquence :</b> {verdict.consequence}
            </div>
          )}
          {verdict.question && (
            <div className="callout info">
              <b>Question :</b> {verdict.question}
            </div>
          )}
          <label className="field" style={{ marginTop: 8 }}>
            Explique ton raisonnement (ce que tu as supposé, ce que tu vas changer) :
            <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)} placeholder="J’avais considéré que… Je n’avais pas vérifié… Je vais…" />
          </label>
          {shownHints.length > 0 && (
            <ol className="hint-list small" style={{ marginTop: 8 }}>
              {shownHints.map((h, i) => (
                <li key={i}>
                  <b>Indice {i + 1} :</b> {h}
                </li>
              ))}
            </ol>
          )}
          {attempts >= 2 && verdict.method && (
            <div className="callout">
              <b>Méthode :</b> {verdict.method}
            </div>
          )}
          {attempts >= 3 && verdict.bestPractice && (
            <div className="callout good">
              <b>Bonne pratique :</b> {verdict.bestPractice}
            </div>
          )}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn" onClick={nextHint} disabled={shownHints.length >= (verdict.hints?.length ?? 0)}>
              Indice ({(verdict.hints?.length ?? 0) - shownHints.length} restant{(verdict.hints?.length ?? 0) - shownHints.length > 1 ? 's' : ''}, −8 pts)
            </button>
            <button className="btn primary" onClick={retry} disabled={reasoning.trim().length < 15}>
              Refaire la décision
            </button>
            {reasoning.trim().length < 15 && <span className="small muted">Écris d’abord ton raisonnement (15 caractères min.).</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function MentorLine({ id, text }: { id: MentorId; text: string }) {
  const m = MENTORS[id];
  return (
    <div className="mentor">
      <div className="avatar" style={{ background: m.color }} aria-hidden>
        {m.initials}
      </div>
      <div className="bubble">
        <b>
          {m.name} — {m.role}
        </b>
        {text}
      </div>
    </div>
  );
}

export interface ChoiceOption<T extends string = string> {
  id: T;
  label: ReactNode;
  sub?: ReactNode;
}

export function Choice<T extends string>({ options, value, onChange, multi }: { options: ChoiceOption<T>[]; value: T[]; onChange: (v: T[]) => void; multi?: boolean }) {
  return (
    <div className="options">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            type="button"
            key={o.id}
            className={`option ${on ? 'chosen' : ''}`}
            onClick={() => onChange(multi ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : [o.id])}
          >
            <input type={multi ? 'checkbox' : 'radio'} readOnly checked={on} tabIndex={-1} />
            <span>
              <span>{o.label}</span>
              {o.sub && <div className="sub">{o.sub}</div>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function useSteps(total: number) {
  const [index, setIndex] = useState(-1); // -1 = briefing
  const [results, setResults] = useState<StepResult[]>([]);
  return {
    index,
    results,
    start: () => setIndex(0),
    done: (r: StepResult) => {
      setResults((x) => [...x.filter((y) => y.stepId !== r.stepId), r]);
      setIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    finished: index >= total,
  };
}

export function Briefing({ meta, onStart, extra }: { meta: MissionMeta; onStart: () => void; extra?: ReactNode }) {
  return (
    <div className="fade-in">
      <div className="card">
        <span className="pill accent">Briefing de mission</span>
        <h2 style={{ marginTop: 8 }}>{meta.title}</h2>
        <p className="text-2">{meta.briefing.context}</p>
        <div className="grid-2">
          <div>
            <h4>Données disponibles</h4>
            <ul className="small">{meta.briefing.data.map((d) => <li key={d}>{d}</li>)}</ul>
            <h4>Contraintes</h4>
            <ul className="small">{meta.briefing.constraints.map((d) => <li key={d}>{d}</li>)}</ul>
          </div>
          <div>
            <h4>Objectifs</h4>
            <ul className="small">{meta.briefing.objectives.map((d) => <li key={d}>{d}</li>)}</ul>
            <div className="callout bad small">
              <b>Pression :</b> {meta.briefing.pressure}
            </div>
          </div>
        </div>
        {extra}
      </div>
      <div className="card">
        <h3>Salle des mentors — ils ne sont pas d’accord</h3>
        {meta.debate.map((d, i) => (
          <MentorLine key={i} id={d.mentor} text={d.text} />
        ))}
        <p className="small muted" style={{ marginTop: 8 }}>
          À vous d’arbitrer. Chaque décision sera challengée ; en cas d’erreur, vous verrez la conséquence avant la méthode.
        </p>
        <button className="btn primary" onClick={onStart}>
          Prendre la mission →
        </button>
      </div>
    </div>
  );
}

export function Stepper({ total, index }: { total: number; index: number }) {
  return (
    <div className="stepper" aria-label={`Étape ${index + 1} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={i < index ? 'done' : i === index ? 'current' : ''} />
      ))}
    </div>
  );
}

export function Debrief({ meta, results, onValidate, children }: { meta: MissionMeta; results: StepResult[]; onValidate: () => void; children?: ReactNode }) {
  const score = missionScore(results);
  const errs = [...new Set(results.flatMap((r) => r.errorTags))];
  return (
    <div className="card fade-in">
      <span className="pill accent">Débriefing</span>
      <h2 style={{ marginTop: 8 }}>
        {meta.title} — {score}/100
      </h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Décision</th>
              <th className="num">Tentatives</th>
              <th className="num">Indices</th>
              <th className="num">Score</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.stepId}>
                <td>{r.stepId}</td>
                <td className="num">{r.attempts}</td>
                <td className="num">{r.hints}</td>
                <td className="num">{r.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {errs.length > 0 && (
        <div className="callout bad small">
          <b>Erreurs de raisonnement enregistrées (le jeu adaptera vos prochaines missions) :</b>
          <ul>{errs.map((e) => <li key={e}>{ERROR_LABEL[e] ?? e}</li>)}</ul>
        </div>
      )}
      {children}
      <div className="callout small">
        <b>Effet sur l’usine :</b> {score >= 60 ? meta.plantEffect : 'Score insuffisant (< 60) : aucune amélioration appliquée à l’usine. Rejouez la mission.'}
      </div>
      <button className="btn primary" onClick={onValidate}>
        Enregistrer et retourner aux missions
      </button>
    </div>
  );
}

/** Tolérance relative pour les réponses numériques. */
export function near(value: number, target: number, tol: number): boolean {
  return isFinite(value) && Math.abs(value - target) <= Math.abs(target) * tol;
}

export function NumberInput({ value, onChange, label, suffix, step = 'any' }: { value: string; onChange: (v: string) => void; label: string; suffix?: string; step?: string }) {
  return (
    <label className="field">
      {label}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <input type="number" inputMode="decimal" step={step} value={value} onChange={(e) => onChange(e.target.value)} />
        {suffix && <span className="small muted" style={{ whiteSpace: 'nowrap' }}>{suffix}</span>}
      </div>
    </label>
  );
}
