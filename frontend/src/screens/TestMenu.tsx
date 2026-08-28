import { CheckCircle2, Clock, ArrowRight } from 'lucide-react';

import { PrimaryButton } from '../components/Button';
import { Layout } from '../components/Layout';
import { COOKIE_SUGGESTED_SEC, RECALL_SUGGESTED_SEC } from '../config';
import type { TestType } from '../types';

interface TestMenuProps {
  completedTests: Set<TestType>;
  onSelect: (test: TestType) => void;
  onFinish: () => void;
}

export function TestMenu({ completedTests, onSelect, onFinish }: TestMenuProps) {
  const allDone = completedTests.has('cookie_theft') && completedTests.has('word_recall');

  return (
    <Layout eyebrow="Step 4 of 4" title="Choose a test to start" maxWidth="wide">
      <p className="text-stone-600 mb-8 max-w-2xl">
        You can complete the two tests in any order. Both are required to finish
        the session.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-8">
        <TestCard
          eyebrow="Picture description"
          title="Cookie Theft"
          description="Describe everything you see happening in a picture."
          durationSec={COOKIE_SUGGESTED_SEC}
          done={completedTests.has('cookie_theft')}
          onClick={() => onSelect('cookie_theft')}
        />
        <TestCard
          eyebrow="Verbal learning"
          title="15-word list recall"
          description="Watch 15 words appear, then say aloud as many as you remember."
          durationSec={RECALL_SUGGESTED_SEC}
          done={completedTests.has('word_recall')}
          onClick={() => onSelect('word_recall')}
        />
      </div>

      {allDone && (
        <div className="flex justify-end">
          <PrimaryButton onClick={onFinish}>
            <span className="flex items-center gap-2">
              Finish session
              <ArrowRight size={18} />
            </span>
          </PrimaryButton>
        </div>
      )}
    </Layout>
  );
}

interface TestCardProps {
  eyebrow: string;
  title: string;
  description: string;
  durationSec: number;
  done: boolean;
  onClick: () => void;
}

function TestCard({ eyebrow, title, description, durationSec, done, onClick }: TestCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done}
      className={`text-left rounded-lg p-8 transition-all group ${
        done
          ? 'bg-emerald-50 border border-emerald-200 cursor-default'
          : 'bg-white border border-stone-200 hover:border-emerald-900 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs tracking-widest uppercase text-stone-500">{eyebrow}</div>
        {done && (
          <div className="flex items-center gap-1 text-xs text-emerald-900 font-medium">
            <CheckCircle2 size={14} />
            <span>Done</span>
          </div>
        )}
      </div>
      <h2
        className={`text-2xl font-semibold mb-3 transition-colors ${
          done
            ? 'text-emerald-900'
            : 'text-stone-900 group-hover:text-emerald-900'
        }`}
      >
        {title}
      </h2>
      <p className="text-stone-600 text-sm leading-relaxed mb-6">{description}</p>
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <Clock size={14} />
        <span>~{Math.round(durationSec / 60)} min</span>
      </div>
    </button>
  );
}
