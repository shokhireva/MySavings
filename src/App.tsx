import { useState, useEffect, useCallback } from "react";
import EmojiPicker, { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import type { Goal, GoalColor } from "./types";
import { loadGoals, saveGoals } from "./storage";
import ConfirmModal from "./components/ConfirmModal";
import ToastContainer from "./components/ToastContainer";
import type { ToastItem } from "./components/Toast";
import "./App.css";

const DEFAULT_ICON = "🎯";
const GOAL_COLORS: GoalColor[] = ["teal", "purple", "amber", "rose", "sky", "emerald"];

function generateId() {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function parseMoneyInput(s: string): number {
  const cleaned = (s ?? "").replace(/\s/g, "").replace(/\u00a0/g, "");
  return Number(cleaned) || 0;
}

function formatMoneyInput(value: number | string): string {
  const n = typeof value === "string" ? parseMoneyInput(value) : value;
  if (n === 0 && typeof value === "string" && value !== "") return value;
  return n === 0 ? "" : formatMoney(n);
}

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addAmountGoalId, setAddAmountGoalId] = useState<string | null>(null);
  const [subtractAmountGoalId, setSubtractAmountGoalId] = useState<string | null>(null);
  const [addAmountValue, setAddAmountValue] = useState("");
  const [expandHistoryGoalId, setExpandHistoryGoalId] = useState<string | null>(null);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editIcon, setEditIcon] = useState<string>(DEFAULT_ICON);
  const [editColor, setEditColor] = useState<GoalColor>("teal");
  const [newGoalIcon, setNewGoalIcon] = useState<string>(DEFAULT_ICON);
  const [newGoalColor, setNewGoalColor] = useState<GoalColor>("teal");
  const [newGoalTargetAmount, setNewGoalTargetAmount] = useState("");
  const [showNewGoalEmojiPicker, setShowNewGoalEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [editGoalFullId, setEditGoalFullId] = useState<string | null>(null);
  const [editGoalForm, setEditGoalForm] = useState<{
    name: string;
    targetAmount: number;
    targetDate: string;
    icon: string;
    color: GoalColor;
  } | null>(null);
  const [showEditGoalEmojiPicker, setShowEditGoalEmojiPicker] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title: string;
    message: string;
    variant?: "danger" | "warning" | "info";
    icon?: string;
    onConfirm: () => void;
  } | null>(null);

  const addToast = useCallback((message: string, type: ToastItem["type"] = "success") => {
    const id = crypto.randomUUID?.() ?? Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, opts?: { variant?: "danger" | "warning" | "info"; icon?: string }) => {
      setConfirmState({
        open: true,
        title,
        message,
        onConfirm: () => {
          onConfirm();
          setConfirmState(null);
        },
        ...opts,
      });
    },
    []
  );

  const reload = useCallback(() => {
    setGoals(loadGoals());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateGoals = (next: Goal[]) => {
    setGoals(next);
    saveGoals(next);
  };

  const totalSaved = goals
    .filter((g) => !g.isSpent)
    .reduce((sum, g) => sum + g.currentAmount, 0);

  const totalTarget = goals
    .filter((g) => !g.isSpent)
    .reduce((sum, g) => sum + g.targetAmount, 0);

  const addGoal = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const targetAmount = parseMoneyInput(newGoalTargetAmount);
    const targetDate = (fd.get("targetDate") as string) || undefined;
    if (!name || targetAmount <= 0) return;

    const goal: Goal = {
      id: generateId(),
      name,
      targetAmount,
      currentAmount: 0,
      targetDate: targetDate || undefined,
      icon: newGoalIcon,
      color: newGoalColor,
      isSpent: false,
      createdAt: new Date().toISOString(),
      history: [],
    };
    updateGoals([...goals, goal]);
    setShowAddGoal(false);
    setShowNewGoalEmojiPicker(false);
    setNewGoalTargetAmount("");
    addToast(`Цель «${name}» добавлена`);
    e.currentTarget.reset();
  };

  const openEditGoal = (g: Goal) => {
    setEditGoalFullId(g.id);
    setEditGoalForm({
      name: g.name,
      targetAmount: g.targetAmount,
      targetDate: g.targetDate ?? "",
      icon: g.icon ?? DEFAULT_ICON,
      color: (g.color ?? "teal") as GoalColor,
    });
    setShowEditGoalEmojiPicker(false);
  };

  const updateGoal = (goalId: string, updates: Partial<Pick<Goal, "name" | "targetAmount" | "targetDate" | "icon" | "color">>) => {
    const next = goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g));
    updateGoals(next);
    setEditGoalFullId(null);
    setEditGoalForm(null);
    addToast("Цель обновлена");
  };

  const updateGoalStyle = (goalId: string, icon: string, color: GoalColor) => {
    const next = goals.map((g) =>
      g.id === goalId ? { ...g, icon, color } : g
    );
    updateGoals(next);
    setEditingGoalId(null);
    setShowEditEmojiPicker(false);
    addToast("Иконка и цвет обновлены");
  };

  const subtractFromGoal = (goalId: string) => {
    const v = parseMoneyInput(addAmountValue);
    if (v <= 0) return;

    const g = goals.find((x) => x.id === goalId);
    if (!g || g.currentAmount < v) {
      addToast("Недостаточно средств", "error");
      return;
    }

    const next = goals.map((goal) => {
      if (goal.id !== goalId) return goal;
      const entry = {
        id: generateId(),
        date: new Date().toISOString(),
        amount: v,
        type: "subtract" as const,
      };
      return {
        ...goal,
        currentAmount: goal.currentAmount - v,
        history: [...(goal.history ?? []), entry],
      };
    });
    updateGoals(next);
    setSubtractAmountGoalId(null);
    setAddAmountValue("");
    addToast(`Вычтено ${formatMoney(v)} ₽`);
  };

  const addToGoal = (goalId: string) => {
    const v = parseMoneyInput(addAmountValue);
    if (v <= 0) return;

    const next = goals.map((g) => {
      if (g.id !== goalId) return g;
      const entry = {
        id: generateId(),
        date: new Date().toISOString(),
        amount: v,
        type: "add" as const,
      };
      return {
        ...g,
        currentAmount: g.currentAmount + v,
        history: [...(g.history ?? []), entry],
      };
    });
    updateGoals(next);
    setAddAmountGoalId(null);
    setAddAmountValue("");
    addToast(`Добавлено ${formatMoney(v)} ₽`);
  };

  const markAsSpent = (goalId: string) => {
    showConfirm(
      "Списать сумму?",
      "Накопленная сумма будет вычтена из общей. Деньги отмечены как потраченные.",
      () => {
        const next = goals.map((goal) => {
          if (goal.id !== goalId) return goal;
          const entry = {
            id: generateId(),
            date: new Date().toISOString(),
            amount: goal.currentAmount,
            type: "spent" as const,
          };
          return {
            ...goal,
            isSpent: true,
            history: [...(goal.history ?? []), entry],
          };
        });
        updateGoals(next);
        addToast("Отмечено как потрачено");
      },
      { variant: "warning", icon: "💸" }
    );
  };

  const deleteGoal = (goalId: string) => {
    const g = goals.find((x) => x.id === goalId);
    showConfirm(
      "Удалить цель?",
      g ? `Цель «${g.name}» будет удалена безвозвратно.` : "Цель будет удалена безвозвратно.",
      () => {
        updateGoals(goals.filter((goal) => goal.id !== goalId));
        addToast("Цель удалена");
      },
      { variant: "danger", icon: "🗑️" }
    );
  };

  const activeGoals = goals.filter((g) => !g.isSpent);
  const spentGoals = goals.filter((g) => g.isSpent);

  const getGoalStyle = (g: Goal, index: number) => ({
    icon: g.icon ?? DEFAULT_ICON,
    color: (g.color ?? GOAL_COLORS[index % GOAL_COLORS.length]) as GoalColor,
  });

  return (
    <div className="app">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      {confirmState && (
        <ConfirmModal
          open={confirmState.open}
          title={confirmState.title}
          message={confirmState.message}
          variant={confirmState.variant}
          icon={confirmState.icon}
          confirmText="Да"
          cancelText="Отмена"
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
      <header className="hero">
        <h1>Мои накопления</h1>
        <p className="subtitle">Учёт целей быстро и легко</p>
      </header>

      <section className="summary">
        <div className="summary-grid">
          <div className="summary-card main">
            <span className="summary-label">Всего накоплено</span>
            <span className="summary-value">{formatMoney(totalSaved)} ₽</span>
          </div>
          {totalTarget > 0 && (
            <>
              <div className="summary-card">
                <span className="summary-label">Цель</span>
                <span className="summary-value">{formatMoney(totalTarget)} ₽</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">Прогресс</span>
                <span className="summary-value">
                  {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      <button
        className="fab"
        onClick={() => setShowAddGoal(true)}
        title="Добавить цель"
        aria-label="Добавить цель"
      >
        +
      </button>

      {showAddGoal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddGoal(false);
            setNewGoalTargetAmount("");
          }}
        >
          <div className="modal modal-scroll" onClick={(e) => e.stopPropagation()}>
            <h2>Новая цель</h2>
            <form onSubmit={addGoal}>
              <label>
                Иконка
                <div
                  className={`emoji-preview clickable ${showNewGoalEmojiPicker ? "open" : ""}`}
                  onClick={() => setShowNewGoalEmojiPicker(!showNewGoalEmojiPicker)}
                  role="button"
                  title="Нажмите для выбора"
                >
                  <span className="emoji-preview-icon">{newGoalIcon}</span>
                </div>
                {showNewGoalEmojiPicker && (
                  <div className="emoji-picker-wrap">
                    <EmojiPicker
                      width="100%"
                      height={280}
                      emojiStyle={EmojiStyle.APPLE}
                      theme={Theme.AUTO}
                      searchDisabled
                      previewConfig={{ showPreview: false }}
                      onEmojiClick={(data: EmojiClickData) => {
                        setNewGoalIcon(data.emoji);
                        setShowNewGoalEmojiPicker(false);
                      }}
                    />
                  </div>
                )}
              </label>
              <label>
                Цвет
                <div className="picker-row color-picker">
                  {GOAL_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`picker-item color-item ${color} ${newGoalColor === color ? "selected" : ""}`}
                      onClick={() => setNewGoalColor(color)}
                      aria-label={`Цвет ${color}`}
                    />
                  ))}
                </div>
              </label>
              <label>
                Название
                <input name="name" required placeholder="Например: Отпуск" />
              </label>
              <label>
                Сумма для накопления (₽)
                <input
                  name="targetAmount"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="100 000"
                  value={newGoalTargetAmount}
                  onChange={(e) =>
                    setNewGoalTargetAmount(formatMoneyInput(e.target.value))
                  }
                />
              </label>
              <label>
                Дата (необязательно)
                <input name="targetDate" type="date" />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setShowAddGoal(false);
                    setNewGoalTargetAmount("");
                  }}
                >
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Добавить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className="goals-section content">
        <h2 className="section-title">Активные цели</h2>
        {activeGoals.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎯</div>
            <p>Нет целей</p>
            <p>Нажмите + чтобы добавить цель</p>
          </div>
        ) : (
          <ul className="goal-list">
            {activeGoals.map((g, i) => {
              const { icon, color } = getGoalStyle(g, i);
              return (
              <li key={g.id} className="goal-card">
                <div className="goal-header">
                  <span
                    className={`goal-icon ${color} clickable`}
                    onClick={() => {
                      setEditIcon(icon);
                      setEditColor(color);
                      setShowEditEmojiPicker(false);
                      setEditingGoalId(g.id);
                    }}
                    title="Изменить иконку и цвет"
                    role="button"
                  >
                    {icon}
                  </span>
                  <span className="goal-name">{g.name}</span>
                  <button
                    type="button"
                    className="btn-delete-icon"
                    onClick={() => deleteGoal(g.id)}
                    title="Удалить"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
                <div className="goal-progress-wrap">
                  <div className="goal-progress">
                    <div
                      className={`progress-bar ${color}`}
                      style={{
                        width: `${Math.min(100, (g.currentAmount / g.targetAmount) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)} ₽
                  </span>
                </div>
                {g.targetDate && (
                  <p className="goal-date">До: {new Date(g.targetDate).toLocaleDateString("ru-RU")}</p>
                )}
                <div className="goal-actions">
                  <div className="goal-actions-row goal-actions-row--money">
                    {addAmountGoalId === g.id ? (
                      <div className="amount-input-row">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Сумма"
                          value={addAmountValue}
                          onChange={(e) =>
                            setAddAmountValue(formatMoneyInput(e.target.value))
                          }
                          onKeyDown={(e) => e.key === "Enter" && addToGoal(g.id)}
                        />
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => addToGoal(g.id)}
                        >
                          +
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => {
                            setAddAmountGoalId(null);
                            setAddAmountValue("");
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : subtractAmountGoalId === g.id ? (
                      <div className="amount-input-row">
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Сумма"
                          value={addAmountValue}
                          onChange={(e) =>
                            setAddAmountValue(formatMoneyInput(e.target.value))
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && subtractFromGoal(g.id)
                          }
                        />
                        <button
                          className="btn btn-sm btn-subtract"
                          onClick={() => subtractFromGoal(g.id)}
                        >
                          −
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => {
                            setSubtractAmountGoalId(null);
                            setAddAmountValue("");
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setAddAmountGoalId(g.id);
                            setSubtractAmountGoalId(null);
                          }}
                        >
                          + Добавить
                        </button>
                        <button
                          className="btn btn-sm btn-subtract-outline"
                          onClick={() => {
                            setSubtractAmountGoalId(g.id);
                            setAddAmountGoalId(null);
                          }}
                          disabled={g.currentAmount <= 0}
                        >
                          − Вычесть
                        </button>
                      </>
                    )}
                  </div>
                  <div className="goal-actions-row goal-actions-row--main">
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => openEditGoal(g)}
                    >
                      Изменить
                    </button>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={() => markAsSpent(g.id)}
                      disabled={g.currentAmount < g.targetAmount}
                      title={g.currentAmount >= g.targetAmount ? "Деньги потрачены" : "Накопите полную сумму"}
                    >
                      Потрачено
                    </button>
                  </div>
                  <div className="goal-actions-row goal-actions-row--history">
                    <button
                      className="btn btn-sm btn-history-toggle"
                      onClick={() =>
                        setExpandHistoryGoalId(
                          expandHistoryGoalId === g.id ? null : g.id
                        )
                      }
                    >
                      {expandHistoryGoalId === g.id
                        ? "▲ Свернуть историю"
                        : "▼ История" + ((g.history?.length ?? 0) > 0 ? ` (${g.history?.length ?? 0})` : "")}
                    </button>
                  </div>
                  {expandHistoryGoalId === g.id && (
                    <div className="goal-history-inline">
                      {(g.history?.length ?? 0) === 0 ? (
                        <p className="history-empty-inline">История пуста</p>
                      ) : (
                        <ul className="history-list-inline">
                          {[...(g.history ?? [])]
                            .reverse()
                            .map((entry) => (
                              <li
                                key={entry.id}
                                className={`history-item history-item--${entry.type}`}
                              >
                                <span className="history-type">
                                  {entry.type === "add" ? "+" : "−"}
                                </span>
                                <span className="history-amount">
                                  {formatMoney(entry.amount)} ₽
                                </span>
                                <span className="history-date">
                                  {new Date(entry.date).toLocaleString(
                                    "ru-RU",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        )}
      </section>

      {editGoalFullId && editGoalForm && (() => {
        const handleEditSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          const name = editGoalForm.name.trim();
          const targetAmount = editGoalForm.targetAmount;
          if (!name || targetAmount <= 0) return;
          updateGoal(editGoalFullId!, {
            name,
            targetAmount,
            targetDate: editGoalForm.targetDate || undefined,
            icon: editGoalForm.icon,
            color: editGoalForm.color,
          });
        };
        return (
        <div className="modal-overlay" onClick={() => { setEditGoalFullId(null); setEditGoalForm(null); }}>
          <div className="modal modal-scroll" onClick={(e) => e.stopPropagation()}>
            <h2>Редактировать цель</h2>
            <form onSubmit={handleEditSubmit}>
              <label>Иконка</label>
              <div
                className={`emoji-preview clickable ${showEditGoalEmojiPicker ? "open" : ""}`}
                onClick={() => setShowEditGoalEmojiPicker(!showEditGoalEmojiPicker)}
                role="button"
              >
                <span className="emoji-preview-icon">{editGoalForm.icon}</span>
              </div>
              {showEditGoalEmojiPicker && (
                <div className="emoji-picker-wrap">
                  <EmojiPicker
                    width="100%"
                    height={280}
                    emojiStyle={EmojiStyle.APPLE}
                    theme={Theme.AUTO}
                    searchDisabled
                    previewConfig={{ showPreview: false }}
                    onEmojiClick={(data: EmojiClickData) =>
                      setEditGoalForm((f) => f && { ...f, icon: data.emoji })
                    }
                  />
                </div>
              )}
              <label>Цвет</label>
              <div className="picker-row color-picker">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`picker-item color-item ${c} ${editGoalForm.color === c ? "selected" : ""}`}
                    onClick={() => setEditGoalForm((f) => f && { ...f, color: c })}
                  />
                ))}
              </div>
              <label>Название</label>
              <input
                value={editGoalForm.name}
                onChange={(e) => setEditGoalForm((f) => f && { ...f, name: e.target.value })}
                required
                placeholder="Например: Отпуск"
              />
              <label>Сумма для накопления (₽)</label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={editGoalForm.targetAmount ? formatMoney(editGoalForm.targetAmount) : ""}
                onChange={(e) =>
                  setEditGoalForm((f) =>
                    f ? { ...f, targetAmount: parseMoneyInput(e.target.value) } : f
                  )
                }
              />
              <label>Дата (необязательно)</label>
              <input
                type="date"
                value={editGoalForm.targetDate}
                onChange={(e) => setEditGoalForm((f) => f && { ...f, targetDate: e.target.value })}
              />
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => { setEditGoalFullId(null); setEditGoalForm(null); }}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {editingGoalId && (
        <div className="modal-overlay" onClick={() => { setEditingGoalId(null); setShowEditEmojiPicker(false); }}>
          <div className="modal modal-compact modal-scroll" onClick={(e) => e.stopPropagation()}>
            <h2>Иконка и цвет</h2>
            <label>
              Иконка
              <div
                className={`emoji-preview clickable ${showEditEmojiPicker ? "open" : ""}`}
                onClick={() => setShowEditEmojiPicker(!showEditEmojiPicker)}
                role="button"
                title="Нажмите для выбора"
              >
                <span className="emoji-preview-icon">{editIcon}</span>
              </div>
              {showEditEmojiPicker && (
                <div className="emoji-picker-wrap">
                  <EmojiPicker
                    width="100%"
                    height={280}
                    emojiStyle={EmojiStyle.APPLE}
                    theme={Theme.AUTO}
                    searchDisabled
                    previewConfig={{ showPreview: false }}
                    onEmojiClick={(data: EmojiClickData) => {
                      setEditIcon(data.emoji);
                      setShowEditEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </label>
            <label>
              Цвет
              <div className="picker-row color-picker">
                {GOAL_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`picker-item color-item ${c} ${editColor === c ? "selected" : ""}`}
                    onClick={() => setEditColor(c)}
                  />
                ))}
              </div>
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  updateGoalStyle(editingGoalId, editIcon, editColor);
                }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {spentGoals.length > 0 && (
        <section className="goals-section spent content">
          <h2 className="section-title">Потрачено</h2>
          <ul className="goal-list">
            {spentGoals.map((g, i) => {
              const { icon, color } = getGoalStyle(g, i);
              return (
              <li key={g.id} className="goal-card spent">
                <div className="goal-header">
                  <span
                    className={`goal-icon ${color} clickable`}
                    onClick={() => {
                      setEditIcon(icon);
                      setEditColor(color);
                      setShowEditEmojiPicker(false);
                      setEditingGoalId(g.id);
                    }}
                    title="Изменить иконку и цвет"
                    role="button"
                  >
                    {icon}
                  </span>
                  <span className="goal-name">{g.name}</span>
                  <button
                    type="button"
                    className="btn-delete-icon"
                    onClick={() => deleteGoal(g.id)}
                    title="Удалить"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <line x1="10" y1="11" x2="10" y2="17" />
                      <line x1="14" y1="11" x2="14" y2="17" />
                    </svg>
                  </button>
                </div>
                <p className="goal-amount">Было: {formatMoney(g.currentAmount)} ₽</p>
                <div className="goal-actions">
                  <div className="goal-actions-row goal-actions-row--history">
                    <button
                      className="btn btn-sm btn-history-toggle"
                      onClick={() =>
                        setExpandHistoryGoalId(
                          expandHistoryGoalId === g.id ? null : g.id
                        )
                      }
                    >
                      {expandHistoryGoalId === g.id
                        ? "▲ Свернуть историю"
                        : "▼ История" + ((g.history?.length ?? 0) > 0 ? ` (${g.history?.length ?? 0})` : "")}
                    </button>
                  </div>
                  {expandHistoryGoalId === g.id && (
                    <div className="goal-history-inline">
                      {(g.history?.length ?? 0) === 0 ? (
                        <p className="history-empty-inline">История пуста</p>
                      ) : (
                        <ul className="history-list-inline">
                          {[...(g.history ?? [])]
                            .reverse()
                            .map((entry) => (
                              <li
                                key={entry.id}
                                className={`history-item history-item--${entry.type}`}
                              >
                                <span className="history-type">
                                  {entry.type === "add" ? "+" : "−"}
                                </span>
                                <span className="history-amount">
                                  {formatMoney(entry.amount)} ₽
                                </span>
                                <span className="history-date">
                                  {new Date(entry.date).toLocaleString(
                                    "ru-RU",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </span>
                              </li>
                            ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </li>
            );
            })}
          </ul>
        </section>
      )}

      <footer className="footer">
        <p>Данные хранятся на устройстве (localStorage)</p>
      </footer>
    </div>
  );
}
