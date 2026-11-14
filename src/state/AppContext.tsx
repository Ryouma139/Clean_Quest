import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import * as api from "../api/cleanQuest";
import { toJaError } from "../lib/errors";
import type { CleaningTask, MasterData, Mission, MissionPhotos, NewTaskInput, PageId, Reward, UserData } from "../types";

interface AppContextValue {
  masters: MasterData;
  user: UserData;
  currentMission: Mission | null;
  page: PageId;
  navigate: (page: PageId) => void;
  toast: (message: string) => void;
  signOut: () => void;
  /** ランダムに別のミッションを選ぶ */
  shuffleMission: () => void;
  /** 「ご褒美を選ぶ」画面で表示中の報酬ID（null なら全報酬） */
  selectedRewardId: string | null;
  /** 「ご褒美を選ぶ」画面を開く */
  openRewardItems: (rewardId: string | null) => void;
  /** マスタ（報酬・掃除用品など）を取り直す（管理画面で変更したあとに使う） */
  reloadMasters: () => Promise<void>;
  // 以下は成功時 true（失敗時はトーストでエラーを表示して false）
  completeMission: (photos?: MissionPhotos) => Promise<boolean>;
  /** ログイン中のユーザーID（写真の保存先フォルダに使う） */
  userId: string;
  toggleTask: (task: CleaningTask) => Promise<boolean>;
  addTask: (input: NewTaskInput) => Promise<boolean>;
  redeem: (reward: Reward) => Promise<boolean>;
}

const AppContext = createContext<AppContextValue | null>(null);

interface Props {
  userId: string;
  page: PageId;
  navigate: (page: PageId) => void;
  toast: (message: string) => void;
  signOut: () => void;
  children: ReactNode;
}

const randomIndex = (n: number, exclude = -1) => {
  if (n <= 1) return 0;
  let i: number;
  do i = Math.floor(Math.random() * n);
  while (i === exclude);
  return i;
};

export function AppProvider({ userId, page, navigate, toast, signOut, children }: Props) {
  const [masters, setMasters] = useState<MasterData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [missionIndex, setMissionIndex] = useState(0);
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const busy = useRef(false);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [m, u] = await Promise.all([api.fetchMasterData(), api.fetchUserData(userId)]);
      setMasters(m);
      setUser(u);
      setMissionIndex(randomIndex(m.missions.length));
    } catch (e) {
      setLoadError(toJaError(e));
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 書き込み → ユーザーデータ再取得。二重送信は無視する */
  const run = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      if (busy.current) return false;
      busy.current = true;
      try {
        await fn();
        setUser(await api.fetchUserData(userId));
        return true;
      } catch (e) {
        toast(toJaError(e));
        return false;
      } finally {
        busy.current = false;
      }
    },
    [userId, toast],
  );

  const value = useMemo<AppContextValue | null>(() => {
    if (!masters || !user) return null;
    const currentMission = masters.missions[missionIndex] ?? null;
    return {
      masters,
      user,
      currentMission,
      page,
      navigate,
      toast,
      signOut,
      shuffleMission: () => setMissionIndex((i) => randomIndex(masters.missions.length, i)),
      selectedRewardId,
      openRewardItems: (rewardId) => {
        setSelectedRewardId(rewardId);
        navigate("rewardItems");
      },
      reloadMasters: async () => {
        try {
          setMasters(await api.fetchMasterData());
        } catch (e) {
          toast(toJaError(e));
        }
      },
      userId,
      completeMission: (photos) => (currentMission ? run(() => api.completeMission(currentMission.id, photos)) : Promise.resolve(false)),
      toggleTask: (task) => run(() => (task.done ? api.undoTask(task.id) : api.completeTask(task.id))),
      addTask: (input) => run(() => api.addTask(input)),
      redeem: (reward) => run(() => api.redeemReward(reward.id)),
    };
  }, [masters, user, userId, missionIndex, selectedRewardId, page, navigate, toast, signOut, run]);

  if (loadError) {
    return (
      <div className="center-screen">
        <p>{loadError}</p>
        <div className="quest-actions">
          <button className="primary" onClick={load}>再読み込み</button>
          <button className="secondary" onClick={signOut}>ログアウト</button>
        </div>
      </div>
    );
  }
  if (!value) return <div className="center-screen muted">読み込み中…</div>;

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
