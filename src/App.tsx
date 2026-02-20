import { useState, useEffect, useCallback } from "react";
import type { Goal } from "./types";
import { loadGoals, saveGoals } from "./storage";
import "./App.css";

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

export default function App() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [addAmountGoalId, setAddAmountGoalId] = useState<string | null>(null);
  const [addAmountValue, setAddAmountValue] = useState("");

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
    const targetAmount = Number((fd.get("targetAmount") as string) || 0);
    const targetDate = (fd.get("targetDate") as string) || undefined;
    if (!name || targetAmount <= 0) return;

    const goal: Goal = {
      id: generateId(),
      name,
      targetAmount,
      currentAmount: 0,
      targetDate: targetDate || undefined,
      isSpent: false,
      createdAt: new Date().toISOString(),
    };
    updateGoals([...goals, goal]);
    setShowAddGoal(false);
    e.currentTarget.reset();
  };

  const addToGoal = (goalId: string) => {
    const v = Number(addAmountValue?.replace(/\s/g, "") || 0);
    if (v <= 0) return;

    const next = goals.map((g) =>
      g.id === goalId ? { ...g, currentAmount: g.currentAmount + v } : g
    );
    updateGoals(next);
    setAddAmountGoalId(null);
    setAddAmountValue("");
  };

  const markAsSpent = (goalId: string) => {
    if (!confirm("Списать накопленную сумму? Она будет вычтена из общей суммы.")) return;
    const next = goals.map((g) =>
      g.id === goalId ? { ...g, isSpent: true } : g
    );
    updateGoals(next);
  };

  const deleteGoal = (goalId: string) => {
    if (confirm("Удалить цель?")) {
      updateGoals(goals.filter((g) => g.id !== goalId));
    }
  };

  const activeGoals = goals.filter((g) => !g.isSpent);
  const spentGoals = goals.filter((g) => g.isSpent);

  return (
    <div className="app">
      <header className="header">
        <h1>Мои накопления</h1>
        <p className="subtitle">Цели для накопления</p>
      </header>

      <section className="totals">
        <div className="total-card">
          <span className="total-label">Всего накоплено</span>
          <span className="total-value">{formatMoney(totalSaved)} ₽</span>
        </div>
        {totalTarget > 0 && (
          <div className="total-card secondary">
            <span className="total-label">Цель</span>
            <span className="total-value">{formatMoney(totalTarget)} ₽</span>
          </div>
        )}
      </section>

      <div className="actions">
        <button className="btn btn-primary" onClick={() => setShowAddGoal(true)}>
          + Добавить цель
        </button>
      </div>

      {showAddGoal && (
        <div className="modal-overlay" onClick={() => setShowAddGoal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Новая цель</h2>
            <form onSubmit={addGoal}>
              <label>
                Название
                <input name="name" required placeholder="Например: Отпуск" />
              </label>
              <label>
                Сумма для накопления (₽)
                <input
                  name="targetAmount"
                  type="number"
                  min="1"
                  required
                  placeholder="100000"
                />
              </label>
              <label>
                Дата (необязательно)
                <input name="targetDate" type="date" />
              </label>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddGoal(false)}>
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

      <section className="goals-section">
        <h2>Активные цели</h2>
        {activeGoals.length === 0 ? (
          <p className="empty">Нет целей. Нажмите «Добавить цель».</p>
        ) : (
          <ul className="goal-list">
            {activeGoals.map((g) => (
              <li key={g.id} className="goal-card">
                <div className="goal-header">
                  <span className="goal-name">{g.name}</span>
                </div>
                <div className="goal-progress">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.min(100, (g.currentAmount / g.targetAmount) * 100)}%`,
                    }}
                  />
                  <span className="progress-text">
                    {formatMoney(g.currentAmount)} / {formatMoney(g.targetAmount)} ₽
                  </span>
                </div>
                {g.targetDate && (
                  <p className="goal-date">До: {new Date(g.targetDate).toLocaleDateString("ru-RU")}</p>
                )}
                <div className="goal-actions">
                  {addAmountGoalId === g.id ? (
                    <div className="add-amount-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Сумма"
                        value={addAmountValue}
                        onChange={(e) => setAddAmountValue(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addToGoal(g.id)}
                      />
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => addToGoal(g.id)}
                      >
                        +
                      </button>
                      <button
                        className="btn btn-sm"
                        onClick={() => {
                          setAddAmountGoalId(null);
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
                        onClick={() => setAddAmountGoalId(g.id)}
                      >
                        Добавить сумму
                      </button>
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => markAsSpent(g.id)}
                        title="Деньги потрачены"
                      >
                        Потрачено
                      </button>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => deleteGoal(g.id)}
                      >
                        Удалить
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {spentGoals.length > 0 && (
        <section className="goals-section spent">
          <h2>Потрачено</h2>
          <ul className="goal-list">
            {spentGoals.map((g) => (
              <li key={g.id} className="goal-card spent">
                <div className="goal-header">
                  <span className="goal-name">{g.name}</span>
                </div>
                <p className="goal-amount">Было: {formatMoney(g.currentAmount)} ₽</p>
                <button
                  className="btn btn-sm"
                  onClick={() => deleteGoal(g.id)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="footer">
        <p>Данные хранятся на устройстве (localStorage)</p>
      </footer>
    </div>
  );
}
