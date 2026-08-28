import { useEffect, useState } from 'react';

import { PrimaryButton } from '../components/Button';
import { Layout, PromptCard } from '../components/Layout';
import { RecordingPanel } from '../components/RecordingPanel';
import {
  RECALL_SUGGESTED_SEC,
  WORD_DISPLAY_MS,
  WORD_LIST,
  WORD_LIST_ID,
} from '../config';

type Phase = 'intro' | 'learning' | 'ready';

interface WordRecallProps {
  sessionId: string;
  onDone: () => void;
  onBack: () => void;
}

export function WordRecall({ sessionId, onDone, onBack }: WordRecallProps) {
  const [phase, setPhase] = useState<Phase>('intro');
  const [wordIndex, setWordIndex] = useState(0);

  // Advance through learning phase word-by-word.
  useEffect(() => {
    if (phase !== 'learning') return;

    if (wordIndex >= WORD_LIST.length) {
      const t = setTimeout(() => setPhase('ready'), 600);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setWordIndex((i) => i + 1), WORD_DISPLAY_MS);
    return () => clearTimeout(t);
  }, [phase, wordIndex]);

  if (phase === 'learning') {
    return (
      <LearningPhase
        word={WORD_LIST[wordIndex]}
        index={wordIndex}
        total={WORD_LIST.length}
      />
    );
  }

  return (
    <Layout eyebrow="Verbal learning" title="15-word list recall" onBack={onBack} backLabel="Back to menu">
      {phase === 'intro' && (
        <div className="space-y-6">
          <PromptCard>
            <p className="text-lg text-stone-800 leading-relaxed mb-4">
              You will see <strong>15 words</strong>, one at a time. Try to
              remember as many as you can.
            </p>
            <p className="text-stone-600 text-sm leading-relaxed">
              After the words finish, you will be asked to say aloud as many as
              you remember, in any order.
            </p>
          </PromptCard>
          <div className="flex justify-end">
            <PrimaryButton onClick={() => setPhase('learning')}>
              Start learning phase
            </PrimaryButton>
          </div>
        </div>
      )}

      {phase === 'ready' && (
        <div className="space-y-6">
          <PromptCard>
            <p className="text-lg text-stone-800 leading-relaxed mb-2">
              Now, please <strong>say aloud all the words you remember</strong>,
              in any order.
            </p>
            <p className="text-stone-600 text-sm">
              Press the record button when you are ready to begin.
            </p>
          </PromptCard>

          <RecordingPanel
            sessionId={sessionId}
            testType="word_recall"
            testConfig={{ word_list_id: WORD_LIST_ID }}
            suggestedSec={RECALL_SUGGESTED_SEC}
            onUploaded={onDone}
            restartLabel="Restart test"
            onRestart={() => {
              setWordIndex(0);
              setPhase('intro');
            }}
          />
        </div>
      )}
    </Layout>
  );
}

interface LearningPhaseProps {
  word: string;
  index: number;
  total: number;
}

function LearningPhase({ word, index, total }: LearningPhaseProps) {
  const progress = (index / total) * 100;
  const showWord = index < total;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-stone-200">
        <div
          className="h-full bg-emerald-900 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        {showWord ? (
          <div className="text-center">
            <div className="text-xs tracking-widest uppercase text-stone-500 mb-6">
              Word {index + 1} of {total}
            </div>
            <div
              key={index}
              className="text-6xl sm:text-7xl md:text-8xl font-serif text-stone-900 animate-fadein"
            >
              {word}
            </div>
          </div>
        ) : (
          <div className="text-sm text-stone-500">Preparing recall phase…</div>
        )}
      </div>
    </div>
  );
}
