'use client'

import { Check } from 'lucide-react'

interface WizardStepIndicatorProps {
  currentStep: number
  totalSteps?: number
  labels?: string[]
}

const DEFAULT_LABELS = ['General', 'Registration', 'Schedule', 'Scoring', 'Awards', 'Discord']

export function WizardStepIndicator({
  currentStep,
  totalSteps = 6,
  labels = DEFAULT_LABELS,
}: WizardStepIndicatorProps) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1)

  return (
    <nav aria-label="Progress" className="flex items-center">
      {steps.map((stepNum, idx) => {
        const isDone = stepNum < currentStep
        const isCurrent = stepNum === currentStep
        const label = labels[idx] ?? String(stepNum)

        return (
          <div key={stepNum} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              {/* Step circle */}
              <div
                className={[
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all',
                  isDone
                    ? 'bg-violet-600 border-violet-500 text-white'
                    : isCurrent
                    ? 'bg-violet-600/20 border-violet-500 text-violet-300'
                    : 'bg-white/5 border-white/15 text-white/30',
                ].join(' ')}
                aria-label={`Step ${stepNum}: ${label}${isDone ? ' (completed)' : isCurrent ? ' (current)' : ''}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                {isDone ? (
                  <Check size={14} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true">{stepNum}</span>
                )}
              </div>

              {/* Step label — hidden on xs */}
              <span
                className={[
                  'text-xs hidden sm:block whitespace-nowrap',
                  isCurrent
                    ? 'text-violet-300'
                    : isDone
                    ? 'text-white/60'
                    : 'text-white/25',
                ].join(' ')}
              >
                {label}
              </span>
            </div>

            {/* Connecting line — not after last step */}
            {idx < steps.length - 1 && (
              <div
                className={[
                  'flex-1 h-0.5 mx-2 transition-colors',
                  stepNum < currentStep ? 'bg-violet-500/50' : 'bg-white/10',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}
