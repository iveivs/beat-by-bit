import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { FirebaseError } from "firebase/app";
import {
  completeRedirectSignIn,
  createEmptyState,
  hasFirebaseConfig,
  makeEntryKey,
  loadCloudMeta,
  loadCloudMonths,
  loadCloudState,
  loadLocalState,
  mergeMonthState,
  migrateLegacyCloudState,
  registerWithEmail,
  resetEmailPassword,
  resetCloudState,
  saveCloudDayNote,
  saveCloudEntry,
  saveCloudEntryNote,
  saveCloudState,
  saveLocalState,
  sendVerificationEmail,
  signInWithEmail,
  signInWithGoogle,
  signOutOfGoogle,
  subscribeCloudState,
  subscribeCloudMonths,
  watchAuth,
  getCloudMetaFromState,
  getStateMonthKeys,
  type CloudTrackerMeta,
  type Habit,
  type Score,
  type TrackerState,
} from "./storage";
import { LegendBand } from "./components/LegendBand";
import { MobileTracker } from "./components/MobileTracker";
import { SummaryGrid } from "./components/SummaryGrid";
import { TopBar } from "./components/TopBar";
import { TrackerBand } from "./components/TrackerBand";
import {
  AddSubSkillDialog,
  AuthDialog,
  ChartDialog,
  DayNoteEditor,
  DeleteHabitDialog,
  EditHabitDialog,
  FullNameDialog,
  MonthOverviewDialog,
  ProfileDialog,
  ResetDataDialog,
  ScorePopover,
} from "./components/TrackerDialogs";
import {
  applyMonthToAnchor,
  defaultCalendarPeriod,
  mobileCalendarPeriod,
  dateKey,
  formatRangeLabel,
  getActiveHabits,
  getChartPoints,
  getChildrenByParent,
  getDateWindow,
  getEffectiveCalendarAnchorDate,
  getExpandedProjectsFromState,
  getMonthDates,
  getMonthInputValue,
  getMonthKeysBetween,
  getMonthKeysForDates,
  isFutureDay,
  getStats,
  getVisibleHabitRows,
  habitColors,
  loadTheme,
  noteEditorHeight,
  noteEditorWidth,
  popoverHeight,
  popoverWidth,
  shiftDate,
  shiftMonth,
  themeStorageKey,
  type AuthMode,
  type CalendarPeriod,
  type ChartRange,
  type ChartView,
  type NoteEditorState,
  type PickerState,
  type Theme,
} from "./lib/tracker";

const appVersion = import.meta.env.VITE_APP_VERSION ?? "dev";
const resetConfirmationPhrase = "СТЕРЕТЬ ВСЁ";

function formatSyncTime(date = new Date()) {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) return "Не удалось выполнить вход";

  if (error.code === "auth/unauthorized-domain") {
    return "Firebase не разрешает вход с этого домена";
  }

  if (error.code === "auth/popup-blocked") {
    return "Браузер заблокировал окно входа";
  }

  if (error.code === "auth/popup-closed-by-user") {
    return "Окно входа закрылось до завершения";
  }

  if (error.code === "auth/email-already-in-use") {
    return "Такой email уже зарегистрирован";
  }

  if (error.code === "auth/invalid-email") {
    return "Проверь email";
  }

  if (error.code === "auth/weak-password") {
    return "Пароль должен быть не короче 6 символов";
  }

  if (
    error.code === "auth/invalid-credential" ||
    error.code === "auth/user-not-found" ||
    error.code === "auth/wrong-password"
  ) {
    return "Неверный email или пароль";
  }

  if (error.code === "auth/too-many-requests") {
    return "Слишком много попыток, попробуй позже";
  }

  return `Ошибка входа: ${error.code}`;
}

function getRequiredMonthKeys(anchorDate: string, periodDays: number) {
  const visibleDates = getDateWindow(anchorDate, periodDays);
  const monthKeys = new Set(getMonthKeysForDates(visibleDates));
  monthKeys.add(getMonthInputValue(anchorDate));

  const previousMonth = applyMonthToAnchor(anchorDate, getMonthInputValue(shiftDate(anchorDate, -31)));
  const nextMonth = applyMonthToAnchor(anchorDate, getMonthInputValue(shiftDate(anchorDate, 31)));
  monthKeys.add(getMonthInputValue(previousMonth));
  monthKeys.add(getMonthInputValue(nextMonth));

  return [...monthKeys].sort();
}

function getMonthKeysForChart(meta: CloudTrackerMeta | null, range: ChartRange, todayKey: string) {
  if (range === "week") {
    return getRequiredMonthKeys(todayKey, 7);
  }

  if (range === "month") {
    return getRequiredMonthKeys(todayKey, 30);
  }

  if (!meta?.firstMonth || !meta?.lastMonth) return [];
  return getMonthKeysBetween(meta.firstMonth, meta.lastMonth);
}

export function App() {
  const [state, setState] = useState<TrackerState>(() => loadLocalState());
  const [theme, setTheme] = useState<Theme>(() => loadTheme());
  const [cloudMeta, setCloudMeta] = useState<CloudTrackerMeta | null>(null);
  const [loadedMonthKeys, setLoadedMonthKeys] = useState<Set<string>>(() =>
    new Set(getStateMonthKeys(loadLocalState())),
  );
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(() =>
    getExpandedProjectsFromState(loadLocalState()),
  );
  const [newHabit, setNewHabit] = useState("");
  const [newArea, setNewArea] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [cloudHydrated, setCloudHydrated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState(
    hasFirebaseConfig ? "Вход или регистрация" : "Локальное хранение",
  );
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authPasswordRepeat, setAuthPasswordRepeat] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const [habitToDelete, setHabitToDelete] = useState<Habit | null>(null);
  const [habitToEdit, setHabitToEdit] = useState<Habit | null>(null);
  const [parentForNewSkill, setParentForNewSkill] = useState<Habit | null>(null);
  const [expandedHabit, setExpandedHabit] = useState<Habit | null>(null);
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [newSkillName, setNewSkillName] = useState("");
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [resetDataDialogOpen, setResetDataDialogOpen] = useState(false);
  const [resetConfirmation, setResetConfirmation] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const [chartHabit, setChartHabit] = useState<Habit | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("week");
  const [chartView, setChartView] = useState<ChartView>("donut");
  const [monthOverviewValue, setMonthOverviewValue] = useState<string | null>(null);
  const [dayNoteEditor, setDayNoteEditor] = useState<NoteEditorState | null>(null);
  const [dayNoteDraft, setDayNoteDraft] = useState("");

  const todayKey = dateKey(new Date());
  const calendarAnchorDate = getEffectiveCalendarAnchorDate(
    state.preferences?.calendarAnchorDate,
    todayKey,
  );
  const calendarPeriodDays =
    (state.preferences?.calendarPeriodDays as CalendarPeriod | undefined) ??
    defaultCalendarPeriod;
  const dates = useMemo(
    () => getDateWindow(calendarAnchorDate, calendarPeriodDays),
    [calendarAnchorDate, calendarPeriodDays],
  );
  const mobileDates = useMemo(
    () => getDateWindow(calendarAnchorDate, mobileCalendarPeriod),
    [calendarAnchorDate],
  );
  const rangeLabel = useMemo(() => formatRangeLabel(dates), [dates]);
  const monthValue = getMonthInputValue(calendarAnchorDate);
  const monthOverviewDates = useMemo(
    () => (monthOverviewValue ? getMonthDates(monthOverviewValue) : []),
    [monthOverviewValue],
  );
  const requiredMonthKeys = useMemo(
    () => getRequiredMonthKeys(calendarAnchorDate, calendarPeriodDays),
    [calendarAnchorDate, calendarPeriodDays],
  );
  const activeHabits = useMemo(() => getActiveHabits(state.habits), [state.habits]);
  const childrenByParent = useMemo(
    () => getChildrenByParent(state.habits),
    [state.habits],
  );
  const rootHabits = useMemo(
    () => activeHabits.filter((habit) => !habit.parentId),
    [activeHabits],
  );
  const visibleHabits = useMemo(
    () => getVisibleHabitRows(state.habits, expandedProjects),
    [state.habits, expandedProjects],
  );
  const monthOverviewHabits = useMemo(() => {
    const activeRows = getVisibleHabitRows(
      state.habits,
      new Set(
        state.habits
          .filter((habit) => !habit.archived && habit.parentId)
          .map((habit) => habit.parentId!),
      ),
    );

    return activeRows;
  }, [state.habits]);
  const stats = useMemo(() => getStats(state), [state]);
  const nickname = state.profile?.nickname?.trim() || null;
  const displayName = nickname ?? userName ?? syncStatus;
  const chartPoints = useMemo(
    () => (chartHabit ? getChartPoints(state, chartHabit.id, chartRange) : []),
    [chartHabit, chartRange, state],
  );
  const chartRequiredMonths = useMemo(
    () => (chartHabit ? getMonthKeysForChart(cloudMeta, chartRange, todayKey) : []),
    [chartHabit, chartRange, cloudMeta, todayKey],
  );
  const chartAverage = chartPoints.length
    ? (
        chartPoints.reduce((sum, entry) => sum + entry.score, 0) /
        chartPoints.length
      ).toFixed(1)
    : "0.0";
  const chartBestScore = chartPoints.length
    ? Math.max(...chartPoints.map((entry) => entry.score))
    : 0;
  const chartScoreBreakdown = useMemo(
    () =>
      ([1, 2, 3, 4, 5] as Score[]).map((score) => ({
        score,
        count: chartPoints.filter((entry) => entry.score === score).length,
      })),
    [chartPoints],
  );
  const chartTotal = chartPoints.length;

  const hydrateCloudState = useCallback(
    async (nextUserId: string, nextMeta: CloudTrackerMeta) => {
      const nextAnchorDate = nextMeta.preferences?.calendarAnchorDate ?? todayKey;
      const nextPeriodDays =
        (nextMeta.preferences?.calendarPeriodDays as CalendarPeriod | undefined) ??
        defaultCalendarPeriod;
      const monthKeys = getRequiredMonthKeys(nextAnchorDate, nextPeriodDays);
      const nextState = await loadCloudState(nextUserId, monthKeys);

      if (!nextState) return;

      setCloudMeta(nextMeta);
      setState(nextState);
      setExpandedProjects(getExpandedProjectsFromState(nextState));
      setLoadedMonthKeys(new Set(getStateMonthKeys(nextState)));
      saveLocalState(nextState);
    },
    [todayKey],
  );

  const ensureCloudMonthsLoaded = useCallback(
    async (monthKeys: string[], force = false) => {
      if (!userId || !cloudMeta) return;

      const uniqueMonthKeys = [...new Set(monthKeys)].sort();
      const monthKeysToLoad = force
        ? uniqueMonthKeys
        : uniqueMonthKeys.filter((monthKey) => !loadedMonthKeys.has(monthKey));

      if (!monthKeysToLoad.length) return;

      const monthState = await loadCloudMonths(userId, monthKeysToLoad);

      setState((currentState) => {
        const mergedState = mergeMonthState(currentState, monthState, monthKeysToLoad);
        saveLocalState(mergedState);
        return mergedState;
      });

      setLoadedMonthKeys((currentMonths) => {
        const nextMonths = new Set(currentMonths);
        monthKeysToLoad.forEach((monthKey) => nextMonths.add(monthKey));
        return nextMonths;
      });
    },
    [cloudMeta, loadedMonthKeys, userId],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#292724" : "#f0e5cf");
  }, [theme]);

  useEffect(() => {
    if (!hasFirebaseConfig) return;

    void completeRedirectSignIn().catch((error) => {
      setSyncStatus(getAuthErrorMessage(error));
    });

    return watchAuth(async (user) => {
      setCloudHydrated(false);
      setUserId(user?.uid ?? null);
      setUserName(user?.displayName ?? user?.email ?? null);
      setUserPhoto(user?.photoURL ?? null);

      if (!user) {
        setCloudMeta(null);
        setSyncStatus("Вход или регистрация");
        return;
      }

      setAuthMode(null);
      setAuthPassword("");
      setAuthPasswordRepeat("");
      setAuthMessage("");
      setSyncStatus("Загружаю облачные данные");
      try {
        const nextMeta = await loadCloudMeta(user.uid);
        if (nextMeta) {
          await hydrateCloudState(user.uid, nextMeta);
          await migrateLegacyCloudState(user.uid);
        } else {
          const localState = loadLocalState();
          await saveCloudState(user.uid, localState, getStateMonthKeys(localState));
          setCloudMeta(getCloudMetaFromState(localState));
        }

        setCloudHydrated(true);
        setSyncStatus(`Синхронизировано: ${formatSyncTime()}`);
      } catch {
        setSyncStatus("Не удалось загрузить облачные данные");
      }
    });
  }, [hydrateCloudState]);

  useEffect(() => {
    if (!userId || !cloudHydrated) return;
    return subscribeCloudState(
      userId,
      (nextMeta) => {
        if (!nextMeta) return;
        setCloudMeta(nextMeta);
        setState((currentState) => {
          if (nextMeta.updatedAt === currentState.updatedAt) return currentState;

          const nextState = {
            ...currentState,
            habits: nextMeta.habits,
            profile: nextMeta.profile,
            preferences: nextMeta.preferences,
            updatedAt: nextMeta.updatedAt,
          };
          saveLocalState(nextState);
          return nextState;
        });
        setExpandedProjects(
          new Set(nextMeta.preferences?.expandedProjectIds ?? []),
        );
      },
      () => setSyncStatus("Не удалось получить облачные данные"),
    );
  }, [cloudHydrated, userId]);

  useEffect(() => {
    if (!userId || !cloudHydrated) return;

    return subscribeCloudMonths(
      userId,
      requiredMonthKeys,
      (month) => {
        setState((currentState) => {
          const mergedState = mergeMonthState(
            currentState,
            {
              entries: month.entries ?? {},
              dayNotes: month.dayNotes ?? {},
              entryNotes: month.entryNotes ?? {},
            },
            [month.monthKey],
          );
          saveLocalState(mergedState);
          return mergedState;
        });
        setLoadedMonthKeys((currentMonths) => {
          const nextMonths = new Set(currentMonths);
          nextMonths.add(month.monthKey);
          return nextMonths;
        });
        setSyncStatus(`Синхронизировано: ${formatSyncTime()}`);
      },
      () => setSyncStatus("Не удалось получить облачные данные"),
    );
  }, [cloudHydrated, requiredMonthKeys, userId]);

  useEffect(() => {
    if (!chartHabit) return;
    const timeoutId = window.setTimeout(() => {
      void ensureCloudMonthsLoaded(chartRequiredMonths);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [chartHabit, chartRequiredMonths, ensureCloudMonthsLoaded]);

  useEffect(() => {
    if (!monthOverviewValue) return;
    const timeoutId = window.setTimeout(() => {
      void ensureCloudMonthsLoaded([monthOverviewValue]);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [ensureCloudMonthsLoaded, monthOverviewValue]);

  useEffect(() => {
    if (!picker) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (target?.closest(".score-popover, .score-cell")) return;
      setPicker(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPicker(null);
    }

    function closePicker() {
      setPicker(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closePicker);
    window.addEventListener("scroll", closePicker, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closePicker);
      window.removeEventListener("scroll", closePicker, true);
    };
  }, [picker]);

  useEffect(() => {
    if (!dayNoteEditor) return;

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Element | null;
      if (
        target?.closest(
          ".day-note-editor, .day-note-button, .mobile-note-card, .score-cell, .score-popover",
        )
      ) {
        return;
      }
      setDayNoteEditor(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDayNoteEditor(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dayNoteEditor]);

  useEffect(() => {
    if (!habitToDelete) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setHabitToDelete(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [habitToDelete]);

  useEffect(() => {
    if (
      !habitToEdit &&
      !expandedHabit &&
      !parentForNewSkill &&
      !authMode &&
      !profileDialogOpen &&
      !resetDataDialogOpen &&
      !chartHabit &&
      !monthOverviewValue
    ) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setHabitToEdit(null);
      setExpandedHabit(null);
      setParentForNewSkill(null);
      setAuthMode(null);
      setProfileDialogOpen(false);
      if (!resetBusy) setResetDataDialogOpen(false);
      setChartHabit(null);
      setMonthOverviewValue(null);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    habitToEdit,
    expandedHabit,
    parentForNewSkill,
    authMode,
    profileDialogOpen,
    resetBusy,
    resetDataDialogOpen,
    chartHabit,
    monthOverviewValue,
  ]);

  function commit(
    nextState: TrackerState,
    dirtyMonthKeys: string[] = [],
    cloudSave?: (userId: string, state: TrackerState) => Promise<void>,
  ) {
    const updatedState = { ...nextState, updatedAt: new Date().toISOString() };
    setState(updatedState);
    setCloudMeta(getCloudMetaFromState(updatedState));
    setLoadedMonthKeys(new Set(getStateMonthKeys(updatedState)));
    saveLocalState(updatedState);
    if (userId) {
      setSyncStatus("Сохраняю");
      const save = cloudSave
        ? cloudSave(userId, updatedState)
        : saveCloudState(userId, updatedState, dirtyMonthKeys);
      void save
        .then(() => {
          setSyncStatus(`Синхронизировано: ${formatSyncTime()}`);
        })
        .catch(() => {
          setSyncStatus("Не удалось синхронизировать");
        });
    }
  }

  function addHabit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newHabit.trim();
    if (!name) return;

    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      area: newArea.trim() || "личное",
      color: habitColors[state.habits.length % habitColors.length],
    };

    commit({ ...state, habits: [...state.habits, habit] });
    setNewHabit("");
    setNewArea("");
  }

  function setScore(habitId: string, date: string, score: Score | null) {
    if (isFutureDay(date, todayKey)) {
      setPicker(null);
      return;
    }

    const key = makeEntryKey(habitId, date);
    const entries = { ...state.entries };

    if (score) {
      entries[key] = { habitId, date, score };
    } else {
      delete entries[key];
    }

    commit(
      { ...state, entries },
      [getMonthInputValue(date)],
      (nextUserId, nextState) =>
        saveCloudEntry(nextUserId, nextState, date, key, entries[key] ?? null),
    );
    setPicker(null);
  }

  function togglePicker(
    event: MouseEvent<HTMLButtonElement>,
    key: string,
    habitId: string,
    habitName: string,
    date: string,
  ) {
    if (picker?.key === key) {
      setPicker(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 10;
    const enoughSpaceBelow =
      rect.bottom + popoverHeight + viewportPadding < window.innerHeight;
    const top = enoughSpaceBelow
      ? rect.bottom + 8
      : Math.max(viewportPadding, rect.top - popoverHeight - 8);
    const left = Math.min(
      Math.max(viewportPadding, rect.left + rect.width / 2 - popoverWidth / 2),
      window.innerWidth - popoverWidth - viewportPadding,
    );

    setPicker({ key, habitId, habitName, date, top, left });
    setDayNoteEditor(null);
  }

  function openDayNoteEditorAtPosition(date: string, top: number, left: number) {
    const currentNote = state.dayNotes[date] ?? "";
    const viewportPadding = 12;
    const clampedTop = Math.min(
      Math.max(viewportPadding, top),
      window.innerHeight - noteEditorHeight - viewportPadding,
    );
    const clampedLeft = Math.min(
      Math.max(viewportPadding, left),
      window.innerWidth - noteEditorWidth - viewportPadding,
    );

    setPicker(null);
    setDayNoteDraft(currentNote);
    setDayNoteEditor({ type: "day", date, top: clampedTop, left: clampedLeft });
  }

  function openEntryNoteEditorAtPosition(
    date: string,
    habitId: string,
    habitName: string,
    top: number,
    left: number,
  ) {
    const currentNote = state.entryNotes[makeEntryKey(habitId, date)] ?? "";
    const viewportPadding = 12;
    const clampedTop = Math.min(
      Math.max(viewportPadding, top),
      window.innerHeight - noteEditorHeight - viewportPadding,
    );
    const clampedLeft = Math.min(
      Math.max(viewportPadding, left),
      window.innerWidth - noteEditorWidth - viewportPadding,
    );

    setPicker(null);
    setDayNoteDraft(currentNote);
    setDayNoteEditor({
      type: "entry",
      date,
      habitId,
      habitName,
      top: clampedTop,
      left: clampedLeft,
    });
  }

  function openDayNoteEditor(event: MouseEvent<HTMLButtonElement>, date: string) {
    if (dayNoteEditor?.date === date) {
      setDayNoteEditor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const viewportPadding = 12;
    const enoughSpaceBelow =
      rect.bottom + noteEditorHeight + viewportPadding < window.innerHeight;
    const top = enoughSpaceBelow
      ? rect.bottom + 8
      : Math.max(viewportPadding, rect.top - noteEditorHeight - 8);
    const left = Math.min(
      Math.max(
        viewportPadding,
        rect.left + rect.width / 2 - noteEditorWidth / 2,
      ),
      window.innerWidth - noteEditorWidth - viewportPadding,
    );

    openDayNoteEditorAtPosition(date, top, left);
  }

  function openEntryNoteFromPicker(habitId: string, habitName: string, date: string) {
    if (!picker) return;
    openEntryNoteEditorAtPosition(date, habitId, habitName, picker.top, picker.left);
  }

  function openEntryNoteEditor(
    event: MouseEvent<HTMLButtonElement>,
    habitId: string,
    habitName: string,
    date: string,
  ) {
    const rect = event.currentTarget.getBoundingClientRect();
    const top = rect.bottom + 8;
    const left = rect.left + rect.width / 2 - noteEditorWidth / 2;
    openEntryNoteEditorAtPosition(date, habitId, habitName, top, left);
  }

  function saveDayNote() {
    if (!dayNoteEditor) return;

    const normalized = dayNoteDraft.trim();
    const dirtyMonthKeys = [getMonthInputValue(dayNoteEditor.date)];

    if (dayNoteEditor.type === "entry") {
      const entryKey = makeEntryKey(dayNoteEditor.habitId, dayNoteEditor.date);
      const nextEntryNotes = { ...state.entryNotes };

      if (normalized) {
        nextEntryNotes[entryKey] = normalized;
      } else {
        delete nextEntryNotes[entryKey];
      }

      commit(
        { ...state, entryNotes: nextEntryNotes },
        dirtyMonthKeys,
        (nextUserId, nextState) =>
          saveCloudEntryNote(
            nextUserId,
            nextState,
            dayNoteEditor.date,
            entryKey,
            nextEntryNotes[entryKey] ?? null,
          ),
      );
      setDayNoteEditor(null);
      return;
    }

    const nextDayNotes = { ...state.dayNotes };

    if (normalized) {
      nextDayNotes[dayNoteEditor.date] = normalized;
    } else {
      delete nextDayNotes[dayNoteEditor.date];
    }

    commit(
      { ...state, dayNotes: nextDayNotes },
      dirtyMonthKeys,
      (nextUserId, nextState) =>
        saveCloudDayNote(
          nextUserId,
          nextState,
          dayNoteEditor.date,
          nextDayNotes[dayNoteEditor.date] ?? null,
        ),
    );
    setDayNoteEditor(null);
  }

  function deleteDayNote() {
    if (!dayNoteEditor) return;

    if (dayNoteEditor.type === "entry") {
      const entryKey = makeEntryKey(dayNoteEditor.habitId, dayNoteEditor.date);
      const nextEntryNotes = { ...state.entryNotes };
      delete nextEntryNotes[entryKey];
      commit(
        { ...state, entryNotes: nextEntryNotes },
        [getMonthInputValue(dayNoteEditor.date)],
        (nextUserId, nextState) =>
          saveCloudEntryNote(
            nextUserId,
            nextState,
            dayNoteEditor.date,
            entryKey,
            null,
          ),
      );
      setDayNoteEditor(null);
      return;
    }

    const nextDayNotes = { ...state.dayNotes };
    delete nextDayNotes[dayNoteEditor.date];
    commit(
      { ...state, dayNotes: nextDayNotes },
      [getMonthInputValue(dayNoteEditor.date)],
      (nextUserId, nextState) =>
        saveCloudDayNote(nextUserId, nextState, dayNoteEditor.date, null),
    );
    setDayNoteEditor(null);
  }

  async function deleteHabit(habitId: string) {
    let sourceState = state;

    if (userId && cloudMeta?.firstMonth && cloudMeta?.lastMonth) {
      const allMonthKeys = getMonthKeysBetween(cloudMeta.firstMonth, cloudMeta.lastMonth);
      const missingMonthKeys = allMonthKeys.filter((monthKey) => !loadedMonthKeys.has(monthKey));

      if (missingMonthKeys.length) {
        setSyncStatus("Подгружаю историю");
        const monthState = await loadCloudMonths(userId, missingMonthKeys);
        sourceState = mergeMonthState(sourceState, monthState, missingMonthKeys);
        setState(sourceState);
        setLoadedMonthKeys(new Set(getStateMonthKeys(sourceState)));
        saveLocalState(sourceState);
      }
    }

    const idsToDelete = new Set([
      habitId,
      ...sourceState.habits
        .filter((habit) => habit.parentId === habitId)
        .map((habit) => habit.id),
    ]);
    const entries = Object.fromEntries(
      Object.entries(sourceState.entries).filter(
        ([, entry]) => !idsToDelete.has(entry.habitId),
      ),
    );
    const entryNotes = Object.fromEntries(
      Object.entries(sourceState.entryNotes).filter(([entryKey]) => {
        const habitId = entryKey.slice(12);
        return !idsToDelete.has(habitId);
      }),
    );
    const expandedProjectIds = (sourceState.preferences?.expandedProjectIds ?? []).filter(
      (projectId) => !idsToDelete.has(projectId),
    );
    const dirtyMonthKeys = getStateMonthKeys(sourceState);

    setExpandedProjects((currentProjects) => {
      const nextProjects = new Set(currentProjects);
      idsToDelete.forEach((projectId) => nextProjects.delete(projectId));
      return nextProjects;
    });

    commit({
      ...sourceState,
      habits: sourceState.habits.filter((habit) => !idsToDelete.has(habit.id)),
      entries,
      entryNotes,
      preferences: {
        ...sourceState.preferences,
        expandedProjectIds,
      },
    }, dirtyMonthKeys);
    setHabitToDelete(null);
  }

  function startAddingSubSkill(parent: Habit) {
    setNewSkillName("");
    setParentForNewSkill(parent);
  }

  function addSubSkill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parentForNewSkill) return;

    const parentId = parentForNewSkill.id;
    const name = newSkillName.trim();
    if (!name) return;

    const habit: Habit = {
      id: crypto.randomUUID(),
      name,
      area: "упражнение",
      color: parentForNewSkill.color,
      parentId,
    };

    const parentIndex = state.habits.findIndex((item) => item.id === parentId);
    let insertAt = parentIndex < 0 ? state.habits.length : parentIndex + 1;

    while (state.habits[insertAt]?.parentId === parentId) {
      insertAt += 1;
    }

    const nextHabits = [...state.habits];
    nextHabits.splice(insertAt, 0, habit);
    const nextProjects = new Set(expandedProjects);
    nextProjects.add(parentId);

    setExpandedProjects(nextProjects);
    commit({
      ...state,
      habits: nextHabits,
      preferences: {
        ...state.preferences,
        expandedProjectIds: [...nextProjects],
      },
    });
    setParentForNewSkill(null);
  }

  function startEditingHabit(habit: Habit) {
    setEditName(habit.name);
    setEditArea(habit.area);
    setHabitToEdit(habit);
  }

  function saveHabitEdits(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!habitToEdit) return;

    const name = editName.trim();
    if (!name) return;

    commit({
      ...state,
      habits: state.habits.map((habit) =>
        habit.id === habitToEdit.id
          ? { ...habit, name, area: editArea.trim() || "личное" }
          : habit,
      ),
    });
    setHabitToEdit(null);
  }

  function startEditingProfile() {
    setNicknameDraft(nickname ?? "");
    setProfileDialogOpen(true);
  }

  function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextNickname = nicknameDraft.trim();

    commit({
      ...state,
      profile: nextNickname ? { nickname: nextNickname } : {},
    });
    setProfileDialogOpen(false);
  }

  function startResettingData() {
    setProfileDialogOpen(false);
    setResetConfirmation("");
    setResetMessage("");
    setResetDataDialogOpen(true);
  }

  function closeResetDataDialog() {
    if (resetBusy) return;
    setResetDataDialogOpen(false);
  }

  async function resetAllData(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (resetBusy || resetConfirmation.trim() !== resetConfirmationPhrase) return;

    const emptyState = { ...createEmptyState(), profile: state.profile ?? {} };
    setResetBusy(true);
    setResetMessage("");

    try {
      if (userId) await resetCloudState(userId, emptyState);

      setState(emptyState);
      setCloudMeta(userId ? getCloudMetaFromState(emptyState) : null);
      setLoadedMonthKeys(new Set());
      setExpandedProjects(new Set());
      saveLocalState(emptyState);
      setPicker(null);
      setDayNoteEditor(null);
      setHabitToDelete(null);
      setHabitToEdit(null);
      setParentForNewSkill(null);
      setExpandedHabit(null);
      setChartHabit(null);
      setMonthOverviewValue(null);
      setResetDataDialogOpen(false);
      setResetConfirmation("");
      setSyncStatus(
        userId ? `Синхронизировано: ${formatSyncTime()}` : "Данные очищены",
      );
    } catch {
      setResetMessage("Не удалось удалить данные. Проверь подключение и попробуй ещё раз.");
    } finally {
      setResetBusy(false);
    }
  }

  function openChart(habit: Habit) {
    setChartHabit(habit);
    setChartRange("week");
    setChartView("donut");
  }

  async function openMonthOverview() {
    const nextMonthValue = monthValue;
    const monthKeys = [nextMonthValue];

    if (userId && cloudMeta) {
      await ensureCloudMonthsLoaded(monthKeys);
    }

    setMonthOverviewValue(nextMonthValue);
  }

  async function handleAuthClick() {
    try {
      if (userId) {
        await signOutOfGoogle();
        return;
      }

      setAuthMode("signin");
      setAuthMessage("");
    } catch (error) {
      setSyncStatus(getAuthErrorMessage(error));
    }
  }

  async function handleGoogleAuth() {
    setAuthBusy(true);
    setAuthMessage("");
    try {
      await signInWithGoogle();
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthMessage(message);
      setSyncStatus(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = authEmail.trim();
    const password = authPassword.trim();
    const passwordRepeat = authPasswordRepeat.trim();

    if (!email) {
      setAuthMessage("Укажи email");
      return;
    }

    if (password.length < 6) {
      setAuthMessage("Пароль должен быть не короче 6 символов");
      return;
    }

    if (authMode === "signup" && password !== passwordRepeat) {
      setAuthMessage("Пароли не совпадают");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      if (authMode === "signup") {
        const credential = await registerWithEmail(email, password);
        if (credential?.user) {
          await sendVerificationEmail(credential.user);
          setAuthMessage("Аккаунт создан. Письмо подтверждения отправлено");
        }
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error) {
      const message = getAuthErrorMessage(error);
      setAuthMessage(message);
      setSyncStatus(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handlePasswordReset() {
    const email = authEmail.trim();
    if (!email) {
      setAuthMessage("Сначала укажи email");
      return;
    }

    setAuthBusy(true);
    setAuthMessage("");

    try {
      await resetEmailPassword(email);
      setAuthMessage("Письмо для сброса пароля отправлено");
    } catch (error) {
      setAuthMessage(getAuthErrorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  function handleAuthModeChange(mode: AuthMode) {
    setAuthMode(mode);
    setAuthMessage("");
    if (mode === "signin") {
      setAuthPasswordRepeat("");
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"));
  }

  function saveCalendarPreferences(nextAnchorDate: string, nextPeriodDays = calendarPeriodDays) {
    commit({
      ...state,
      preferences: {
        ...state.preferences,
        calendarAnchorDate: nextAnchorDate,
        calendarPeriodDays: nextPeriodDays,
      },
    });
  }

  function goToPreviousPeriod() {
    saveCalendarPreferences(shiftDate(calendarAnchorDate, -calendarPeriodDays));
  }

  function goToNextPeriod() {
    saveCalendarPreferences(shiftDate(calendarAnchorDate, calendarPeriodDays));
  }

  function goToPreviousDay() {
    saveCalendarPreferences(shiftDate(calendarAnchorDate, -1));
  }

  function goToNextDay() {
    saveCalendarPreferences(shiftDate(calendarAnchorDate, 1));
  }

  function goToToday() {
    saveCalendarPreferences(todayKey);
  }

  function handleMonthChange(value: string) {
    saveCalendarPreferences(applyMonthToAnchor(calendarAnchorDate, value));
  }

  function handlePeriodChange(value: string) {
    saveCalendarPreferences(calendarAnchorDate, Number(value) as CalendarPeriod);
  }

  function toggleProject(projectId: string) {
    const nextProjects = new Set(expandedProjects);
    if (nextProjects.has(projectId)) {
      nextProjects.delete(projectId);
    } else {
      nextProjects.add(projectId);
    }

    setExpandedProjects(nextProjects);
    commit({
      ...state,
      preferences: {
        ...state.preferences,
        expandedProjectIds: [...nextProjects],
      },
    });
  }

  return (
    <main className="app-shell">
      <TopBar
        appVersion={appVersion}
        displayName={displayName}
        hasSync={hasFirebaseConfig}
        isSignedIn={Boolean(userId)}
        onAuthClick={handleAuthClick}
        onEditProfile={startEditingProfile}
        onToggleTheme={toggleTheme}
        syncStatus={syncStatus}
        theme={theme}
        userPhoto={userPhoto}
      />

      <TrackerBand
        dates={dates}
        monthValue={monthValue}
        periodDays={calendarPeriodDays}
        rangeLabel={rangeLabel}
        dayNotes={state.dayNotes}
        entryNotes={state.entryNotes}
        entries={state.entries}
        expandedProjects={expandedProjects}
        newArea={newArea}
        newHabit={newHabit}
        onAddHabit={addHabit}
        onAddSubSkill={startAddingSubSkill}
        onDeleteHabit={setHabitToDelete}
        onEditHabit={startEditingHabit}
        onNewAreaChange={setNewArea}
        onNewHabitChange={setNewHabit}
        onOpenChart={openChart}
        onOpenDayNoteEditor={openDayNoteEditor}
        onMonthChange={handleMonthChange}
        onOpenMonthOverview={openMonthOverview}
        onPeriodChange={handlePeriodChange}
        onPreviousPeriod={goToPreviousPeriod}
        onNextPeriod={goToNextPeriod}
        onOpenFullHabitName={setExpandedHabit}
        onToday={goToToday}
        onTogglePicker={togglePicker}
        onToggleProject={toggleProject}
        todayKey={todayKey}
        visibleHabits={visibleHabits}
      />

      <MobileTracker
        calendarAnchorDate={calendarAnchorDate}
        childrenByParent={childrenByParent}
        dayNotes={state.dayNotes}
        entryNotes={state.entryNotes}
        entries={state.entries}
        expandedProjects={expandedProjects}
        mobileDates={mobileDates}
        newArea={newArea}
        newHabit={newHabit}
        onAddHabit={addHabit}
        onAddSubSkill={startAddingSubSkill}
        onDeleteHabit={setHabitToDelete}
        onEditHabit={startEditingHabit}
        onOpenChart={openChart}
        onOpenDayNoteEditor={openDayNoteEditor}
        onOpenEntryNoteEditor={openEntryNoteEditor}
        onOpenMonthOverview={openMonthOverview}
        onNewAreaChange={setNewArea}
        onNewHabitChange={setNewHabit}
        onNextDay={goToNextDay}
        onPreviousDay={goToPreviousDay}
        onSelectDate={(date) => saveCalendarPreferences(date)}
        onSetScore={setScore}
        onToday={goToToday}
        onTogglePicker={togglePicker}
        onToggleProject={toggleProject}
        rootHabits={rootHabits}
        todayKey={todayKey}
      />

      <SummaryGrid stats={stats} />

      <ScorePopover
        hasEntryNote={Boolean(picker && state.entryNotes[picker.key])}
        onOpenEntryNote={openEntryNoteFromPicker}
        onSetScore={setScore}
        picker={picker}
        todayKey={todayKey}
      />

      <DayNoteEditor
        canDelete={
          dayNoteEditor?.type === "entry"
            ? Boolean(
                dayNoteEditor &&
                  state.entryNotes[makeEntryKey(dayNoteEditor.habitId, dayNoteEditor.date)],
              )
            : Boolean(dayNoteEditor && state.dayNotes[dayNoteEditor.date])
        }
        draft={dayNoteDraft}
        editor={dayNoteEditor}
        onChangeDraft={setDayNoteDraft}
        onClose={() => setDayNoteEditor(null)}
        onDelete={deleteDayNote}
        onSave={saveDayNote}
      />

      <DeleteHabitDialog
        habit={habitToDelete}
        hasChildren={Boolean(
          habitToDelete &&
            state.habits.some((habit) => habit.parentId === habitToDelete.id),
        )}
        onClose={() => setHabitToDelete(null)}
        onConfirm={deleteHabit}
      />

      <AddSubSkillDialog
        onChange={setNewSkillName}
        onClose={() => setParentForNewSkill(null)}
        onSubmit={addSubSkill}
        parent={parentForNewSkill}
        value={newSkillName}
      />

      <EditHabitDialog
        area={editArea}
        habit={habitToEdit}
        name={editName}
        onAreaChange={setEditArea}
        onClose={() => setHabitToEdit(null)}
        onNameChange={setEditName}
        onSubmit={saveHabitEdits}
      />

      <FullNameDialog
        habit={expandedHabit}
        onClose={() => setExpandedHabit(null)}
      />

      <ProfileDialog
        draft={nicknameDraft}
        onChange={setNicknameDraft}
        onClose={() => setProfileDialogOpen(false)}
        onResetClick={startResettingData}
        onSubmit={saveProfile}
        open={profileDialogOpen}
        userName={userName}
      />

      <ResetDataDialog
        busy={resetBusy}
        confirmation={resetConfirmation}
        message={resetMessage}
        onChange={setResetConfirmation}
        onClose={closeResetDataDialog}
        onSubmit={resetAllData}
        open={resetDataDialogOpen}
      />

      <ChartDialog
        average={chartAverage}
        bestScore={chartBestScore}
        habit={chartHabit}
        points={chartPoints}
        range={chartRange}
        scoreBreakdown={chartScoreBreakdown}
        total={chartTotal}
        view={chartView}
        onClose={() => setChartHabit(null)}
        onRangeChange={setChartRange}
        onViewChange={setChartView}
      />

      <MonthOverviewDialog
        dates={monthOverviewDates}
        dayNotes={state.dayNotes}
        entryNotes={state.entryNotes}
        entries={state.entries}
        habits={monthOverviewHabits}
        monthValue={monthOverviewValue}
        onClose={() => setMonthOverviewValue(null)}
        onNextMonth={() =>
          setMonthOverviewValue((current) =>
            current ? getMonthInputValue(shiftMonth(`${current}-15`, 1)) : current,
          )
        }
        onPreviousMonth={() =>
          setMonthOverviewValue((current) =>
            current ? getMonthInputValue(shiftMonth(`${current}-15`, -1)) : current,
          )
        }
      />

      <AuthDialog
        busy={authBusy}
        email={authEmail}
        message={authMessage}
        mode={authMode}
        password={authPassword}
        passwordRepeat={authPasswordRepeat}
        onChangeEmail={setAuthEmail}
        onChangePassword={setAuthPassword}
        onChangePasswordRepeat={setAuthPasswordRepeat}
        onClose={() => setAuthMode(null)}
        onGoogleAuth={handleGoogleAuth}
        onPasswordReset={handlePasswordReset}
        onSelectMode={handleAuthModeChange}
        onSubmit={handleEmailAuth}
      />

      <LegendBand />
    </main>
  );
}
