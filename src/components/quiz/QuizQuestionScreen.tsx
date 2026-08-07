import { Trophy, Clock, CheckCircle2, XCircle, ChevronRight, X } from 'lucide-react';
import { Question } from '../../data/questions';
import { KeywordText } from '../KeywordText';
import { QUESTION_TIME } from '../../constants';

interface QuizQuestionScreenProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  score: number;
  timeLeft: number;
  selectedAnswer: number | null;
  isAnswerCorrect: boolean | null;
  onAnswer: (optionIndex: number) => void;
  onNext: () => void;
  onQuit: () => void;
}

export function QuizQuestionScreen({
  question,
  questionIndex,
  totalQuestions,
  score,
  timeLeft,
  selectedAnswer,
  isAnswerCorrect,
  onAnswer,
  onNext,
  onQuit,
}: QuizQuestionScreenProps) {
  return (
    <div className="glass-panel" style={{ padding: '2rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
          Question {questionIndex + 1}/{totalQuestions}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary-color)', fontWeight: 600 }}>
          <Trophy size={20} />
          <span>Score: {score}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: timeLeft <= 5 ? 'var(--error-color)' : 'var(--text-primary)' }}>
        <Clock size={20} />
        <span style={{ fontWeight: 600 }}>{timeLeft}s</span>
        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '99px', marginLeft: '0.5rem' }}>
          <div style={{
            width: `${(timeLeft / QUESTION_TIME) * 100}%`,
            height: '100%',
            backgroundColor: timeLeft <= 5 ? 'var(--error-color)' : 'var(--primary-color)',
            borderRadius: '99px',
            transition: 'width 1s linear, background-color 0.3s ease'
          }} />
        </div>
      </div>

      <div style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '99px', height: '8px', marginBottom: '2rem' }}>
        <div style={{
          height: '100%',
          backgroundColor: 'var(--primary-color)',
          borderRadius: '99px',
          width: `${(questionIndex / totalQuestions) * 100}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>

      <div style={{ marginBottom: '1rem', color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Catégorie : {question.category}
      </div>

      <h3 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
        {question.text}
      </h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {question.options.map((option, index) => {
          let buttonStyle = {};
          let showIcon = null;
          if (selectedAnswer !== null) {
            if (index === question.correctAnswerIndex) {
              buttonStyle = { backgroundColor: 'var(--success-color)', color: 'white', borderColor: 'var(--success-color)' };
              showIcon = <CheckCircle2 size={20} />;
            } else if (index === selectedAnswer && !isAnswerCorrect) {
              buttonStyle = { backgroundColor: 'var(--error-color)', color: 'white', borderColor: 'var(--error-color)' };
              showIcon = <XCircle size={20} />;
            }
          }
          return (
            <button
              key={index}
              className="btn btn-outline"
              style={{
                padding: '1rem',
                justifyContent: 'space-between',
                fontSize: '1.125rem',
                ...buttonStyle,
                cursor: selectedAnswer !== null ? 'default' : 'pointer',
                opacity: selectedAnswer !== null && index !== question.correctAnswerIndex && index !== selectedAnswer ? 0.6 : 1
              }}
              onClick={() => onAnswer(index)}
              disabled={selectedAnswer !== null}
            >
              <span>{option}</span>
              {showIcon && <span>{showIcon}</span>}
            </button>
          );
        })}
      </div>

      {selectedAnswer !== null && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.5rem',
          backgroundColor: isAnswerCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
          borderLeft: `6px solid ${isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)'}`,
          borderRadius: '8px',
          position: 'relative'
        }}>
          <button
            onClick={onNext}
            style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
            title="Fermer et continuer"
          >
            <X size={20} />
          </button>
          <h4 style={{ color: isAnswerCorrect ? 'var(--success-color)' : 'var(--error-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isAnswerCorrect ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
            {isAnswerCorrect ? 'Bonne réponse !' : 'Mauvaise réponse.'}
          </h4>
          <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6 }}>
            <KeywordText text={question.explanation} keywords={question.keywords || []} />
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" onClick={onNext} style={{ padding: '0.5rem 1rem' }}>
              Continuer <ChevronRight size={18} style={{ marginLeft: '4px' }} />
            </button>
          </div>
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <button className="btn btn-outline" onClick={onQuit} style={{ border: 'none', color: 'var(--text-secondary)' }}>
          Quitter le quiz
        </button>
      </div>
    </div>
  );
}
