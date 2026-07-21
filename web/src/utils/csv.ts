import type { SportState, WorkoutSession } from "../types";

function escapeCSV(value: string | number | undefined): string {
  const normalized = String(value ?? "").replace(/\r\n/g, "\n");
  if (!/[;"\n]/.test(normalized)) return normalized;
  return `"${normalized.replace(/"/g, '""')}"`;
}

function sessionRows(session: WorkoutSession): Array<Array<string | number | undefined>> {
  if (session.sets.length === 0) {
    return [[session.startedAt.slice(0, 10), session.programNameSnapshot, session.templateNameSnapshot, "En cours", "", "", "", "", "", session.notes]];
  }

  const counters = new Map<string, number>();
  return session.sets.map((set) => {
    const key = `${set.exerciseOrder}-${set.exerciseName}`;
    const index = (counters.get(key) ?? 0) + 1;
    counters.set(key, index);
    return [
      session.startedAt.slice(0, 10),
      session.programNameSnapshot,
      session.templateNameSnapshot,
      session.endedAt ? "Terminee" : "En cours",
      session.startedAt,
      session.endedAt,
      set.exerciseName,
      index,
      set.reps,
      set.weight,
      set.restSeconds,
      set.rpe,
      set.notes ?? session.notes,
    ];
  });
}

export function exportWorkoutCSV(state: SportState): void {
  const headers = [
    "Date",
    "Programme",
    "Seance",
    "Statut",
    "Debut",
    "Fin",
    "Exercice",
    "Serie",
    "Repetitions",
    "Poids (kg)",
    "Repos (s)",
    "RPE",
    "Notes",
  ];

  const rows = state.workoutSessions
    .slice()
    .sort((a, b) => +new Date(a.startedAt) - +new Date(b.startedAt))
    .flatMap(sessionRows);
  const csv = [headers, ...rows].map((row) => row.map(escapeCSV).join(";")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `suivi-sport-seances-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
