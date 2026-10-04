import { useState } from 'react';

import { api } from './api';
import { Admin } from './screens/Admin';
import { CONSENT_VERSION } from './config';
import { Consent } from './screens/Consent';
import { CookieTheft } from './screens/CookieTheft';
import { DemographicsScreen } from './screens/Demographics';
import { Landing } from './screens/Landing';
import { StudyCode } from './screens/StudyCode';
import { TestMenu } from './screens/TestMenu';
import { ThankYou } from './screens/ThankYou';
import { WordRecall } from './screens/WordRecall';
import type { Demographics, Screen, TestType } from './types';

export default function App() {
  if (window.location.pathname.replace(/\/$/, '') === '/admin') {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <Admin />
      </div>
    );
  }
  return <ParticipantFlow />;
}

function ParticipantFlow() {
  const [screen, setScreen] = useState<Screen>('landing');
  const [studyCode, setStudyCode] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [completedTests, setCompletedTests] = useState<Set<TestType>>(new Set());
  const [sessionError, setSessionError] = useState<string | null>(null);

  const handleCodeValid = (code: string) => {
    setStudyCode(code);
    setScreen('consent');
  };

  const handleConsentAccepted = () => {
    setScreen('demographics');
  };

  const handleDemographicsSubmit = async (demographics: Demographics) => {
    if (!studyCode) return;
    setSessionError(null);
    try {
      const res = await api.createSession({
        study_code: studyCode,
        consent_version: CONSENT_VERSION,
        user_agent: navigator.userAgent,
        demographics,
      });
      setSessionId(res.session_id);
      setScreen('menu');
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Session creation failed');
    }
  };

  const handleSelectTest = (test: TestType) => {
    setScreen(test === 'cookie_theft' ? 'cookie' : 'recall');
  };

  const handleTestDone = (test: TestType) => {
    setCompletedTests((prev) => {
      const next = new Set(prev);
      next.add(test);
      return next;
    });
    setScreen('menu');
  };

  const handleFinish = async () => {
    if (!sessionId) {
      setScreen('thankyou');
      return;
    }
    try {
      await api.completeSession(sessionId);
    } catch {
      // Best-effort: even if the completion call fails, we still show the
      // thank-you screen — the recordings are already uploaded.
    }
    setScreen('thankyou');
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      {screen === 'landing' && <Landing onBegin={() => setScreen('code')} />}

      {screen === 'code' && (
        <StudyCode
          onValid={handleCodeValid}
          onBack={() => setScreen('landing')}
        />
      )}

      {screen === 'consent' && (
        <Consent
          onAccept={handleConsentAccepted}
          onBack={() => setScreen('code')}
        />
      )}

      {screen === 'demographics' && (
        <>
          <DemographicsScreen
            onSubmit={handleDemographicsSubmit}
            onBack={() => setScreen('consent')}
          />
          {sessionError && (
            <div className="max-w-3xl mx-auto px-6 pb-10 text-sm text-red-900">
              Couldn't start session: {sessionError}
            </div>
          )}
        </>
      )}

      {screen === 'menu' && (
        <TestMenu
          completedTests={completedTests}
          onSelect={handleSelectTest}
          onFinish={handleFinish}
        />
      )}

      {screen === 'cookie' && sessionId && (
        <CookieTheft
          sessionId={sessionId}
          onDone={() => handleTestDone('cookie_theft')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'recall' && sessionId && (
        <WordRecall
          sessionId={sessionId}
          onDone={() => handleTestDone('word_recall')}
          onBack={() => setScreen('menu')}
        />
      )}

      {screen === 'thankyou' && <ThankYou />}
    </div>
  );
}
