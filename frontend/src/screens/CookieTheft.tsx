import { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

import { Layout, PromptCard } from '../components/Layout';
import { RecordingPanel } from '../components/RecordingPanel';
import {
  COOKIE_IMAGE_ID,
  COOKIE_IMAGE_PATH,
  COOKIE_SUGGESTED_SEC,
} from '../config';

interface CookieTheftProps {
  sessionId: string;
  onDone: () => void;
  onBack: () => void;
}

export function CookieTheft({ sessionId, onDone, onBack }: CookieTheftProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Layout eyebrow="Picture description" title="Cookie Theft" onBack={onBack} backLabel="Back to menu">
      <div className="space-y-8">
        <PromptCard>
          <p className="text-lg text-stone-800 leading-relaxed">
            Please describe <strong>everything you see happening</strong> in this
            picture. Take your time and speak in complete sentences.
          </p>
        </PromptCard>

        {imageFailed ? (
          <div
            className="bg-stone-100 border-2 border-dashed border-stone-300 rounded-lg flex flex-col items-center justify-center text-stone-500 gap-3 p-8"
            style={{ aspectRatio: '4 / 3' }}
          >
            <ImageIcon size={32} strokeWidth={1.5} />
            <div className="text-center max-w-sm">
              <div className="font-medium text-stone-700 mb-1">Image not yet configured</div>
              <p className="text-xs text-stone-500 leading-relaxed">
                Drop your Cookie Theft image at{' '}
                <code className="bg-stone-200 px-1 rounded">frontend/public/cookie_theft.jpg</code>{' '}
                to display it here.
              </p>
            </div>
          </div>
        ) : (
          <img
            src={COOKIE_IMAGE_PATH}
            alt="Picture to describe"
            onError={() => setImageFailed(true)}
            className="w-full rounded-lg border border-stone-200"
          />
        )}

        <RecordingPanel
          sessionId={sessionId}
          testType="cookie_theft"
          testConfig={{ image_id: COOKIE_IMAGE_ID }}
          suggestedSec={COOKIE_SUGGESTED_SEC}
          onUploaded={onDone}
        />
      </div>
    </Layout>
  );
}
