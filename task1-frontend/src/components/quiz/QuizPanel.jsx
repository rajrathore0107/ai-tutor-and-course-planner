import { useState } from 'react'
import { CheckCircle, XCircle, Trophy, RotateCcw, ArrowLeft } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import clsx from 'clsx'

export default function QuizPanel() {
  const { quiz, clearQuiz } = useStore()
  const [answers, setAnswers] = useState({})   // {questionId: selectedOption}
  const [revealed, setRevealed] = useState({}) // {questionId: true}
  const [finished, setFinished] = useState(false)

  if (!quiz) return null

  const questions = quiz.questions || []
  const score = questions.filter(
    (q) => answers[q.id] === q.correct && revealed[q.id]
  ).length

  const allAnswered = questions.every((q) => revealed[q.id])

  const handleSelect = (questionId, option) => {
    if (revealed[questionId]) return
    setAnswers((prev) => ({ ...prev, [questionId]: option }))
  }

  const handleReveal = (questionId) => {
    if (!answers[questionId]) return
    setRevealed((prev) => ({ ...prev, [questionId]: true }))
  }

  const handleFinish = () => setFinished(true)
  const handleRetry = () => {
    setAnswers({})
    setRevealed({})
    setFinished(false)
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8 animate-fade-in">
        <Trophy size={48} className={pct >= 70 ? 'text-warning' : 'text-text-muted'} />
        <div className="text-center">
          <p className="text-3xl font-bold text-text-primary">{score}/{questions.length}</p>
          <p className="text-text-muted mt-1">{pct}% correct</p>
          <p className="text-sm text-text-muted mt-3">
            {pct >= 80 ? 'Excellent work! You have a strong grasp of the material.' :
             pct >= 60 ? 'Good effort. Review the explanations for missed questions.' :
             'Keep studying the source material and try again.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-text-muted hover:text-text-primary hover:border-accent/50 transition-colors text-sm"
          >
            <RotateCcw size={14} /> Retry
          </button>
          <button
            onClick={clearQuiz}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white transition-colors text-sm"
          >
            <ArrowLeft size={14} /> Back to Chat
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Quiz Mode</h2>
          <p className="text-xs text-text-muted">{questions.length} questions from your sources</p>
        </div>
        <button
          onClick={clearQuiz}
          className="text-xs text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
        >
          <ArrowLeft size={12} /> Exit
        </button>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {questions.map((q, idx) => {
          const selected = answers[q.id]
          const isRevealed = revealed[q.id]
          const isCorrect = selected === q.correct

          return (
            <div
              key={q.id}
              className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4 animate-slide-up"
            >
              <div className="flex gap-3">
                <span className="text-xs font-mono text-accent bg-accent/10 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-text-primary font-medium leading-relaxed">{q.question}</p>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-2 ml-9">
                {Object.entries(q.options).map(([key, value]) => {
                  const isSelected = selected === key
                  const isAnswer = key === q.correct

                  let optionClass = 'border-border text-text-muted hover:border-accent/50 hover:text-text-primary cursor-pointer'
                  if (isRevealed) {
                    if (isAnswer) optionClass = 'border-success/50 bg-success/10 text-success'
                    else if (isSelected && !isAnswer) optionClass = 'border-error/50 bg-error/10 text-error'
                    else optionClass = 'border-border text-text-muted opacity-50'
                  } else if (isSelected) {
                    optionClass = 'border-accent bg-accent/10 text-accent cursor-pointer'
                  }

                  return (
                    <button
                      key={key}
                      onClick={() => handleSelect(q.id, key)}
                      disabled={isRevealed}
                      className={clsx(
                        'flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm text-left transition-all',
                        optionClass
                      )}
                    >
                      <span className="font-mono font-semibold w-4 flex-shrink-0">{key}</span>
                      <span>{value}</span>
                      {isRevealed && isAnswer && <CheckCircle size={14} className="ml-auto text-success flex-shrink-0" />}
                      {isRevealed && isSelected && !isAnswer && <XCircle size={14} className="ml-auto text-error flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {/* Reveal / Explanation */}
              {!isRevealed ? (
                <button
                  onClick={() => handleReveal(q.id)}
                  disabled={!selected}
                  className="ml-9 text-xs text-accent hover:text-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-left"
                >
                  Check answer →
                </button>
              ) : (
                <div className="ml-9 text-xs bg-border/30 rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center gap-1 font-medium">
                    {isCorrect
                      ? <><CheckCircle size={12} className="text-success" /> <span className="text-success">Correct!</span></>
                      : <><XCircle size={12} className="text-error" /> <span className="text-error">Incorrect</span></>
                    }
                  </div>
                  <p className="text-text-muted leading-relaxed">{q.explanation}</p>
                  {q.source_ref && (
                    <p className="text-text-muted opacity-60 font-mono mt-1">
                      Source: {q.source_ref}
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {allAnswered && (
        <div className="p-4 border-t border-border flex justify-between items-center">
          <p className="text-sm text-text-muted">
            Score so far: <span className="text-text-primary font-semibold">{score}/{questions.length}</span>
          </p>
          <button
            onClick={handleFinish}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
          >
            See Results
          </button>
        </div>
      )}
    </div>
  )
}
