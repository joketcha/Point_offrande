import type { MentorId } from '../engine/types';

export interface Mentor {
  id: MentorId;
  name: string;
  role: string;
  initials: string;
  color: string;
  bias: string;
  motto: string;
}

/**
 * Les mentors ne sont PAS toujours d'accord : chacun porte un biais professionnel réel.
 * Le joueur apprend à arbitrer entre des points de vue légitimes mais partiels.
 */
export const MENTORS: Record<MentorId, Mentor> = {
  mecano: {
    id: 'mecano',
    name: 'Papa Ndongo',
    role: 'Chef d’atelier mécanique, 32 ans de terrain',
    initials: 'PN',
    color: '#f59e0b',
    bias: 'Croit ce qu’il voit et touche. Méfiant envers les statistiques.',
    motto: '« La machine parle. Encore faut-il l’écouter avant qu’elle crie. »',
  },
  maths: {
    id: 'maths',
    name: 'Dr Aïcha Diallo',
    role: 'Reliability Engineer, docteure en statistiques',
    initials: 'AD',
    color: '#38bdf8',
    bias: 'Rigueur probabiliste. Peut sous-estimer les contraintes terrain.',
    motto: '« Sans loi de vie, une fréquence de maintenance n’est qu’une opinion. »',
  },
  dirmaint: {
    id: 'dirmaint',
    name: 'Jean-Marc Ekotto',
    role: 'Directeur Maintenance',
    initials: 'JE',
    color: '#22c55e',
    bias: 'Pragmatique, soucieux de la charge des équipes et des résultats rapides.',
    motto: '« Une bonne décision non exécutée vaut zéro. »',
  },
  dirind: {
    id: 'dirind',
    name: 'Fatou Sow',
    role: 'Directrice Industrielle',
    initials: 'FS',
    color: '#a78bfa',
    bias: 'Vision globale : production, coûts, image. Veut des messages clairs.',
    motto: '« Dites-moi quoi faire, pourquoi, combien et quand. »',
  },
  daf: {
    id: 'daf',
    name: 'Olivier Mensah',
    role: 'Directeur Administratif & Financier',
    initials: 'OM',
    color: '#f472b6',
    bias: 'Raisonne en trésorerie, ROI et risque financier.',
    motto: '« Je ne finance pas des capteurs. Je finance des FCFA évités. »',
  },
  prod: {
    id: 'prod',
    name: 'Bertrand Nkoulou',
    role: 'Responsable Production',
    initials: 'BN',
    color: '#ef4444',
    bias: 'Obsédé par le volume du jour. Voit la maintenance comme une contrainte.',
    motto: '« Une ligne arrêtée ne vend pas de bière. »',
  },
  data: {
    id: 'data',
    name: 'Kofi Asante',
    role: 'Spécialiste Data / IA industrielle',
    initials: 'KA',
    color: '#14b8a6',
    bias: 'Croit aux données… à condition qu’elles soient propres.',
    motto: '« Garbage in, garbage out. »',
  },
  hse: {
    id: 'hse',
    name: 'Mireille Atangana',
    role: 'Responsable HSE',
    initials: 'MA',
    color: '#fb923c',
    bias: 'Sécurité et environnement d’abord, non négociables.',
    motto: '« Aucune disponibilité ne justifie un blessé. »',
  },
};
