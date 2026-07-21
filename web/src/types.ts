export type MuscleGroup =
  | "Pectoraux"
  | "Dos"
  | "Epaules"
  | "Biceps"
  | "Triceps"
  | "Quadriceps"
  | "Ischios"
  | "Fessiers"
  | "Mollets"
  | "Abdominaux"
  | "Corps entier"
  | "Cardio"
  | "Autre";

export type RunningWorkoutType =
  | "Endurance fondamentale"
  | "Fractionne"
  | "Tempo"
  | "Seuil"
  | "Sortie longue"
  | "Recuperation"
  | "Fartlek"
  | "Cotes"
  | "Competition"
  | "Autre";

export interface PlannedExercise {
  id: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  targetSets: number;
  targetReps: number;
  targetWeight: number;
  restSeconds: number;
  orderIndex: number;
  alternatives: string[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  notes: string;
  orderIndex: number;
  exercises: PlannedExercise[];
}

export interface WorkoutProgram {
  id: string;
  name: string;
  createdAt: string;
  templates: WorkoutTemplate[];
}

export interface ScheduledWorkout {
  id: string;
  scheduledDate: string;
  programNameSnapshot: string;
  templateNameSnapshot: string;
  templateId?: string;
  templateExerciseCountSnapshot: number;
  isCompleted: boolean;
  sessionId?: string;
}

export interface PerformedSet {
  id: string;
  exerciseName: string;
  reps: number;
  weight: number;
  restSeconds: number;
  rpe?: number;
  exerciseOrder: number;
  orderIndex: number;
  createdAt: string;
  notes?: string;
}

export interface WorkoutSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  notes: string;
  programNameSnapshot: string;
  templateNameSnapshot: string;
  scheduledWorkoutId?: string;
  sets: PerformedSet[];
}

export interface RunningWorkoutBlock {
  id: string;
  label: string;
  repetitions: number;
  effortDescription: string;
  targetPaceText: string;
  recoveryDescription: string;
  orderIndex: number;
}

export interface RunningWorkoutPlan {
  id: string;
  scheduledDate: string;
  type: RunningWorkoutType;
  title: string;
  notes: string;
  targetDistanceKm: number;
  targetDurationMinutes: number;
  targetPaceText: string;
  programId?: string;
  blocks: RunningWorkoutBlock[];
  completedSessionId?: string;
}

export interface RunningProgram {
  id: string;
  name: string;
  createdAt: string;
  plans: RunningWorkoutPlan[];
}

export interface RunningWorkoutSession {
  id: string;
  performedAt: string;
  titleSnapshot: string;
  type: RunningWorkoutType;
  actualDistanceKm: number;
  actualDurationMinutes: number;
  actualPaceText: string;
  notes: string;
  planId?: string;
}

export interface SportState {
  version: number;
  workoutPrograms: WorkoutProgram[];
  scheduledWorkouts: ScheduledWorkout[];
  workoutSessions: WorkoutSession[];
  runningPrograms: RunningProgram[];
  runningSessions: RunningWorkoutSession[];
}

export type AppView =
  | "today"
  | "programs"
  | "planning"
  | "live"
  | "running"
  | "progress";

export type PeriodFilter = "7j" | "30j" | "90j" | "tout";
export type StrengthMetric = "Charge max" | "Reps max" | "Volume";
