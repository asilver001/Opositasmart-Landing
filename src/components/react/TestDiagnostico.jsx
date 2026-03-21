import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const TOPIC_CONFIG = [
  { tema: 1, name: 'CE: Tít. Preliminar', short: 'T1', count: 5 },
  { tema: 2, name: 'CE: Derechos', short: 'T2', count: 4 },
  { tema: 3, name: 'CE: Corona/Cortes', short: 'T3', count: 5 },
  { tema: 4, name: 'CE: PJ y TC', short: 'T4', count: 5 },
  { tema: 5, name: 'Gobierno', short: 'T5', count: 4 },
  { tema: 6, name: 'Admin. electrónica', short: 'T6', count: 2 },
  { tema: 7, name: 'Transparencia', short: 'T7', count: 2 },
  { tema: 8, name: 'LRJSP', short: 'T8', count: 5 },
  { tema: 9, name: 'LPAC', short: 'T9', count: 5 },
  { tema: 10, name: 'Protección datos', short: 'T10', count: 3 },
  { tema: 11, name: 'Sector público', short: 'T11', count: 4 },
  { tema: 12, name: 'Presupuestos', short: 'T12', count: 3 },
  { tema: 13, name: 'Empleo público', short: 'T13', count: 3 },
];

const SCORE_CORRECT = 1;
const SCORE_INCORRECT = -1 / 3;

function barColor(pct) {
  if (pct >= 70) return '#10B981';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

export default function TestDiagnostico() {
  const [phase, setPhase] = useState('intro'); // intro | loading | test | results
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);
  const timerRef = useRef(null);

  // Timer
  useEffect(() => {
    if (phase === 'test' && startTime) {
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase, startTime]);

  async function loadQuestions() {
    setPhase('loading');
    const allQuestions = [];

    for (const tc of TOPIC_CONFIG) {
      const { data } = await supabase
        .from('questions')
        .select('id, question_text, options, explanation, tema, difficulty')
        .eq('is_active', true)
        .eq('tema', tc.tema)
        .limit(tc.count * 3); // fetch extra, then pick random

      if (data && data.length > 0) {
        const shuffled = data.sort(() => Math.random() - 0.5).slice(0, tc.count);
        allQuestions.push(...shuffled);
      }
    }

    // Shuffle all questions
    setQuestions(allQuestions.sort(() => Math.random() - 0.5));
    setAnswers(new Array(allQuestions.length).fill(null));
    setStartTime(Date.now());
    setPhase('test');
  }

  function handleAnswer(optionId) {
    const q = questions[currentIdx];
    const correctOption = q.options.find(o => o.is_correct);
    const isCorrect = correctOption && correctOption.id === optionId;

    const newAnswers = [...answers];
    newAnswers[currentIdx] = { questionId: q.id, selected: optionId, isCorrect, tema: q.tema };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      clearInterval(timerRef.current);
      setPhase('results');
    }
  }

  function handleSkip() {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = { questionId: questions[currentIdx].id, selected: null, isCorrect: null, tema: questions[currentIdx].tema };
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      clearInterval(timerRef.current);
      setPhase('results');
    }
  }

  function computeResults() {
    let correct = 0, incorrect = 0, blank = 0;
    const byTema = {};

    TOPIC_CONFIG.forEach(tc => {
      byTema[tc.tema] = { correct: 0, total: 0, name: tc.name, short: tc.short };
    });

    answers.forEach(a => {
      if (!a) return;
      if (byTema[a.tema]) byTema[a.tema].total++;
      if (a.isCorrect === true) { correct++; if (byTema[a.tema]) byTema[a.tema].correct++; }
      else if (a.isCorrect === false) { incorrect++; }
      else { blank++; }
    });

    const netScore = correct * SCORE_CORRECT + incorrect * SCORE_INCORRECT;
    const pct = Math.max(0, (netScore / questions.length) * 100);

    let probApprobar;
    if (pct >= 70) probApprobar = 'Alta (75-90%)';
    else if (pct >= 50) probApprobar = 'Media (40-60%)';
    else probApprobar = 'Baja (<30%)';

    const chartData = TOPIC_CONFIG.map(tc => ({
      name: tc.short,
      fullName: tc.name,
      pct: byTema[tc.tema].total > 0 ? Math.round((byTema[tc.tema].correct / byTema[tc.tema].total) * 100) : 0,
      correct: byTema[tc.tema].correct,
      total: byTema[tc.tema].total,
    }));

    const weakest = [...chartData].sort((a, b) => a.pct - b.pct).slice(0, 3).filter(d => d.total > 0);

    return { correct, incorrect, blank, netScore, pct, probApprobar, chartData, byTema, weakest };
  }

  async function saveResults() {
    const r = computeResults();
    await supabase.from('diagnostico_resultados').insert([{
      email: email || null,
      puntuacion_total: r.netScore,
      puntuacion_maxima: questions.length,
      puntuacion_por_tema: r.byTema,
      tiempo_total_segundos: elapsed,
      probabilidad_aprobar: r.pct,
      respuestas: answers,
    }]);

    if (email) {
      await supabase.from('waitlist').insert([{
        email: email.trim().toLowerCase(),
        source: 'diagnostico'
      }]);
    }

    setSaved(true);
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ==================== INTRO ====================
  if (phase === 'intro') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.introIcon}>📝</div>
          <h1 style={styles.title}>Test Diagnóstico</h1>
          <p style={styles.subtitle}>Descubre tu nivel en 5 minutos</p>

          <div style={styles.infoBox}>
            <p style={styles.infoTitle}>50 preguntas · 13 temas</p>
            <p style={styles.infoText}>Auxiliar Administrativo del Estado</p>
          </div>

          <div style={styles.scoringBox}>
            <p style={styles.scoringTitle}>Sistema de puntuación real</p>
            <div style={styles.scoringGrid}>
              <span style={{ ...styles.scoringBadge, background: '#D1FAE5', color: '#065F46' }}>Acierto: +1</span>
              <span style={{ ...styles.scoringBadge, background: '#FEE2E2', color: '#991B1B' }}>Fallo: −0,33</span>
              <span style={{ ...styles.scoringBadge, background: '#F3F4F6', color: '#6B7280' }}>En blanco: 0</span>
            </div>
          </div>

          <button style={styles.ctaButton} onClick={loadQuestions}>
            Comenzar test
          </button>
        </div>
      </div>
    );
  }

  // ==================== LOADING ====================
  if (phase === 'loading') {
    return (
      <div style={styles.container}>
        <div style={{ ...styles.card, textAlign: 'center' }}>
          <div style={styles.spinner} />
          <p style={styles.subtitle}>Preparando preguntas...</p>
        </div>
      </div>
    );
  }

  // ==================== TEST ====================
  if (phase === 'test') {
    const q = questions[currentIdx];
    const topicName = TOPIC_CONFIG.find(t => t.tema === q.tema)?.name || `Tema ${q.tema}`;
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
      <div style={styles.container}>
        <div style={styles.testCard}>
          {/* Header */}
          <div style={styles.testHeader}>
            <span style={styles.testProgress}>Pregunta {currentIdx + 1}/{questions.length}</span>
            <span style={styles.testTimer}>{formatTime(elapsed)}</span>
          </div>

          {/* Progress bar */}
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          {/* Topic badge */}
          <span style={styles.topicBadge}>{topicName}</span>

          {/* Question */}
          <p style={styles.questionText}>{q.question_text}</p>

          {/* Options */}
          <div style={styles.optionsContainer}>
            {q.options
              .sort((a, b) => a.position - b.position)
              .map(opt => (
                <button
                  key={opt.id}
                  style={styles.optionButton}
                  onClick={() => handleAnswer(opt.id)}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#2D6A4F'; e.currentTarget.style.background = 'rgba(45,106,79,0.04)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.background = 'white'; }}
                >
                  <span style={styles.optionLetter}>{opt.id.toUpperCase()}</span>
                  <span style={styles.optionText}>{opt.text}</span>
                </button>
              ))}
          </div>

          {/* Skip */}
          <button style={styles.skipButton} onClick={handleSkip}>
            Dejar en blanco →
          </button>
        </div>
      </div>
    );
  }

  // ==================== RESULTS ====================
  if (phase === 'results') {
    const r = computeResults();

    return (
      <div style={styles.container}>
        <div style={styles.resultsCard}>
          <h2 style={styles.resultsTitle}>Tu resultado</h2>

          {/* Score */}
          <div style={styles.scoreCircle}>
            <span style={styles.scoreNumber}>{r.netScore.toFixed(1)}</span>
            <span style={styles.scoreMax}>/ {questions.length}</span>
          </div>
          <p style={styles.scorePct}>{r.pct.toFixed(0)}% de acierto neto</p>

          {/* Breakdown */}
          <div style={styles.breakdownRow}>
            <span style={{ ...styles.breakdownItem, color: '#065F46' }}>✓ {r.correct} aciertos</span>
            <span style={{ ...styles.breakdownItem, color: '#991B1B' }}>✗ {r.incorrect} fallos (−{(r.incorrect / 3).toFixed(1)})</span>
            <span style={{ ...styles.breakdownItem, color: '#6B7280' }}>— {r.blank} en blanco</span>
          </div>

          {/* Probability */}
          <div style={styles.probBox}>
            <p style={styles.probLabel}>Probabilidad estimada de aprobar</p>
            <p style={styles.probValue}>{r.probApprobar}</p>
          </div>

          {/* Bar chart */}
          <h3 style={styles.chartTitle}>Resultado por tema</h3>
          <div style={{ width: '100%', height: Math.max(300, r.chartData.length * 28) }}>
            <ResponsiveContainer>
              <BarChart data={r.chartData} layout="vertical" margin={{ left: 10, right: 30, top: 5, bottom: 5 }}>
                <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, name, props) => [`${v}% (${props.payload.correct}/${props.payload.total})`, props.payload.fullName]} />
                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                  {r.chartData.map((d, i) => <Cell key={i} fill={barColor(d.pct)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar chart (desktop) */}
          <div style={{ width: '100%', height: 300, display: 'none', ...( typeof window !== 'undefined' && window.innerWidth >= 640 ? { display: 'block' } : {}) }}>
            <ResponsiveContainer>
              <RadarChart data={r.chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="name" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="%" dataKey="pct" stroke="#2D6A4F" fill="#2D6A4F" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Weaknesses */}
          {r.weakest.length > 0 && (
            <div style={styles.weakBox}>
              <p style={styles.weakTitle}>Tus puntos débiles</p>
              <p style={styles.weakText}>
                {r.weakest.map(w => w.fullName).join(', ')}. Un plan con repetición espaciada en estas áreas podría aumentar tu puntuación significativamente.
              </p>
            </div>
          )}

          {/* CTA */}
          <a
            href="https://oposiciones-app-nu.vercel.app/signup"
            style={styles.resultsCta}
          >
            Mejora tus puntos débiles con Oposita Smart →
          </a>

          {/* Email save */}
          {!saved && (
            <div style={styles.saveBox}>
              <p style={styles.saveText}>¿Quieres guardar tus resultados y repetir el test en 30 días?</p>
              <div style={styles.saveRow}>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={styles.saveInput}
                />
                <button onClick={saveResults} style={styles.saveButton}>Guardar</button>
              </div>
            </div>
          )}
          {saved && <p style={styles.savedMsg}>✓ Resultados guardados</p>}

          <p style={styles.timeInfo}>Tiempo total: {formatTime(elapsed)}</p>
        </div>
      </div>
    );
  }

  return null;
}

// ==================== STYLES ====================
const styles = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '40px 28px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
    textAlign: 'center',
  },
  introIcon: { fontSize: '48px', marginBottom: '16px' },
  title: { fontSize: '28px', fontWeight: '800', color: '#111827', marginBottom: '8px', letterSpacing: '-0.02em' },
  subtitle: { fontSize: '16px', color: '#4B5563', marginBottom: '24px' },
  infoBox: { background: '#F3F4F6', borderRadius: '12px', padding: '16px', marginBottom: '16px' },
  infoTitle: { fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' },
  infoText: { fontSize: '14px', color: '#4B5563' },
  scoringBox: { marginBottom: '28px' },
  scoringTitle: { fontSize: '13px', fontWeight: '600', color: '#6B7280', marginBottom: '10px' },
  scoringGrid: { display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' },
  scoringBadge: { fontSize: '13px', fontWeight: '600', padding: '4px 12px', borderRadius: '99px' },
  ctaButton: {
    width: '100%', padding: '16px', border: 'none', borderRadius: '12px',
    background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 60%, #3A7D5C 100%)',
    color: 'white', fontSize: '17px', fontWeight: '700', cursor: 'pointer',
    fontFamily: 'inherit', transition: 'transform 0.2s',
  },
  spinner: {
    width: '40px', height: '40px', border: '3px solid #E5E7EB', borderTopColor: '#2D6A4F',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
  },

  // Test
  testCard: { background: '#fff', borderRadius: '20px', padding: '24px 20px', maxWidth: '600px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  testHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '12px' },
  testProgress: { fontSize: '14px', fontWeight: '600', color: '#111827' },
  testTimer: { fontSize: '14px', fontWeight: '500', color: '#6B7280' },
  progressBar: { height: '4px', background: '#F3F4F6', borderRadius: '2px', marginBottom: '16px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #2D6A4F, #52B788)', borderRadius: '2px', transition: 'width 0.3s' },
  topicBadge: { display: 'inline-block', fontSize: '12px', fontWeight: '600', color: '#2D6A4F', background: 'rgba(45,106,79,0.1)', padding: '4px 10px', borderRadius: '99px', marginBottom: '14px' },
  questionText: { fontSize: '17px', fontWeight: '600', color: '#111827', lineHeight: '1.5', marginBottom: '20px' },
  optionsContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  optionButton: {
    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '14px 16px',
    background: 'white', border: '1.5px solid #E5E7EB', borderRadius: '12px',
    cursor: 'pointer', textAlign: 'left', fontSize: '15px', color: '#1F2937',
    fontFamily: 'inherit', lineHeight: '1.4', transition: 'border-color 0.15s, background 0.15s',
    minHeight: '48px',
  },
  optionLetter: { fontWeight: '700', color: '#2D6A4F', flexShrink: 0, fontSize: '14px', marginTop: '1px' },
  optionText: { flex: 1 },
  skipButton: { width: '100%', background: 'none', border: 'none', color: '#6B7280', fontSize: '14px', cursor: 'pointer', padding: '10px', fontFamily: 'inherit' },

  // Results
  resultsCard: { background: '#fff', borderRadius: '20px', padding: '32px 24px', maxWidth: '640px', width: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' },
  resultsTitle: { fontSize: '24px', fontWeight: '800', color: '#111827', textAlign: 'center', marginBottom: '20px' },
  scoreCircle: { textAlign: 'center', marginBottom: '4px' },
  scoreNumber: { fontSize: '48px', fontWeight: '800', color: '#2D6A4F' },
  scoreMax: { fontSize: '20px', color: '#6B7280', fontWeight: '500' },
  scorePct: { textAlign: 'center', fontSize: '15px', color: '#4B5563', marginBottom: '16px' },
  breakdownRow: { display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' },
  breakdownItem: { fontSize: '13px', fontWeight: '600' },
  probBox: { background: '#F3F4F6', borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '24px' },
  probLabel: { fontSize: '13px', color: '#6B7280', marginBottom: '4px' },
  probValue: { fontSize: '20px', fontWeight: '800', color: '#111827' },
  chartTitle: { fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '12px' },
  weakBox: { background: '#FEF3C7', borderRadius: '12px', padding: '16px', marginBottom: '20px' },
  weakTitle: { fontSize: '14px', fontWeight: '700', color: '#92400E', marginBottom: '6px' },
  weakText: { fontSize: '14px', color: '#92400E', lineHeight: '1.5' },
  resultsCta: {
    display: 'block', textAlign: 'center', padding: '16px',
    background: 'linear-gradient(145deg, #1B4332 0%, #2D6A4F 60%, #3A7D5C 100%)',
    color: 'white', fontWeight: '700', fontSize: '16px', borderRadius: '12px',
    textDecoration: 'none', marginBottom: '20px', transition: 'transform 0.2s',
  },
  saveBox: { background: '#F9FAFB', borderRadius: '12px', padding: '16px', marginBottom: '12px' },
  saveText: { fontSize: '14px', color: '#4B5563', marginBottom: '10px' },
  saveRow: { display: 'flex', gap: '8px' },
  saveInput: { flex: 1, padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' },
  saveButton: { padding: '10px 20px', background: '#2D6A4F', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' },
  savedMsg: { textAlign: 'center', color: '#065F46', fontSize: '14px', fontWeight: '600', marginBottom: '12px' },
  timeInfo: { textAlign: 'center', fontSize: '13px', color: '#9CA3AF', marginTop: '8px' },
};
