import { useState } from "react";
import { MissionModal } from "../components/modals/MissionModal";
import { ProgressBar, StatCard } from "../components/ui";
import { useApp } from "../state/AppContext";
import type { Mission } from "../types";
import { formatPoints, formatToday } from "../utils/format";

/** ホーム：今日のランダムクエスト・掃除状況・おすすめ */
export function HomePage() {
  const { user, masters, currentMission, shuffleMission, completeMission, navigate, toast } = useApp();
  const [missionOpen, setMissionOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);
  const { stats } = user;
  const tool = masters.tools[0];
  const challenge = masters.challenge;

  const startMission = () => {
    setModalKey((k) => k + 1); // チェック状態をリセット
    setMissionOpen(true);
  };
  const finishMission = async () => {
    if (!currentMission) return;
    if (await completeMission()) {
      setMissionOpen(false);
      toast(`ミッション達成！ +${currentMission.points} pt 🎉`);
    }
  };
  const nextMission = () => {
    shuffleMission();
    toast("新しいミッションを選びました！");
  };

  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">YOUR DAILY CLEANING QUEST</div>
          <h1 className="h1">{user.profile.name}さん、おはようございます！</h1>
          <p className="sub">今日も少しずつ、お部屋をきれいにしましょう。</p>
        </div>
        <span className="sub">{formatToday()}</span>
      </div>

      <div className="stats">
        <StatCard label="保有ポイント" symbol="🪙" value={`${formatPoints(stats.pointsBalance)} pt`} note="報酬ショップで使えます" />
        <StatCard label="現在のレベル" symbol="🏅" value={`Lv.${stats.level}`} note={`次のレベルまで ${stats.pointsToNextLevel} pt`} />
        <StatCard label="今週の掃除" symbol="✨" value={`${stats.weeklyCount} 回`} note={stats.weeklyCount ? "今週もいいペースです" : "今週の1回目をやってみよう"} />
      </div>

      <div className="home-grid">
        {currentMission ? (
          <QuestCard mission={currentMission} onStart={startMission} onShuffle={nextMission} />
        ) : (
          <div className="card quest"><div className="quest-body muted">現在ミッションはありません。</div></div>
        )}

        <div className="right-stack">
          <TodayProgressCard />

          {tool && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">おすすめ掃除用品</span>
                <button className="soft small" onClick={() => navigate("tools")}>すべて見る</button>
              </div>
              <div className="product-mini">
                <div className="product-thumb">{tool.emoji}</div>
                <div>
                  <strong>{tool.name}</strong>
                  <p>{tool.desc}</p>
                  <span className="muted" style={{ fontSize: 10 }}>商品詳細を見る →</span>
                </div>
              </div>
            </div>
          )}

          {challenge && (
            <div className="card">
              <div className="card-head">
                <span className="card-title">今週のチャレンジ</span>
                <span>🔥</span>
              </div>
              <strong style={{ fontSize: 14 }}>{challenge.title}</strong>
              <p className="muted" style={{ fontSize: 11 }}>
                達成するとボーナス +{challenge.bonus} pt（現在 {Math.min(stats.streakDays, challenge.target)} / {challenge.target} 日）
              </p>
              <ProgressBar value={stats.streakDays / challenge.target} color="#f4b942" />
            </div>
          )}
        </div>
      </div>

      {currentMission && (
        <MissionModal key={modalKey} open={missionOpen} mission={currentMission} onClose={() => setMissionOpen(false)} onComplete={finishMission} />
      )}
    </>
  );
}

function QuestCard({ mission, onStart, onShuffle }: { mission: Mission; onStart: () => void; onShuffle: () => void }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = mission.image && failedSrc !== mission.image;

  return (
    <div className="card quest">
      <div className="quest-top">
        <span className="tag">✦ TODAY'S RANDOM QUEST</span>
        <span className="badge">NEW MISSION</span>
      </div>
      <div className="quest-body">
        <div className="quest-image">
          {showImage ? (
            <img src={mission.image!} alt={mission.name} onError={() => setFailedSrc(mission.image)} />
          ) : (
            <div className="image-fallback">{mission.emoji}</div>
          )}
        </div>
        <h2>{mission.name}</h2>
        <p className="quest-desc">{mission.comment}</p>
        <div className="quest-meta">
          <div className="meta-box">◷ 所要時間<strong>{mission.time}</strong></div>
          <div className="meta-box">🎁 獲得報酬<strong>{mission.points} pt</strong></div>
        </div>
        <div className="quest-actions">
          <button className="primary" onClick={onStart}>▶ 掃除を開始する</button>
          <button className="secondary" onClick={onShuffle}>⟳ 別のミッション</button>
        </div>
      </div>
    </div>
  );
}

function TodayProgressCard() {
  const { user } = useApp();
  const done = user.tasks.filter((t) => t.done).length;
  const total = user.tasks.length;

  return (
    <div className="card">
      <div className="card-head">
        <span className="card-title">今日の掃除状況</span>
        <span className="muted">{done} / {total}</span>
      </div>
      <ProgressBar value={total ? done / total : 0} />
      <div>
        {user.tasks.slice(0, 4).map((t) => (
          <div key={t.id} className="task-mini">
            <span className={`checkdot${t.done ? " done" : ""}`}>{t.done ? "✓" : ""}</span>
            <span>{t.name}</span>
            {t.done && <span className="status">完了</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
