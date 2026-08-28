import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import { PrimaryButton } from '../components/Button';
import { Layout, PromptCard } from '../components/Layout';

interface ConsentProps {
  onAccept: () => void;
  onBack: () => void;
}

export function Consent({ onAccept, onBack }: ConsentProps) {
  const [checked, setChecked] = useState(false);

  return (
    <Layout eyebrow="Step 2 of 4" title="Consent to participate" onBack={onBack}>
      <div className="space-y-6">
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-amber-900">
          <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium mb-1">Research prototype</div>
            <div>
              This is a demonstration tool. Do not enter real personal information.
              Recordings may be deleted at any time.
            </div>
          </div>
        </div>

        <PromptCard>
          <div className="prose prose-stone max-w-none text-stone-800 space-y-4">
            <p>
              This tool records short samples of your voice while you complete
              two speech tasks. The recordings and a small amount of information
              about your device (browser, microphone) are sent to a research
              server for later analysis.
            </p>
            <p>
              <strong>What you'll do:</strong> answer five short questions about
              yourself, then complete two tests that take about two minutes each.
            </p>
            <p>
              <strong>What we collect:</strong> your voice recordings, your study
              code, the demographic answers you provide, and technical details
              about your browser and microphone. We do not collect your name,
              email, or any other identifying information.
            </p>
            <p>
              <strong>Your choice:</strong> participation is voluntary. You can
              close this window at any time.
            </p>
          </div>
        </PromptCard>

        <label className="flex items-start gap-3 cursor-pointer p-4 border border-stone-200 rounded-md hover:border-stone-300 transition-colors">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 w-5 h-5 accent-emerald-900 cursor-pointer"
          />
          <span className="text-stone-800">
            I have read the above and agree to participate.
          </span>
        </label>

        <div className="flex justify-end">
          <PrimaryButton onClick={onAccept} disabled={!checked}>
            Continue
          </PrimaryButton>
        </div>
      </div>
    </Layout>
  );
}
