import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Dumbbell,
  Flag,
  Gauge,
  History,
  LineChart as LineIcon,
  ListPlus,
  Play,
  Plus,
  RefreshCw,
  Route,
  Save,
  Timer,
  Trash2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { loadState, resetDemoState, saveState, createId } from "./data/storage";
import type {
  AppView,
  MuscleGroup,
  PeriodFilter,
  PlannedExercise,
  RunningWorkoutPlan,
  RunningWorkoutSession,
  RunningWorkoutType,
  SportState,
  StrengthMetric,
  WorkoutSession,
} from "./types";
import { exportWorkoutCSV } from "./utils/csv";
import {
  addDays,
  addMonths,
  formatDuration,
  formatLongDate,
  formatShortDate,
  monthLabel,
  paceFrom,
  parseISODate,
  startOfMonth,
  todayISO,
  toISODate,
} from "./utils/date";
import {
  allPlannedExercises,
  exerciseNames,
  finishedStrengthSessions,
  formatDistance,
  formatWeight,
  periodDays,
  runningChartPoints,
  runningPlans,
  runningStats,
  sessionVolume,
  strengthChartPoints,
  strengthRecords,
} from "./utils/metrics";

const muscleGroups: MuscleGroup[] = [
  "Pectoraux",
  "Dos",
  "Epaules",
  "Biceps",
  "Triceps",
  "Quadriceps",
  "Ischios",
  "Fessiers",
  "Mollets",
  "Abdominaux",
  "Corps entier",
  "Cardio",
  "Autre",
];

const runningTypes: RunningWorkoutType[] = [
  "Endurance fondamentale",
  "Fractionne",
  "Tempo",
  "Seuil",
  "Sortie longue",
  "Recuperation",
  "Fartlek",
  "Cotes",
  "Competition",
  "Autre",
];

const navItems: Array<{ id: AppView; label: string; icon: typeof Dumbbell }> = [
  { id: "today", label: "Aujourd'hui", icon: Activity },
  { id: "programs", label: "Programmes", icon: Dumbbell },
  { id: "planning", label: "Planning", icon: CalendarDays },
  { id: "live", label: "Live", icon: Timer },
  { id: "running", label: "Course", icon: Route },
  { id: "progress", label: "Suivi", icon: LineIcon },
];

export default function App() {
  const [state, setState] = useState<SportState>(() => loadState());
  const [view, setView] = useState<AppView>("today");
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeSession = state.workoutSessions.find((session) => session.id === activeSessionId);

  function patchState(updater: (draft: SportState) => SportState) {
    setState((current) => updater(structuredClone(current)));
  }

  function startScheduledWorkout(scheduledId: string) {
    patchState((draft) => {
      const scheduled = draft.scheduledWorkouts.find((item) => item.id === scheduledId);
      if (!scheduled) return draft;

      let session = scheduled.sessionId
        ? draft.workoutSessions.find((item) => item.id === scheduled.sessionId)
        : undefined;

      if (!session) {
        session = {
          id: createId("session"),
          startedAt: new Date().toISOString(),
          notes: "",
          programNameSnapshot: scheduled.programNameSnapshot,
          templateNameSnapshot: scheduled.templateNameSnapshot,
          scheduledWorkoutId: scheduled.id,
          sets: [],
        };
        scheduled.sessionId = session.id;
        draft.workoutSessions.push(session);
      }

      setActiveSessionId(session.id);
      setView("live");
      return draft;
    });
  }

  function startFreeWorkout() {
    const name = window.prompt("Nom de la séance libre", "Séance libre")?.trim() || "Séance libre";
    const session: WorkoutSession = {
      id: createId("session"),
      startedAt: new Date().toISOString(),
      notes: "",
      programNameSnapshot: "Hors programme",
      templateNameSnapshot: name,
      sets: [],
    };
    setState((current) => ({ ...current, workoutSessions: [session, ...current.workoutSessions] }));
    setActiveSessionId(session.id);
    setView("live");
  }

  function updateSession(updated: WorkoutSession) {
    patchState((draft) => {
      draft.workoutSessions = draft.workoutSessions.map((session) => (session.id === updated.id ? updated : session));
      return draft;
    });
  }

  function finishSession(updated: WorkoutSession) {
    patchState((draft) => {
      draft.workoutSessions = draft.workoutSessions.map((session) =>
        session.id === updated.id ? { ...updated, endedAt: updated.endedAt ?? new Date().toISOString() } : session,
      );
      const scheduled = updated.scheduledWorkoutId
        ? draft.scheduledWorkouts.find((item) => item.id === updated.scheduledWorkoutId)
        : undefined;
      if (scheduled) scheduled.isCompleted = true;
      return draft;
    });
    setView("today");
  }

  const title = navItems.find((item) => item.id === view)?.label ?? "Suivi Sport";

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          <div className="brand-mark">
            <Dumbbell size={22} />
          </div>
          <div>
            <strong>Suivi Sport</strong>
            <span>Training console</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="ghost-button full"
          onClick={() => {
            if (window.confirm("Réinitialiser les données de démonstration ?")) {
              setState(resetDemoState());
              setActiveSessionId(undefined);
              setView("today");
            }
          }}
        >
          <RefreshCw size={16} />
          Demo
        </button>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <span className="eyebrow">Application locale</span>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <button type="button" className="secondary-button" onClick={() => exportWorkoutCSV(state)}>
              <Download size={16} />
              Export CSV
            </button>
            <button type="button" className="primary-button" onClick={startFreeWorkout}>
              <Play size={16} />
              Lancer
            </button>
          </div>
        </header>

        {view === "today" && <TodayView state={state} onStart={startScheduledWorkout} onFreeStart={startFreeWorkout} />}
        {view === "programs" && <ProgramsView state={state} setState={setState} />}
        {view === "planning" && <PlanningView state={state} setState={setState} onStart={startScheduledWorkout} />}
        {view === "live" && (
          <LiveSessionView
            state={state}
            session={activeSession}
            onPickSession={(id) => setActiveSessionId(id)}
            onUpdate={updateSession}
            onFinish={finishSession}
          />
        )}
        {view === "running" && <RunningView state={state} setState={setState} />}
        {view === "progress" && <ProgressView state={state} />}
      </main>

      <nav className="mobile-nav" aria-label="Navigation mobile">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? "active" : ""}
            onClick={() => setView(item.id)}
            aria-label={item.label}
          >
            <item.icon size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function TodayView({
  state,
  onStart,
  onFreeStart,
}: {
  state: SportState;
  onStart: (id: string) => void;
  onFreeStart: () => void;
}) {
  const today = todayISO();
  const plannedToday = state.scheduledWorkouts.filter((workout) => workout.scheduledDate === today);
  const recent = finishedStrengthSessions(state).slice(0, 5);
  const recentVolume = recent.reduce((total, session) => total + sessionVolume(session), 0);
  const completedCount = state.scheduledWorkouts.filter((workout) => workout.isCompleted).length;
  const pendingRuns = runningPlans(state).filter((plan) => plan.scheduledDate === today && !plan.completedSessionId);

  return (
    <div className="view-grid">
      <section className="overview-card coral">
        <div>
          <span className="eyebrow">Aujourd'hui</span>
          <h2>{plannedToday.length + pendingRuns.length ? "Séances à traiter" : "Aucune contrainte aujourd'hui"}</h2>
          <p>Planifie, lance ou renseigne tes entraînements sans quitter le tableau de bord.</p>
        </div>
        <div className="metric-row">
          <Metric value={plannedToday.length + pendingRuns.length} label="prévues" />
          <Metric value={completedCount} label="terminées" />
          <Metric value={formatWeight(recentVolume)} label="volume récent" />
        </div>
        <button type="button" className="primary-button" onClick={onFreeStart}>
          <Play size={17} />
          Lancer une séance
        </button>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarDays} title="Séances prévues" action={`${plannedToday.length} muscu`} />
        <div className="stack-list">
          {plannedToday.length === 0 && pendingRuns.length === 0 ? (
            <EmptyState title="Rien aujourd'hui" text="Ajoute une séance depuis le planning ou lance une séance libre." />
          ) : (
            <>
              {plannedToday.map((workout) => (
                <article className="row-card" key={workout.id}>
                  <div>
                    <strong>{workout.templateNameSnapshot}</strong>
                    <span>
                      {workout.programNameSnapshot} · {workout.templateExerciseCountSnapshot} exercices
                    </span>
                  </div>
                  <button type="button" className="icon-button" onClick={() => onStart(workout.id)} aria-label="Lancer">
                    <Play size={17} />
                  </button>
                </article>
              ))}
              {pendingRuns.map((plan) => (
                <article className="row-card teal" key={plan.id}>
                  <div>
                    <strong>{plan.title}</strong>
                    <span>
                      {plan.type} · {formatDistance(plan.targetDistanceKm)} · {formatDuration(plan.targetDurationMinutes)}
                    </span>
                  </div>
                  <Route size={18} />
                </article>
              ))}
            </>
          )}
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle icon={History} title="Séances récentes" action={`${recent.length} entrées`} />
        <div className="dense-table">
          <div className="table-head">
            <span>Date</span>
            <span>Séance</span>
            <span>Séries</span>
            <span>Volume</span>
          </div>
          {recent.map((session) => (
            <div className="table-row" key={session.id}>
              <span>{formatShortDate(session.startedAt.slice(0, 10))}</span>
              <strong>{session.templateNameSnapshot}</strong>
              <span>{session.sets.length}</span>
              <span>{formatWeight(sessionVolume(session))}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgramsView({ state, setState }: { state: SportState; setState: (state: SportState) => void }) {
  const [selectedStrengthId, setSelectedStrengthId] = useState<string | undefined>(state.workoutPrograms[0]?.id);
  const [selectedRunningId, setSelectedRunningId] = useState<string | undefined>(state.runningPrograms[0]?.id);
  const selectedStrength = state.workoutPrograms.find((program) => program.id === selectedStrengthId) ?? state.workoutPrograms[0];
  const selectedRunning = state.runningPrograms.find((program) => program.id === selectedRunningId) ?? state.runningPrograms[0];

  function update(updater: (draft: SportState) => void) {
    const draft = structuredClone(state);
    updater(draft);
    setState(draft);
  }

  function addStrengthProgram() {
    const program = {
      id: createId("program"),
      name: "Nouveau programme musculation",
      createdAt: todayISO(),
      templates: [],
    };
    update((draft) => draft.workoutPrograms.unshift(program));
    setSelectedStrengthId(program.id);
  }

  function addRunningProgram() {
    const program = {
      id: createId("run-program"),
      name: "Nouveau programme course",
      createdAt: todayISO(),
      plans: [],
    };
    update((draft) => draft.runningPrograms.unshift(program));
    setSelectedRunningId(program.id);
  }

  return (
    <div className="two-columns">
      <section className="panel">
        <PanelTitle icon={Dumbbell} title="Programmes musculation" action={`${state.workoutPrograms.length}`} />
        <button type="button" className="primary-button full" onClick={addStrengthProgram}>
          <Plus size={16} />
          Ajouter un programme
        </button>
        <div className="stack-list">
          {state.workoutPrograms.map((program) => (
            <button
              type="button"
              key={program.id}
              className={`select-card ${program.id === selectedStrength?.id ? "active" : ""}`}
              onClick={() => setSelectedStrengthId(program.id)}
            >
              <strong>{program.name}</strong>
              <span>
                {program.templates.length} séances ·{" "}
                {program.templates.reduce((sum, template) => sum + template.exercises.length, 0)} exercices
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Route} title="Programmes course" action={`${state.runningPrograms.length}`} />
        <button type="button" className="secondary-button full" onClick={addRunningProgram}>
          <Plus size={16} />
          Ajouter un programme course
        </button>
        <div className="stack-list">
          {state.runningPrograms.map((program) => (
            <button
              type="button"
              key={program.id}
              className={`select-card teal ${program.id === selectedRunning?.id ? "active" : ""}`}
              onClick={() => setSelectedRunningId(program.id)}
            >
              <strong>{program.name}</strong>
              <span>{program.plans.length} sorties structurées</span>
            </button>
          ))}
        </div>
      </section>

      {selectedStrength && (
        <section className="panel wide">
          <ProgramEditor
            program={selectedStrength}
            onChange={(program) =>
              update((draft) => {
                draft.workoutPrograms = draft.workoutPrograms.map((item) => (item.id === program.id ? program : item));
              })
            }
            onDelete={() => {
              if (!window.confirm("Supprimer ce programme musculation ?")) return;
              update((draft) => {
                draft.workoutPrograms = draft.workoutPrograms.filter((item) => item.id !== selectedStrength.id);
              });
              setSelectedStrengthId(state.workoutPrograms.find((item) => item.id !== selectedStrength.id)?.id);
            }}
          />
        </section>
      )}

      {selectedRunning && (
        <section className="panel wide">
          <RunningProgramEditor
            program={selectedRunning}
            onChange={(program) =>
              update((draft) => {
                draft.runningPrograms = draft.runningPrograms.map((item) => (item.id === program.id ? program : item));
              })
            }
            onDelete={() => {
              if (!window.confirm("Supprimer ce programme course ?")) return;
              update((draft) => {
                draft.runningPrograms = draft.runningPrograms.filter((item) => item.id !== selectedRunning.id);
              });
              setSelectedRunningId(state.runningPrograms.find((item) => item.id !== selectedRunning.id)?.id);
            }}
          />
        </section>
      )}
    </div>
  );
}

function ProgramEditor({
  program,
  onChange,
  onDelete,
}: {
  program: SportState["workoutPrograms"][number];
  onChange: (program: SportState["workoutPrograms"][number]) => void;
  onDelete: () => void;
}) {
  function patch(updater: (program: SportState["workoutPrograms"][number]) => void) {
    const draft = structuredClone(program);
    updater(draft);
    onChange(draft);
  }

  function addTemplate() {
    patch((draft) =>
      draft.templates.push({
        id: createId("template"),
        name: "Nouvelle séance",
        notes: "",
        orderIndex: draft.templates.length,
        exercises: [],
      }),
    );
  }

  function addExercise(templateId: string) {
    patch((draft) => {
      const template = draft.templates.find((item) => item.id === templateId);
      if (!template) return;
      template.exercises.push({
        id: createId("exercise"),
        exerciseName: "Nouvel exercice",
        muscleGroup: "Autre",
        targetSets: 4,
        targetReps: 8,
        targetWeight: 0,
        restSeconds: 90,
        orderIndex: template.exercises.length,
        alternatives: [],
      });
    });
  }

  return (
    <>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Edition musculation</span>
          <input
            className="title-input"
            value={program.name}
            onChange={(event) => patch((draft) => void (draft.name = event.target.value))}
            aria-label="Nom du programme"
          />
        </div>
        <button type="button" className="danger-button" onClick={onDelete}>
          <Trash2 size={16} />
          Supprimer
        </button>
      </div>

      <button type="button" className="primary-button" onClick={addTemplate}>
        <ListPlus size={16} />
        Ajouter une séance modèle
      </button>

      <div className="template-grid">
        {program.templates.length === 0 && <EmptyState title="Aucune séance modèle" text="Ajoute une séance puis ses exercices." />}
        {program.templates.map((template) => (
          <article className="template-card" key={template.id}>
            <div className="inline-fields">
              <input
                value={template.name}
                onChange={(event) =>
                  patch((draft) => {
                    const item = draft.templates.find((candidate) => candidate.id === template.id);
                    if (item) item.name = event.target.value;
                  })
                }
                aria-label="Nom de la séance"
              />
              <button
                type="button"
                className="icon-button danger"
                onClick={() => {
                  if (!window.confirm("Supprimer cette séance modèle ?")) return;
                  patch((draft) => {
                    draft.templates = draft.templates.filter((item) => item.id !== template.id);
                  });
                }}
                aria-label="Supprimer la séance"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              value={template.notes}
              placeholder="Notes de séance"
              onChange={(event) =>
                patch((draft) => {
                  const item = draft.templates.find((candidate) => candidate.id === template.id);
                  if (item) item.notes = event.target.value;
                })
              }
            />

            <div className="exercise-list">
              {template.exercises.map((exercise) => (
                <ExerciseEditor
                  key={exercise.id}
                  exercise={exercise}
                  onChange={(updated) =>
                    patch((draft) => {
                      const item = draft.templates.find((candidate) => candidate.id === template.id);
                      if (!item) return;
                      item.exercises = item.exercises.map((candidate) => (candidate.id === updated.id ? updated : candidate));
                    })
                  }
                  onDelete={() =>
                    patch((draft) => {
                      const item = draft.templates.find((candidate) => candidate.id === template.id);
                      if (item) item.exercises = item.exercises.filter((candidate) => candidate.id !== exercise.id);
                    })
                  }
                />
              ))}
            </div>
            <button type="button" className="ghost-button full" onClick={() => addExercise(template.id)}>
              <Plus size={15} />
              Exercice
            </button>
          </article>
        ))}
      </div>
    </>
  );
}

function ExerciseEditor({
  exercise,
  onChange,
  onDelete,
}: {
  exercise: PlannedExercise;
  onChange: (exercise: PlannedExercise) => void;
  onDelete: () => void;
}) {
  function patch<K extends keyof PlannedExercise>(key: K, value: PlannedExercise[K]) {
    onChange({ ...exercise, [key]: value });
  }

  return (
    <div className="exercise-editor">
      <div className="inline-fields">
        <input value={exercise.exerciseName} onChange={(event) => patch("exerciseName", event.target.value)} aria-label="Exercice" />
        <select value={exercise.muscleGroup} onChange={(event) => patch("muscleGroup", event.target.value as MuscleGroup)}>
          {muscleGroups.map((group) => (
            <option key={group}>{group}</option>
          ))}
        </select>
        <button type="button" className="icon-button danger" onClick={onDelete} aria-label="Supprimer l'exercice">
          <Trash2 size={15} />
        </button>
      </div>
      <div className="compact-grid">
        <label>
          Séries
          <input type="number" min="1" value={exercise.targetSets} onChange={(event) => patch("targetSets", Number(event.target.value))} />
        </label>
        <label>
          Reps
          <input type="number" min="1" value={exercise.targetReps} onChange={(event) => patch("targetReps", Number(event.target.value))} />
        </label>
        <label>
          Charge
          <input
            type="number"
            min="0"
            step="2.5"
            value={exercise.targetWeight}
            onChange={(event) => patch("targetWeight", Number(event.target.value))}
          />
        </label>
        <label>
          Repos
          <input type="number" min="0" value={exercise.restSeconds} onChange={(event) => patch("restSeconds", Number(event.target.value))} />
        </label>
      </div>
      <input
        value={exercise.alternatives.join(", ")}
        placeholder="Alternatives séparées par virgule"
        onChange={(event) =>
          patch(
            "alternatives",
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    </div>
  );
}

function RunningProgramEditor({
  program,
  onChange,
  onDelete,
}: {
  program: SportState["runningPrograms"][number];
  onChange: (program: SportState["runningPrograms"][number]) => void;
  onDelete: () => void;
}) {
  function patch(updater: (program: SportState["runningPrograms"][number]) => void) {
    const draft = structuredClone(program);
    updater(draft);
    onChange(draft);
  }

  return (
    <>
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Edition course</span>
          <input className="title-input" value={program.name} onChange={(event) => patch((draft) => void (draft.name = event.target.value))} />
        </div>
        <button type="button" className="danger-button" onClick={onDelete}>
          <Trash2 size={16} />
          Supprimer
        </button>
      </div>

      <button
        type="button"
        className="secondary-button"
        onClick={() =>
          patch((draft) =>
            draft.plans.push({
              id: createId("run-plan"),
              scheduledDate: todayISO(),
              type: "Endurance fondamentale",
              title: "Nouvelle sortie",
              notes: "",
              targetDistanceKm: 8,
              targetDurationMinutes: 45,
              targetPaceText: "",
              programId: program.id,
              blocks: [],
            }),
          )
        }
      >
        <Plus size={16} />
        Ajouter une séance course
      </button>

      <div className="template-grid">
        {program.plans.map((plan) => (
          <RunningPlanEditor
            key={plan.id}
            plan={plan}
            onChange={(updated) =>
              patch((draft) => {
                draft.plans = draft.plans.map((item) => (item.id === updated.id ? updated : item));
              })
            }
            onDelete={() =>
              patch((draft) => {
                draft.plans = draft.plans.filter((item) => item.id !== plan.id);
              })
            }
          />
        ))}
      </div>
    </>
  );
}

function RunningPlanEditor({
  plan,
  onChange,
  onDelete,
}: {
  plan: RunningWorkoutPlan;
  onChange: (plan: RunningWorkoutPlan) => void;
  onDelete: () => void;
}) {
  function patch<K extends keyof RunningWorkoutPlan>(key: K, value: RunningWorkoutPlan[K]) {
    onChange({ ...plan, [key]: value });
  }

  return (
    <article className="template-card teal-card">
      <div className="inline-fields">
        <input value={plan.title} onChange={(event) => patch("title", event.target.value)} />
        <button type="button" className="icon-button danger" onClick={onDelete} aria-label="Supprimer la sortie">
          <Trash2 size={16} />
        </button>
      </div>
      <div className="compact-grid">
        <label>
          Date
          <input type="date" value={plan.scheduledDate} onChange={(event) => patch("scheduledDate", event.target.value)} />
        </label>
        <label>
          Type
          <select value={plan.type} onChange={(event) => patch("type", event.target.value as RunningWorkoutType)}>
            {runningTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Distance
          <input
            type="number"
            min="0"
            step="0.1"
            value={plan.targetDistanceKm}
            onChange={(event) => patch("targetDistanceKm", Number(event.target.value))}
          />
        </label>
        <label>
          Durée
          <input
            type="number"
            min="0"
            value={plan.targetDurationMinutes}
            onChange={(event) => patch("targetDurationMinutes", Number(event.target.value))}
          />
        </label>
      </div>
      <input value={plan.targetPaceText} placeholder="Allure cible" onChange={(event) => patch("targetPaceText", event.target.value)} />
      <textarea value={plan.notes} placeholder="Notes" onChange={(event) => patch("notes", event.target.value)} />
      <div className="stack-list">
        {plan.blocks.map((block) => (
          <div className="mini-block" key={block.id}>
            <input
              value={block.label}
              onChange={(event) =>
                patch(
                  "blocks",
                  plan.blocks.map((item) => (item.id === block.id ? { ...item, label: event.target.value } : item)),
                )
              }
            />
            <input
              value={block.effortDescription}
              placeholder="Effort"
              onChange={(event) =>
                patch(
                  "blocks",
                  plan.blocks.map((item) => (item.id === block.id ? { ...item, effortDescription: event.target.value } : item)),
                )
              }
            />
            <input
              value={block.recoveryDescription}
              placeholder="Récupération"
              onChange={(event) =>
                patch(
                  "blocks",
                  plan.blocks.map((item) => (item.id === block.id ? { ...item, recoveryDescription: event.target.value } : item)),
                )
              }
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        className="ghost-button full"
        onClick={() =>
          patch("blocks", [
            ...plan.blocks,
            {
              id: createId("run-block"),
              label: "Bloc",
              repetitions: 1,
              effortDescription: "",
              targetPaceText: "",
              recoveryDescription: "",
              orderIndex: plan.blocks.length,
            },
          ])
        }
      >
        <Plus size={15} />
        Bloc
      </button>
    </article>
  );
}

function PlanningView({
  state,
  setState,
  onStart,
}: {
  state: SportState;
  setState: (state: SportState) => void;
  onStart: (id: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [displayedMonth, setDisplayedMonth] = useState(startOfMonth(new Date()));
  const templates = state.workoutPrograms.flatMap((program) =>
    program.templates.map((template) => ({ ...template, programId: program.id, programName: program.name })),
  );
  const dayWorkouts = state.scheduledWorkouts.filter((workout) => workout.scheduledDate === selectedDate);
  const dayRuns = runningPlans(state).filter((plan) => plan.scheduledDate === selectedDate);

  function update(updater: (draft: SportState) => void) {
    const draft = structuredClone(state);
    updater(draft);
    setState(draft);
  }

  function addScheduled(templateId: string) {
    const template = templates.find((item) => item.id === templateId);
    if (!template) return;
    update((draft) => {
      draft.scheduledWorkouts.push({
        id: createId("scheduled"),
        scheduledDate: selectedDate,
        programNameSnapshot: template.programName,
        templateNameSnapshot: template.name,
        templateId: template.id,
        templateExerciseCountSnapshot: template.exercises.length,
        isCompleted: false,
      });
    });
  }

  const monthDays = useMemo(() => calendarDays(displayedMonth), [displayedMonth]);

  return (
    <div className="two-columns">
      <section className="panel wide">
        <div className="calendar-header">
          <button type="button" className="icon-button" onClick={() => setDisplayedMonth(addMonths(displayedMonth, -1))} aria-label="Mois précédent">
            <ChevronLeft size={18} />
          </button>
          <h2>{monthLabel(displayedMonth)}</h2>
          <button type="button" className="icon-button" onClick={() => setDisplayedMonth(addMonths(displayedMonth, 1))} aria-label="Mois suivant">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="calendar-grid">
          {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
            <span className="calendar-label" key={day}>
              {day}
            </span>
          ))}
          {monthDays.map((date) => {
            const iso = toISODate(date);
            const hasStrength = state.scheduledWorkouts.some((workout) => workout.scheduledDate === iso);
            const hasRun = runningPlans(state).some((plan) => plan.scheduledDate === iso);
            return (
              <button
                type="button"
                key={iso}
                className={`calendar-cell ${date.getMonth() !== displayedMonth.getMonth() ? "muted" : ""} ${iso === selectedDate ? "active" : ""}`}
                onClick={() => setSelectedDate(iso)}
              >
                <strong>{date.getDate()}</strong>
                <span className="dot-row">
                  {hasStrength && <i className="dot coral-dot" />}
                  {hasRun && <i className="dot teal-dot" />}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarDays} title={formatLongDate(selectedDate)} action={`${dayWorkouts.length + dayRuns.length}`} />
        <div className="form-line">
          <select onChange={(event) => event.target.value && addScheduled(event.target.value)} defaultValue="">
            <option value="">Planifier une musculation</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.programName} · {template.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="secondary-button full"
          onClick={() =>
            update((draft) => {
              const program = draft.runningPrograms[0];
              if (!program) return;
              program.plans.push({
                id: createId("run-plan"),
                scheduledDate: selectedDate,
                type: "Endurance fondamentale",
                title: "Sortie planifiée",
                notes: "",
                targetDistanceKm: 7,
                targetDurationMinutes: 42,
                targetPaceText: "",
                programId: program.id,
                blocks: [],
              });
            })
          }
        >
          <Route size={16} />
          Planifier une course
        </button>
        <div className="stack-list">
          {dayWorkouts.length === 0 && dayRuns.length === 0 && <EmptyState title="Rien ce jour" text="Ajoute une séance sur cette date." />}
          {dayWorkouts.map((workout) => (
            <article className="row-card" key={workout.id}>
              <div>
                <strong>{workout.templateNameSnapshot}</strong>
                <span>{workout.programNameSnapshot}</span>
              </div>
              {workout.isCompleted ? (
                <Check size={18} />
              ) : (
                <button type="button" className="icon-button" onClick={() => onStart(workout.id)} aria-label="Lancer">
                  <Play size={16} />
                </button>
              )}
            </article>
          ))}
          {dayRuns.map((plan) => (
            <article className="row-card teal" key={plan.id}>
              <div>
                <strong>{plan.title}</strong>
                <span>{plan.type}</span>
              </div>
              <span>{formatDistance(plan.targetDistanceKm)}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function LiveSessionView({
  state,
  session,
  onPickSession,
  onUpdate,
  onFinish,
}: {
  state: SportState;
  session?: WorkoutSession;
  onPickSession: (id: string) => void;
  onUpdate: (session: WorkoutSession) => void;
  onFinish: (session: WorkoutSession) => void;
}) {
  const openSessions = state.workoutSessions.filter((item) => !item.endedAt);
  const plannedExercises = session ? templateExercisesForSession(state, session) : [];
  const knownExercises = allPlannedExercises(state);
  const options = plannedExercises.length ? plannedExercises : knownExercises;
  const [exerciseName, setExerciseName] = useState(options[0]?.exerciseName ?? "");
  const [customName, setCustomName] = useState("");
  const [reps, setReps] = useState(8);
  const [weight, setWeight] = useState(0);
  const [restSeconds, setRestSeconds] = useState(90);
  const [rpe, setRpe] = useState(7);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    const selected = options.find((exercise) => exercise.exerciseName === exerciseName);
    if (selected) {
      setReps(selected.targetReps);
      setWeight(selected.targetWeight);
      setRestSeconds(selected.restSeconds);
    }
  }, [exerciseName, session?.id]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = window.setInterval(() => setTimer((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [timer]);

  if (!session) {
    return (
      <section className="panel">
        <PanelTitle icon={Timer} title="Séance en direct" action={`${openSessions.length} ouverte(s)`} />
        {openSessions.length === 0 ? (
          <EmptyState title="Aucune séance active" text="Lance une séance depuis Aujourd'hui ou le Planning." />
        ) : (
          <div className="stack-list">
            {openSessions.map((item) => (
              <button key={item.id} type="button" className="select-card" onClick={() => onPickSession(item.id)}>
                <strong>{item.templateNameSnapshot}</strong>
                <span>{item.programNameSnapshot}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  const exerciseGroups = Array.from(new Set(session.sets.map((set) => set.exerciseOrder))).map((order) => ({
    order,
    name: session.sets.find((set) => set.exerciseOrder === order)?.exerciseName ?? "Exercice",
    sets: session.sets.filter((set) => set.exerciseOrder === order).sort((a, b) => a.orderIndex - b.orderIndex),
  }));

  function addSet() {
    const name = (customName || exerciseName).trim();
    if (!name) return;
    const order =
      session?.sets.find((set) => set.exerciseName === name)?.exerciseOrder ??
      options.findIndex((exercise) => exercise.exerciseName === name);
    const exerciseOrder = order >= 0 ? order : exerciseGroups.length;
    const updated: WorkoutSession = {
      ...session!,
      sets: [
        ...session!.sets,
        {
          id: createId("set"),
          exerciseName: name,
          reps,
          weight,
          restSeconds,
          rpe,
          exerciseOrder,
          orderIndex: session!.sets.filter((set) => set.exerciseOrder === exerciseOrder).length,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    onUpdate(updated);
    setTimer(restSeconds);
    setCustomName("");
  }

  return (
    <div className="two-columns live-layout">
      <section className="overview-card amber">
        <span className="eyebrow">{session.programNameSnapshot}</span>
        <h2>{session.templateNameSnapshot}</h2>
        <p>{session.notes || "Ajoute les séries au fil de la séance puis valide le résumé."}</p>
        <div className="metric-row">
          <Metric value={exerciseGroups.length} label="exercices" />
          <Metric value={session.sets.length} label="séries" />
          <Metric value={formatWeight(sessionVolume(session))} label="volume" />
        </div>
        <textarea value={session.notes} placeholder="Notes de séance" onChange={(event) => onUpdate({ ...session, notes: event.target.value })} />
      </section>

      <section className="panel">
        <PanelTitle icon={Plus} title="Ajouter une série" action={timer > 0 ? `${timer}s` : "repos"} />
        <div className="form-stack">
          <select value={exerciseName} onChange={(event) => setExerciseName(event.target.value)}>
            <option value="">Choisir un exercice</option>
            {options.map((exercise) => (
              <option key={exercise.id} value={exercise.exerciseName}>
                {exercise.exerciseName}
              </option>
            ))}
          </select>
          <input value={customName} placeholder="Ou exercice libre" onChange={(event) => setCustomName(event.target.value)} />
          <div className="compact-grid">
            <label>
              Reps
              <input type="number" min="1" value={reps} onChange={(event) => setReps(Number(event.target.value))} />
            </label>
            <label>
              Poids
              <input type="number" min="0" step="2.5" value={weight} onChange={(event) => setWeight(Number(event.target.value))} />
            </label>
            <label>
              Repos
              <input type="number" min="0" value={restSeconds} onChange={(event) => setRestSeconds(Number(event.target.value))} />
            </label>
            <label>
              RPE
              <input type="number" min="1" max="10" step="0.5" value={rpe} onChange={(event) => setRpe(Number(event.target.value))} />
            </label>
          </div>
          <button type="button" className="primary-button full" onClick={addSet}>
            <Plus size={16} />
            Ajouter la série
          </button>
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle icon={Dumbbell} title="Contenu de séance" action={`${session.sets.length} séries`} />
        <div className="template-grid">
          {exerciseGroups.length === 0 && <EmptyState title="Aucune série" text="Les séries réalisées apparaîtront ici." />}
          {exerciseGroups.map((group) => (
            <article className="template-card" key={group.order}>
              <strong>{group.name}</strong>
              {group.sets.map((set, index) => (
                <div className="set-row" key={set.id}>
                  <span>S{index + 1}</span>
                  <strong>{set.reps} reps</strong>
                  <span>{set.weight} kg</span>
                  <span>RPE {set.rpe}</span>
                  <button
                    type="button"
                    className="icon-button danger"
                    onClick={() => onUpdate({ ...session, sets: session.sets.filter((item) => item.id !== set.id) })}
                    aria-label="Supprimer la série"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </article>
          ))}
        </div>
        <button type="button" className="primary-button finish-button" disabled={session.sets.length === 0} onClick={() => onFinish(session)}>
          <Flag size={16} />
          Terminer la séance
        </button>
      </section>
    </div>
  );
}

function RunningView({ state, setState }: { state: SportState; setState: (state: SportState) => void }) {
  const [form, setForm] = useState({
    title: "Sortie réalisée",
    type: "Endurance fondamentale" as RunningWorkoutType,
    distance: 8,
    duration: 45,
    notes: "",
  });
  const stats7 = runningStats(state.runningSessions, 7);
  const stats30 = runningStats(state.runningSessions, 30);
  const pending = runningPlans(state)
    .filter((plan) => !plan.completedSessionId)
    .sort((a, b) => +parseISODate(a.scheduledDate) - +parseISODate(b.scheduledDate));

  function update(updater: (draft: SportState) => void) {
    const draft = structuredClone(state);
    updater(draft);
    setState(draft);
  }

  function addSession(plan?: RunningWorkoutPlan) {
    const distance = plan?.targetDistanceKm ?? form.distance;
    const duration = plan?.targetDurationMinutes ?? form.duration;
    const session: RunningWorkoutSession = {
      id: createId("run-session"),
      performedAt: new Date().toISOString(),
      titleSnapshot: plan?.title ?? form.title,
      type: plan?.type ?? form.type,
      actualDistanceKm: distance,
      actualDurationMinutes: duration,
      actualPaceText: paceFrom(distance, duration),
      notes: plan?.notes ?? form.notes,
      planId: plan?.id,
    };
    update((draft) => {
      draft.runningSessions.unshift(session);
      if (plan) {
        for (const program of draft.runningPrograms) {
          const item = program.plans.find((candidate) => candidate.id === plan.id);
          if (item) item.completedSessionId = session.id;
        }
      }
    });
  }

  return (
    <div className="view-grid">
      <section className="overview-card teal">
        <span className="eyebrow">Running</span>
        <h2>{pending.length ? `${pending.length} sortie(s) à venir` : "Course à jour"}</h2>
        <p>Planifie les blocs, renseigne le réel, suis distance, durée et allure.</p>
        <div className="metric-row">
          <Metric value={formatDistance(stats7.distance)} label="7 jours" />
          <Metric value={formatDistance(stats30.distance)} label="30 jours" />
          <Metric value={stats30.averagePace} label="allure moy." />
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Plus} title="Ajouter une sortie réalisée" action={paceFrom(form.distance, form.duration)} />
        <div className="form-stack">
          <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as RunningWorkoutType })}>
            {runningTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <div className="compact-grid">
            <label>
              Distance
              <input type="number" min="0" step="0.1" value={form.distance} onChange={(event) => setForm({ ...form, distance: Number(event.target.value) })} />
            </label>
            <label>
              Durée
              <input type="number" min="0" value={form.duration} onChange={(event) => setForm({ ...form, duration: Number(event.target.value) })} />
            </label>
          </div>
          <textarea value={form.notes} placeholder="Notes" onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <button type="button" className="secondary-button full" onClick={() => addSession()}>
            <Save size={16} />
            Enregistrer la sortie
          </button>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={CalendarDays} title="Sorties planifiées" action={`${pending.length}`} />
        <div className="stack-list">
          {pending.length === 0 && <EmptyState title="Aucune sortie à venir" text="Ajoute des plans course depuis Programmes ou Planning." />}
          {pending.slice(0, 6).map((plan) => (
            <article className="row-card teal" key={plan.id}>
              <div>
                <strong>{plan.title}</strong>
                <span>
                  {formatShortDate(plan.scheduledDate)} · {plan.type}
                </span>
              </div>
              <button type="button" className="icon-button" onClick={() => addSession(plan)} aria-label="Marquer réalisée">
                <Check size={16} />
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <PanelTitle icon={BarChart3} title="Historique course" action={`${state.runningSessions.length} sorties`} />
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={runningChartPoints(state.runningSessions, 30)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe7df" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="distance" stroke="#32B78F" fill="#32B78F33" name="Distance" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="dense-table">
          {state.runningSessions.map((session) => (
            <div className="table-row" key={session.id}>
              <span>{formatShortDate(session.performedAt.slice(0, 10))}</span>
              <strong>{session.titleSnapshot}</strong>
              <span>{formatDistance(session.actualDistanceKm)}</span>
              <span>{session.actualPaceText || paceFrom(session.actualDistanceKm, session.actualDurationMinutes)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ProgressView({ state }: { state: SportState }) {
  const [period, setPeriod] = useState<PeriodFilter>("30j");
  const [exercise, setExercise] = useState("Tous");
  const [metric, setMetric] = useState<StrengthMetric>("Volume");
  const sessions = finishedStrengthSessions(state).filter((session) => {
    const days = periodDays[period];
    if (!days) return true;
    return new Date(session.startedAt) >= addDays(new Date(), -days);
  });
  const names = ["Tous", ...exerciseNames(state)];
  const chart = strengthChartPoints(sessions, metric, exercise);
  const records = strengthRecords({ ...state, workoutSessions: sessions }).slice(0, 6);
  const runStats = runningStats(state.runningSessions, periodDays[period]);
  const totalVolume = sessions.reduce((total, session) => total + sessionVolume(session), 0);

  return (
    <div className="view-grid">
      <section className="overview-card navy">
        <span className="eyebrow">Progression</span>
        <h2>Musculation et course</h2>
        <p>Filtre la période, observe les records et repère les exercices les plus travaillés.</p>
        <div className="metric-row">
          <Metric value={sessions.length} label="séances" />
          <Metric value={formatWeight(totalVolume)} label="volume" />
          <Metric value={formatDistance(runStats.distance)} label="course" />
        </div>
      </section>

      <section className="panel wide">
        <div className="filter-row">
          <select value={period} onChange={(event) => setPeriod(event.target.value as PeriodFilter)}>
            <option value="7j">7 jours</option>
            <option value="30j">30 jours</option>
            <option value="90j">90 jours</option>
            <option value="tout">Tout</option>
          </select>
          <select value={exercise} onChange={(event) => setExercise(event.target.value)}>
            {names.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select value={metric} onChange={(event) => setMetric(event.target.value as StrengthMetric)}>
            <option>Volume</option>
            <option>Charge max</option>
            <option>Reps max</option>
          </select>
        </div>
        <div className="chart-box">
          <ResponsiveContainer width="100%" height={270}>
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#dfe7df" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#D95F4C" strokeWidth={3} dot={{ r: 4 }} name={metric} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Gauge} title="Records personnels" action={`${records.length}`} />
        <div className="stack-list">
          {records.map((record) => (
            <article className="record-card" key={record.name}>
              <strong>{record.name}</strong>
              <span>{record.group}</span>
              <div className="record-metrics">
                <b>{record.maxWeight} kg</b>
                <b>{record.maxReps} reps</b>
                <b>{formatWeight(record.volume)}</b>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <PanelTitle icon={Route} title="Course" action={runStats.averagePace} />
        <div className="metric-column">
          <Metric value={runStats.count} label="sorties" />
          <Metric value={formatDistance(runStats.distance)} label="distance totale" />
          <Metric value={formatDuration(runStats.duration)} label="durée totale" />
        </div>
        <div className="chart-box short">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={runningChartPoints(state.runningSessions, periodDays[period])}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="distance" fill="#32B78F" name="Distance" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function PanelTitle({ icon: Icon, title, action }: { icon: typeof Dumbbell; title: string; action?: string }) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={18} />
        <h2>{title}</h2>
      </div>
      {action && <span>{action}</span>}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

function templateExercisesForSession(state: SportState, session: WorkoutSession): PlannedExercise[] {
  const scheduled = session.scheduledWorkoutId
    ? state.scheduledWorkouts.find((workout) => workout.id === session.scheduledWorkoutId)
    : undefined;
  if (!scheduled?.templateId) return [];
  return (
    state.workoutPrograms
      .flatMap((program) => program.templates)
      .find((template) => template.id === scheduled.templateId)?.exercises ?? []
  ).sort((a, b) => a.orderIndex - b.orderIndex);
}

function calendarDays(displayedMonth: Date): Date[] {
  const first = startOfMonth(displayedMonth);
  const offset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -offset);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
