import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const QUESTIONS = [
  { key: "age", title: "Qual sua idade?", type: "number", placeholder: "Ex.: 35" },
  { key: "sex", title: "Sexo", options: ["Feminino", "Masculino"] },
  { key: "height", title: "Qual sua altura?", type: "number", suffix: "cm", placeholder: "Ex.: 170" },
  { key: "weight", title: "Qual seu peso atual?", type: "number", suffix: "kg", placeholder: "Ex.: 80" },
  { key: "goal", title: "Qual seu objetivo principal?", options: ["Emagrecer", "Manter", "Ganhar Massa", "Melhorar Alimentação"] },
  { key: "activity", title: "Como é seu nível de atividade?", options: ["Sedentário", "Pouco ativo", "Moderadamente ativo", "Muito ativo"] },
  { key: "meals", title: "Quantas refeições você prefere fazer?", options: ["2", "3", "4", "5", "6+"] },
  { key: "allergies", title: "Possui alguma alergia ou intolerância?", options: ["Nenhuma", "Leite", "Lactose", "Glúten", "Trigo", "Ovo", "Amendoim", "Castanhas", "Frutos do mar", "Soja"] },
  { key: "health", title: "Possui alguma condição de saúde?", options: ["Nenhuma", "Diabetes", "Hipertensão", "SOP", "Refluxo", "Gastrite"] },
  { key: "pregnancy", title: "Gestante ou amamentando?", options: ["Não", "Gestante", "Amamentando"] },
  { key: "water", title: "Quanto de água você bebe por dia?", options: ["Menos de 1L", "1–1,5L", "1,5–2L", "Mais de 2L"] },
  { key: "budget", title: "Qual sua preferência de orçamento?", options: ["Econômico", "Equilibrar preço e variedade", "Maior variedade"] }
];

const MEAL_POOL = [
  { name: "Café da manhã", food: "Ovos mexidos + banana + aveia", tags: ["Ovo"] },
  { name: "Café da manhã", food: "Tapioca + frango desfiado + fruta", tags: ["Trigo"] },
  { name: "Café da manhã", food: "Aveia + banana + pasta de amendoim", tags: ["Amendoim"] },
  { name: "Café da manhã", food: "Pão integral + ovos + fruta", tags: ["Ovo", "Trigo"] },
  { name: "Almoço", food: "Frango grelhado + arroz + feijão + legumes", tags: [] },
  { name: "Almoço", food: "Carne magra + batata + salada variada", tags: [] },
  { name: "Almoço", food: "Peixe + arroz + feijão + legumes", tags: ["Frutos do mar"] },
  { name: "Almoço", food: "Frango + mandioca + legumes", tags: [] },
  { name: "Lanche", food: "Fruta + pasta de amendoim", tags: ["Amendoim"] },
  { name: "Lanche", food: "Banana + aveia", tags: [] },
  { name: "Lanche", food: "Iogurte + fruta", tags: ["Leite", "Lactose"] },
  { name: "Lanche", food: "Ovos cozidos + fruta", tags: ["Ovo"] },
  { name: "Jantar", food: "Frango + batata + salada", tags: [] },
  { name: "Jantar", food: "Arroz + feijão + carne magra + legumes", tags: [] },
  { name: "Jantar", food: "Omelete + salada + batata", tags: ["Ovo"] },
  { name: "Jantar", food: "Peixe + mandioca + legumes", tags: ["Frutos do mar"] },
  { name: "Ceia", food: "Fruta + aveia", tags: [] },
  { name: "Ceia", food: "Iogurte + fruta", tags: ["Leite", "Lactose"] }
];

const STORAGE = "calculadora-sem-rebote-v2";

function estimate(data) {
  const weight = Number(data.weight) || 0;
  const height = Number(data.height) || 0;
  const age = Number(data.age) || 0;
  const sexFactor = data.sex === "Masculino" ? 5 : -161;
  const bmr = weight && height && age ? 10 * weight + 6.25 * height - 5 * age + sexFactor : weight * 20;
  const activity = { "Sedentário": 1.2, "Pouco ativo": 1.35, "Moderadamente ativo": 1.5, "Muito ativo": 1.7 }[data.activity] || 1.2;
  let calories = Math.round(bmr * activity);
  if (data.goal === "Emagrecer") calories = Math.round(calories * 0.9);
  if (data.goal === "Ganhar Massa") calories = Math.round(calories * 1.08);
  return {
    calories: Math.max(1200, calories || 0),
    protein: Math.round(weight * (data.goal === "Ganhar Massa" ? 1.6 : 1.4)),
    water: Math.max(1, (weight * 0.035).toFixed(1))
  };
}

function compatibleMeals(data) {
  const allergy = data.allergies;
  const blocked = allergy && allergy !== "Nenhuma" ? [allergy] : [];
  const filtered = MEAL_POOL.filter(m => !m.tags.some(tag => blocked.includes(tag)));
  const names = data.meals === "2" ? ["Café da manhã", "Almoço"] :
    data.meals === "3" ? ["Café da manhã", "Almoço", "Jantar"] :
    data.meals === "4" ? ["Café da manhã", "Almoço", "Lanche", "Jantar"] :
    data.meals === "5" ? ["Café da manhã", "Lanche", "Almoço", "Lanche", "Jantar"] :
    ["Café da manhã", "Lanche", "Almoço", "Lanche", "Jantar", "Ceia"];
  const used = {};
  return names.map((name, i) => {
    const choices = filtered.filter(m => m.name === name);
    const source = choices.length ? choices : MEAL_POOL.filter(m => m.name === name);
    const pick = source[(used[name] || 0) % source.length];
    used[name] = (used[name] || 0) + 1;
    return { ...pick, id: i + "-" + name };
  });
}

function App() {
  const [screen, setScreen] = useState(0);
  const [data, setData] = useState({});
  const [menu, setMenu] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(parsed.data || {});
        if (parsed.screen === 99) {
          setScreen(99);
          setMenu(parsed.menu || []);
        }
      }
    } catch {}
  }, []);

  const metrics = useMemo(() => estimate(data), [data]);
  const question = QUESTIONS[screen - 1];
  const progress = screen > 0 && screen < 99 ? Math.round((screen / QUESTIONS.length) * 100) : 0;

  function update(key, value) {
    setData(prev => ({ ...prev, [key]: value }));
  }

  function start() {
    setScreen(1);
  }

  function next() {
    if (!question) return;
    const value = data[question.key];
    if (value === undefined || value === "") return;
    if (screen < QUESTIONS.length) {
      setScreen(screen + 1);
    } else {
      const generated = compatibleMeals(data);
      setMenu(generated);
      setScreen(99);
      localStorage.setItem(STORAGE, JSON.stringify({ data, menu: generated, screen: 99 }));
      setSaved(true);
    }
  }

  function back() {
    if (screen > 1 && screen < 99) setScreen(screen - 1);
    else if (screen === 1) setScreen(0);
  }

  function regenerate(index) {
    const current = menu[index];
    const choices = MEAL_POOL.filter(m => m.name === current.name && !(data.allergies && data.allergies !== "Nenhuma" && m.tags.includes(data.allergies)));
    if (!choices.length) return;
    const currentIndex = choices.findIndex(x => x.food === current.food);
    const nextMeal = choices[(currentIndex + 1) % choices.length];
    setMenu(prev => prev.map((m, i) => i === index ? { ...nextMeal, id: m.id } : m));
    setSaved(false);
  }

  function reset() {
    localStorage.removeItem(STORAGE);
    setData({});
    setMenu([]);
    setScreen(0);
    setSaved(false);
  }

  const canStart = Number(data.weight) > 0;

  return (
    <main>
      <header><div className="brand"><span className="brand-mark">SR</span><div><strong>SEM REBOTE</strong><small>Calculadora personalizada</small></div></div></header>
      <div className="wrap">
        {screen === 0 && (
          <section className="hero">
            <span className="eyebrow">CALCULADORA SEM REBOTE</span>
            <h1>Monte seu plano alimentar de forma simples.</h1>
            <p>Responda algumas perguntas e receba uma estimativa geral de calorias, proteína, hidratação e um cardápio organizado de acordo com suas preferências.</p>
            <div className="card intro-card">
              <div className="field"><label>Peso atual</label><div className="input-wrap"><input type="number" min="1" value={data.weight || ""} onChange={e => update("weight", e.target.value)} placeholder="Ex.: 80" /><span>kg</span></div></div>
              {canStart && <div className="preview-metrics"><Metric value={metrics.calories} label="kcal/dia" /><Metric value={metrics.protein + "g"} label="proteína/dia" /><Metric value={metrics.water + "L"} label="água/dia" /></div>}
              <button disabled={!canStart} onClick={start}>Começar anamnese <span>→</span></button>
            </div>
            <p className="micro">Estimativas gerais para orientação. Não substitui avaliação individual de profissional de saúde.</p>
          </section>
        )}

        {screen > 0 && screen < 99 && (
          <section className="question-screen">
            <div className="topline"><button className="back" onClick={back}>← Voltar</button><span>{screen} de {QUESTIONS.length}</span></div>
            <div className="progress"><i style={{ width: progress + "%" }} /></div>
            <span className="eyebrow">SEU PERFIL · {progress}%</span>
            <h1>{question.title}</h1>
            {question.type ? (
              <div className="field large"><div className="input-wrap"><input autoFocus type={question.type} min="1" value={data[question.key] || ""} onChange={e => update(question.key, e.target.value)} placeholder={question.placeholder} /><span>{question.suffix}</span></div></div>
            ) : (
              <div className="options">{question.options.map(option => <button key={option} className={data[question.key] === option ? "selected" : ""} onClick={() => update(question.key, option)}>{option}<span>{data[question.key] === option ? "✓" : "○"}</span></button>)}</div>
            )}
            <button className="continue" disabled={!data[question.key]} onClick={next}>Continuar <span>→</span></button>
          </section>
        )}

        {screen === 99 && (
          <section className="result">
            <span className="eyebrow">PERFIL CONCLUÍDO</span>
            <h1>Seu guia está pronto.</h1>
            <p>Use os números abaixo como referência geral e ajuste sua alimentação conforme sua realidade e orientação profissional.</p>
            <div className="metrics-grid"><Metric value={metrics.calories} label="kcal/dia" /><Metric value={metrics.protein + "g"} label="proteína/dia" /><Metric value={metrics.water + "L"} label="água/dia" /></div>
            <div className="profile-summary card">
              <div><small>Objetivo</small><strong>{data.goal}</strong></div>
              <div><small>Atividade</small><strong>{data.activity}</strong></div>
              <div><small>Refeições</small><strong>{data.meals} por dia</strong></div>
              <div><small>Preferência</small><strong>{data.budget}</strong></div>
            </div>
            <div className="menu-head"><div><span className="eyebrow">CARDÁPIO</span><h2>Suas refeições</h2></div>{saved && <span className="saved">✓ Salvo neste dispositivo</span>}</div>
            {menu.map((meal, i) => <article className="meal card" key={meal.id}><div className="meal-number">{String(i + 1).padStart(2, "0")}</div><div className="meal-body"><small>{meal.name}</small><strong>{meal.food}</strong><button onClick={() => regenerate(i)}>Trocar refeição ↻</button></div></article>)}
            <div className="notice"><strong>Importante</strong><p>As estimativas são gerais e podem variar conforme idade, composição corporal, rotina e outras características individuais. Em caso de gestação, amamentação, condição de saúde, alergia ou intolerância, procure orientação profissional antes de seguir qualquer plano alimentar.</p></div>
            <button className="secondary" onClick={reset}>Refazer calculadora</button>
          </section>
        )}
      </div>
    </main>
  );
}

function Metric({ value, label }) {
  return <div className="metric"><strong>{value}</strong><small>{label}</small></div>;
}

createRoot(document.getElementById("root")).render(<App />);
