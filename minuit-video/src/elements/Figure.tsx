import React from "react";
import { useCurrentFrame } from "remotion";
import { bruit, mix } from "../lib/util";
import { Flame } from "./Flame";
import { Lampe } from "./Lampe";

type Pt = readonly [number, number];

// Courbe fermée lissée (Catmull-Rom → Bézier) passant par tous les points.
const lisse = (pts: readonly Pt[], ferme = true) => {
  const n = pts.length;
  const p = (i: number) => pts[ferme ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  let d = `M ${p(0)[0].toFixed(1)} ${p(0)[1].toFixed(1)}`;
  const fin = ferme ? n : n - 1;
  for (let i = 0; i < fin; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return ferme ? d + " Z" : d;
};

const melange = (a: readonly Pt[], b: readonly Pt[], t: number): Pt[] =>
  a.map((pa, i) => [mix(pa[0], b[i][0], t), mix(pa[1], b[i][1], t)] as const);

const mixPt = (a: Pt, b: Pt, t: number): Pt => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

// Proportions réalistes : hauteur ≈ 7,5 têtes, pieds en y = 0, regard vers +x.
const TORSE: readonly Pt[] = [
  [6, -254], [20, -247], [25, -224], [27, -206], [21, -177],
  [-21, -177], [-25, -200], [-27, -228], [-24, -246], [-6, -254],
];
const JUPE_DEBOUT: readonly Pt[] = [
  [21, -178], [26, -146], [31, -62], [40, -2], [14, 2],
  [-16, 2], [-42, -2], [-34, -62], [-28, -146], [-21, -178],
];
// Assise sur le sol, jambes repliées vers l'avant (taille abaissée de 104).
const JUPE_ASSISE: readonly Pt[] = [
  [21, -74], [36, -50], [80, -44], [94, -24], [86, 2],
  [20, 3], [-24, 2], [-36, -22], [-32, -52], [-21, -74],
];
const VOILE: readonly Pt[] = [
  [13, -303], [0, -313], [-19, -305], [-26, -282], [-31, -252],
  [-33, -212], [-34, -172], [-30, -147], [-12, -151], [0, -200],
  [6, -240], [3, -262], [1, -281], [6, -297],
];
const VISAGE: readonly Pt[] = [
  [8, -300], [17, -296], [21, -288], [21, -285], [26, -279],
  [21, -276], [22, -273], [21, -270], [19, -265], [8, -261], [-6, -270], [-6, -294],
];
const TURBAN: readonly Pt[] = [
  [20, -292], [8, -310], [-14, -310], [-27, -296], [-28, -276],
  [-18, -270], [-6, -284], [10, -290],
];

export type Coiffe = "voile" | "turban";

export type FigureProps = {
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly facing?: 1 | -1;
  readonly seed: string;
  readonly robe: string;
  readonly manteau: string;
  readonly peau?: string;
  readonly coiffe?: Coiffe;
  readonly barbe?: boolean;
  readonly couronne?: boolean;
  /** fiole d'huile à la ceinture (vierges sages) */
  readonly fiole?: boolean;
  readonly objet?: "lampe" | "torche" | "aucun";
  /** intensité de la lampe, 0 = éteinte */
  readonly lamp?: number;
  readonly smoke?: number;
  /** 0 debout → 1 assise */
  readonly sit?: number;
  /** 0 éveillée → 1 endormie (tête et buste tombent) */
  readonly sleep?: number;
  readonly run?: boolean;
  readonly walk?: boolean;
  /** 0 lampe à la poitrine → 1 levée */
  readonly raise?: number;
  /** bras libre tendu vers l'avant */
  readonly reach?: number;
  /** rotation de la tête (degrés) */
  readonly head?: number;
  readonly wind?: number;
  /** main portée à la bouche pour crier */
  readonly cry?: number;
  /** lumière chaude extérieure venant de l'avant (procession, salle des noces) */
  readonly chaud?: number;
  /** vêtement lumineux (l'époux) */
  readonly eclat?: number;
};

const LUNE = "#8fa8dc";
const CHAUD = "#ffb468";

// Une couche de tissu : liserés de lune et de chaleur, couleur, lumière de la flamme, ombre basse.
const Couche: React.FC<{
  readonly d: string;
  readonly fill: string;
  readonly lum: string;
  readonly li: number;
  readonly ombre: string;
  readonly chaud: number;
  readonly texture?: boolean;
  readonly assombrir?: number;
}> = ({ d, fill, lum, li, ombre, chaud, texture = false, assombrir = 0 }) => (
  <g>
    <path d={d} fill={LUNE} opacity={0.22} transform="translate(-1.6 -1.2)" />
    <path d={d} fill={CHAUD} opacity={Math.min(0.8, li * 0.6 + chaud)} transform="translate(1.6 -0.6)" />
    <path d={d} fill={fill} filter={texture ? "url(#tissu)" : undefined} />
    {assombrir > 0 ? <path d={d} fill="#060810" opacity={assombrir} /> : null}
    <path d={d} fill={`url(#${lum})`} opacity={li} />
    <path d={d} fill={`url(#${ombre})`} />
    <path d={d} fill="url(#volume)" />
  </g>
);

export const Figure: React.FC<FigureProps> = ({
  x,
  y,
  scale = 1,
  facing = 1,
  seed,
  robe,
  manteau,
  peau = "#5a3a28",
  coiffe = "voile",
  barbe = false,
  couronne = false,
  fiole = false,
  objet = "lampe",
  lamp = 1,
  smoke = 0,
  sit = 0,
  sleep = 0,
  run = false,
  walk = false,
  raise = 0,
  reach = 0,
  head = 0,
  wind = 0.5,
  cry = 0,
  chaud = 0,
  eclat = 0,
}) => {
  const frame = useCurrentFrame();
  const phase = seed.length * 1.7;
  const pas = run ? Math.sin(frame * 0.55 + phase) : walk ? Math.sin(frame * 0.17 + phase) : 0;
  const ampl = run ? 1 : walk ? 0.45 : 0;
  const rebond = run ? -Math.abs(pas) * 7 : walk ? -Math.abs(pas) * 2 : 0;
  const souffle = bruit(seed + "-s", frame, 0.035) * 1.2;
  const vent = bruit(seed + "-v", frame, 0.05) * 9 * wind - (run ? 26 : 0);

  // Buste : s'abaisse quand elle s'assoit, se penche quand elle s'endort.
  const D = sit * 104;
  const penche = sleep * 16;
  const versBuste = ([px, py]: Pt): Pt => {
    const a = (-penche * Math.PI) / 180;
    const dx = px;
    const dy = py - D + 177;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a) - 177];
  };
  const versMonde = ([px, py]: Pt): Pt => {
    const a = (penche * Math.PI) / 180;
    const dx = px;
    const dy = py + 177;
    return [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a) - 177 + D];
  };

  // Bras qui porte la lampe ou la torche (coordonnées du buste).
  const torche = objet === "torche";
  let main: Pt = mixPt([40, -201], [50, -258], torche ? 1 : raise);
  let coude: Pt = mixPt([19, -203], [33, -226], torche ? 1 : raise);
  if (run) {
    main = [42 + pas * 4, -208];
    coude = [20 + pas * 4, -206];
  }
  main = mixPt(main, [34, -170], sit);
  coude = mixPt(coude, [18, -196], sit);
  main = mixPt(main, [23, -274], cry);
  coude = mixPt(coude, [36, -236], cry);

  // Bras libre.
  const coudeL = mixPt([-15 - pas * 10 * ampl, -199], [8, -226], reach);
  const mainL = mixPt([-9 - pas * 16 * ampl, -160], [48, -229], reach);

  // Lampe : dans la main, ou posée au sol quand elle est assise.
  const mainMonde = versMonde(main);
  const lampeMonde = mixPt([mainMonde[0] + 1, mainMonde[1] - 4], [92, -3], sit);
  const flammeMonde: Pt = torche ? versMonde([main[0] + 7, main[1] - 78]) : [lampeMonde[0] + 12.5, lampeMonde[1] - 3];
  const li = objet === "aucun" ? 0 : torche ? 1 : Math.max(0, lamp);
  const flammeBuste = versBuste(flammeMonde);

  const jupe = lisse(
    melange(JUPE_DEBOUT, JUPE_ASSISE, sit).map(([px, py], i) =>
      i >= 2 && i <= 7 && sit < 1 ? ([px + (i < 5 ? 1 : -1) * pas * 12 * ampl * (1 - sit), py] as const) : ([px, py] as const),
    ),
  );
  const voile = lisse(
    VOILE.map(([px, py], i) => (i >= 4 && i <= 8 ? ([px + vent * ((i - 3) / 5), py + (run ? (i - 3) * 4 : 0)] as const) : ([px, py] as const))),
  );
  const id = `fig-${seed}`;
  const r = torche ? 260 : 150;

  const bras = (a: Pt, b: Pt, c: Pt, col: string, w: number) => (
    <>
      <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`} stroke={LUNE} strokeOpacity={0.18} strokeWidth={w + 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1.5 -1)" />
      <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`} stroke={col} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]} L ${c[0]} ${c[1]}`} stroke={`url(#${id}-lb)`} strokeOpacity={li} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={c[0]} cy={c[1]} r={4.6} fill={peau} />
      <circle cx={c[0]} cy={c[1]} r={4.6} fill={`url(#${id}-lb)`} opacity={li} />
    </>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}>
      <defs>
        <radialGradient id={`${id}-lw`} gradientUnits="userSpaceOnUse" cx={flammeMonde[0]} cy={flammeMonde[1]} r={r}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#e88a40" stopOpacity={0.5} />
          <stop offset="1" stopColor="#7a3010" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={`${id}-lb`} gradientUnits="userSpaceOnUse" cx={flammeBuste[0]} cy={flammeBuste[1]} r={r}>
          <stop offset="0" stopColor="#ffd9a0" stopOpacity={0.95} />
          <stop offset="0.35" stopColor="#e88a40" stopOpacity={0.5} />
          <stop offset="1" stopColor="#7a3010" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={`${id}-o`} gradientUnits="userSpaceOnUse" x1={0} y1={-320} x2={0} y2={0}>
          <stop offset="0" stopColor="#000" stopOpacity={0} />
          <stop offset="0.6" stopColor="#000" stopOpacity={0.15} />
          <stop offset="1" stopColor="#000" stopOpacity={0.5} />
        </linearGradient>
      </defs>

      {/* Lueur au sol et ombre portée */}
      <ellipse cx={flammeMonde[0] * 0.6} cy={0} rx={130} ry={18} fill="#ff9d45" opacity={0.28 * li} filter="url(#flou-6)" />
      <ellipse cx={sit * 30} cy={2} rx={52 + sit * 30} ry={7} fill="#000" opacity={0.5} filter="url(#flou-2)" />

      <g transform={`translate(0 ${rebond + souffle * 0.4}) rotate(${run ? 10 : walk ? 2 : 0} 0 0)`}>
        {/* Bras arrière */}
        <g transform={`translate(0 ${D}) rotate(${penche} 0 -177)`}>{bras([-10, -244], coudeL, mainL, robe, 9)}</g>

        {/* Jupe / jambes */}
        <Couche d={jupe} fill={robe} lum={`${id}-lw`} li={li} ombre={`${id}-o`} chaud={chaud} texture />
        {sit < 0.5
          ? [-0.65, -0.2, 0.25, 0.65].map((k) => (
              <path
                key={k}
                d={`M ${k * 18} -170 Q ${k * 30 + vent * 0.2} -90 ${k * 40 + pas * 10 * ampl} -4`}
                stroke="#000"
                strokeOpacity={0.4 * (1 - sit * 2)}
                strokeWidth={2.4}
                fill="none"
              />
            ))
          : null}

        <g transform={`translate(0 ${D}) rotate(${penche} 0 -177)`}>
          {/* Torse, ceinture, fiole */}
          <Couche d={lisse(TORSE)} fill={robe} lum={`${id}-lb`} li={li} ombre={`${id}-o`} chaud={chaud} />
          <path d="M -22 -180 Q 0 -174 22 -180 L 22 -173 Q 0 -167 -22 -173 Z" fill="#2a1a10" />
          {fiole ? (
            <g>
              <ellipse cx={24} cy={-164} rx={6} ry={8} fill="#7a4526" />
              <ellipse cx={24} cy={-164} rx={6} ry={8} fill={`url(#${id}-lb)`} opacity={li} />
              <rect x={22} y={-176} width={4} height={5} fill="#5a3018" />
            </g>
          ) : null}

          {/* Tête, visage visible et éclairé */}
          <g transform={`rotate(${head + sleep * 34} 4 -256)`}>
            <path d="M -2 -262 L 10 -262 L 12 -248 L -4 -248 Z" fill={peau} />
            <path d={lisse(VISAGE)} fill={LUNE} opacity={0.2} transform="translate(-1 -1)" />
            <path d={lisse(VISAGE)} fill={peau} />
            <path d={lisse(VISAGE)} fill={`url(#${id}-lb)`} opacity={Math.min(1, li * 1.1 + chaud)} />
            <ellipse cx={4} cy={-276} rx={9} ry={12} fill="#000" opacity={0.35} filter="url(#flou-2)" />
            <ellipse cx={18} cy={-279} rx={3.5} ry={2.5} fill="#ffcf9a" opacity={0.35 * li} filter="url(#flou-2)" />
            <path d="M 6 -298 Q 14 -300 19 -294" stroke="#120a06" strokeWidth={3} fill="none" />
            <path d={`M 14 -286.5 q 2.5 ${-1.6 + sleep * 1.6} 5 0`} stroke="#120a06" strokeWidth={1.6} fill="none" />
            <circle cx={17} cy={-285.6} r={sleep > 0.5 ? 0 : 0.9} fill="#ffe8c0" opacity={li} />
            <path d="M 15 -289.5 Q 18 -291 21 -289.5" stroke="#120a06" strokeWidth={1.3} fill="none" />
            <path d="M 18.5 -272.8 Q 20.5 -272 21.6 -272.8" stroke="#6a2a20" strokeWidth={1.6} fill="none" />
            {barbe ? <path d="M 22 -271 C 23 -262 16 -255 6 -256 C -2 -257 -6 -263 -5 -272 C 4 -266 14 -266 22 -271 Z" fill="#1e140e" /> : null}
            {coiffe === "voile" ? (
              <g>
                <Couche d={voile} fill={manteau} lum={`${id}-lb`} li={li * 0.6} ombre={`${id}-o`} chaud={chaud * 0.6} assombrir={0.4} />
                {[0, 1, 2].map((k) => (
                  <path
                    key={k}
                    d={`M ${-6 - k * 7} -302 Q ${-18 - k * 5 + vent * 0.3} -230 ${-14 - k * 6 + vent * 0.7} -152`}
                    stroke="#000"
                    strokeOpacity={0.18}
                    strokeWidth={3}
                    filter="url(#flou-2)"
                    fill="none"
                  />
                ))}
              </g>
            ) : (
              <g>
                <path d={lisse(VOILE.slice(3, 9).concat([[-8, -250]]))} fill={manteau} opacity={0.95} />
                <Couche d={lisse(TURBAN)} fill={manteau} lum={`${id}-lb`} li={li} ombre={`${id}-o`} chaud={chaud} texture />
              </g>
            )}
            {couronne ? (
              <path d="M -16 -306 L -10 -318 L -4 -308 L 3 -321 L 9 -308 L 15 -318 L 19 -304 Z" fill="#e8b94a" />
            ) : null}
          </g>

          {/* Bras avant */}
          {bras([14, -243], coude, main, robe, 10)}
        </g>

        {eclat > 0 ? (
          <g opacity={eclat * 0.35}>
            <path d={jupe} fill="#fff1d2" />
            <path d={lisse(TORSE)} fill="#fff1d2" transform={`translate(0 ${D}) rotate(${penche} 0 -177)`} />
          </g>
        ) : null}

        {/* Lampe ou torche */}
        {objet === "lampe" ? <Lampe x={lampeMonde[0]} y={lampeMonde[1]} s={0.5} lamp={lamp} smoke={smoke} seed={seed} /> : null}
        {torche ? (
          <g transform={`translate(0 ${D}) rotate(${penche} 0 -177)`}>
            <path d={`M ${main[0] - 2} ${main[1] + 14} L ${main[0] + 7} ${main[1] - 74}`} stroke="#3a2414" strokeWidth={7} strokeLinecap="round" />
            <path d={`M ${main[0] + 4} ${main[1] - 70} l 6 0 l -1 -8 l -5 0 Z`} fill="#1a100a" />
            <Flame x={main[0] + 7} y={main[1] - 78} size={15} intensity={1} seed={seed + "-t"} torch />
          </g>
        ) : null}
      </g>
    </g>
  );
};
