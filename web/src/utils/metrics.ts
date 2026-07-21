import type {
  MuscleGroup,
  PeriodFilter,
  RunningWorkoutSession,
  SportState,
  StrengthMetric,
  WorkoutSession,
} from "../types";
import { isWithinPeriod, paceFrom } from "./date";

export const periodDays: Record<PeriodFilter, number | undefined> = {
  "7j": 7,
  "30j": 30,
  "90j": 90,
  tout: undefined,
};

export function sessionVolume(session: WorkoutSession): number {
  return session.sets.reduce((total, set) => total + set.reps * set.weight, 0);
}

export function finishedStrengthSessions(state: SportState): WorkoutSession[] {
  return state.workoutSessions
    .filter((session) => session.endedAt || session.sets.length > 0)
    .sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));
}

export function runningPlans(state: SportState) {
  return state.runningPrograms.flatMap((program) => program.plans);
}

export function allPlannedExercises(state: SportState) {
  return state.workoutPrograms.flatMap((program) =>
    program.templates.flatMap((template) => template.exercises),
  );
}

export function exerciseNames(state: SportState): string[] {
  return Array.from(
    new Set([
      ...allPlannedExercises(state).map((exercise) => exercise.exerciseName),
      ...state.workoutSessions.flatMap((session) => session.sets.map((set) => set.exerciseName)),
    ]),
  ).sort((a, b) => a.localeCompare(b));
}

export function strengthChartPoints(
  sessions: WorkoutSession[],
  metric: StrengthMetric,
  exerciseName: string,
) {
  const filtered = sessions
    .slice()
    .reverse()
    .filter((session) => exerciseName === "Tous" || session.sets.some((set) => set.exerciseName === exerciseName));

  return filtered.map((session) => {
    const sets = exerciseName === "Tous" ? session.sets : session.sets.filter((set) => set.exerciseName === exerciseName);
    const value =
      metric === "Volume"
        ? sets.reduce((total, set) => total + set.reps * set.weight, 0)
        : metric === "Charge max"
          ? Math.max(0, ...sets.map((set) => set.weight))
          : Math.max(0, ...sets.map((set) => set.reps));

    return {
      date: new Date(session.startedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      value,
    };
  });
}

export function strengthRecords(state: SportState) {
  const grouped = new Map<string, { maxWeight: number; maxReps: number; volume: number; count: number; group: MuscleGroup }>();
  const plannedByName = new Map(allPlannedExercises(state).map((exercise) => [exercise.exerciseName, exercise.muscleGroup]));

  for (const session of state.workoutSessions) {
    for (const set of session.sets) {
      const current = grouped.get(set.exerciseName) ?? {
        maxWeight: 0,
        maxReps: 0,
        volume: 0,
        count: 0,
        group: plannedByName.get(set.exerciseName) ?? "Autre",
      };
      current.maxWeight = Math.max(current.maxWeight, set.weight);
      current.maxReps = Math.max(current.maxReps, set.reps);
      current.volume += set.reps * set.weight;
      current.count += 1;
      grouped.set(set.exerciseName, current);
    }
  }

  return Array.from(grouped.entries())
    .map(([name, metrics]) => ({ name, ...metrics }))
    .sort((a, b) => b.volume - a.volume);
}

export function runningStats(sessions: RunningWorkoutSession[], days?: number) {
  const filtered = sessions.filter((session) => isWithinPeriod(session.performedAt, days));
  const distance = filtered.reduce((total, session) => total + session.actualDistanceKm, 0);
  const duration = filtered.reduce((total, session) => total + session.actualDurationMinutes, 0);
  return {
    count: filtered.length,
    distance,
    duration,
    averagePace: paceFrom(distance, duration),
    sessions: filtered.sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt)),
  };
}

export function runningChartPoints(sessions: RunningWorkoutSession[], days?: number) {
  return sessions
    .filter((session) => isWithinPeriod(session.performedAt, days))
    .sort((a, b) => +new Date(a.performedAt) - +new Date(b.performedAt))
    .map((session) => ({
      date: new Date(session.performedAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      distance: session.actualDistanceKm,
      duration: session.actualDurationMinutes,
    }));
}

export function formatWeight(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} kg`;
}

export function formatDistance(value: number): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km`;
}
