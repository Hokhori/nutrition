// Presets d'activités avec leur MET (Metabolic Equivalent of Task) et calcul
// des calories brûlées. Sûr côté client (pas de "server-only").
// kcal ≈ MET × poids(kg) × durée(h). Source : Compendium of Physical Activities.

export type ActivityPreset = { key: string; label: string; met: number };

export const ACTIVITY_PRESETS: ActivityPreset[] = [
  { key: "marche", label: "Marche (5 km/h)", met: 3.5 },
  { key: "marche_rapide", label: "Marche rapide (6,5 km/h)", met: 5.0 },
  { key: "rando", label: "Randonnée", met: 6.0 },
  { key: "course", label: "Course / jogging (9 km/h)", met: 9.0 },
  { key: "course_rapide", label: "Course rapide (12 km/h)", met: 11.5 },
  { key: "velo", label: "Vélo (modéré)", met: 7.5 },
  { key: "velo_intense", label: "Vélo (intense)", met: 10.0 },
  { key: "natation", label: "Natation", met: 6.0 },
  { key: "muscu", label: "Musculation", met: 5.0 },
  { key: "hiit", label: "HIIT / crossfit", met: 8.0 },
  { key: "elliptique", label: "Elliptique", met: 5.0 },
  { key: "rameur", label: "Rameur", met: 7.0 },
  { key: "corde", label: "Corde à sauter", met: 11.0 },
  { key: "boxe", label: "Boxe", met: 7.8 },
  { key: "football", label: "Football", met: 7.0 },
  { key: "basket", label: "Basketball", met: 6.5 },
  { key: "tennis", label: "Tennis", met: 7.3 },
  { key: "yoga", label: "Yoga / stretching", met: 2.8 },
  { key: "danse", label: "Danse", met: 5.5 },
];

/** kcal brûlées ≈ MET × poids(kg) × (minutes / 60). */
export function activityKcal(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

/**
 * kcal brûlées par la marche quotidienne (nombre de pas).
 * Approximation : ~0,0005 kcal par pas et par kg (≈ 460 kcal / 10 000 pas à 92 kg).
 */
export function stepsKcal(steps: number, weightKg: number): number {
  return Math.round(steps * weightKg * 0.0005);
}
