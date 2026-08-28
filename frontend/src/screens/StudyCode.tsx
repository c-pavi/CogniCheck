import { FormEvent, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';

import { api } from '../api';
import { PrimaryButton } from '../components/Button';
import { Layout, PromptCard } from '../components/Layout';

interface StudyCodeProps {
  onValid: (code: string) => void;
  onBack: () => void;
}

export function StudyCode({ onValid, onBack }: StudyCodeProps) {
  const [code, setCode] = useState('');
  const [state, setState] = useState<'idle' | 'checking' | 'invalid' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setState('checking');
    setErrorMessage(null);
    try {
      const res = await api.checkCode(trimmed);
      if (res.valid) {
        onValid(trimmed);
      } else {
        setState('invalid');
      }
    } catch (err) {
      setState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Something went wrong');
    }
  };

  return (
    <Layout eyebrow="Step 1 of 4" title="Enter your study code" onBack={onBack} backLabel="Start over">
      <form onSubmit={handleSubmit} className="space-y-6">
        <PromptCard>
          <label htmlFor="study-code" className="block text-sm text-stone-700 mb-3">
            Your study code was included in the invitation. It looks like{' '}
            <span className="font-mono text-stone-900">COGNI-A47F</span>.
          </label>
          <input
            id="study-code"
            type="text"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="COGNI-XXXX"
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (state === 'invalid' || state === 'error') setState('idle');
            }}
            className="w-full text-2xl font-mono tracking-wider bg-white border border-stone-300 focus:border-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-900 rounded-md px-4 py-3 text-stone-900"
          />

          {state === 'invalid' && (
            <div className="flex items-start gap-3 mt-4 text-sm text-red-900">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span>
                That code isn't valid. Please double-check the invitation and try again.
              </span>
            </div>
          )}

          {state === 'error' && (
            <div className="flex items-start gap-3 mt-4 text-sm text-red-900">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-medium">Couldn't reach the server</div>
                {errorMessage && (
                  <div className="text-red-800 text-xs mt-1">{errorMessage}</div>
                )}
              </div>
            </div>
          )}
        </PromptCard>

        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={!code.trim() || state === 'checking'}>
            {state === 'checking' ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Checking…
              </span>
            ) : (
              'Continue'
            )}
          </PrimaryButton>
        </div>
      </form>
    </Layout>
  );
}
