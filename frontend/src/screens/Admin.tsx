import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import { adminAudioUrl, api } from '../api';
import type { AdminOverview, AdminRecording, AdminSession } from '../api';
import { SecondaryButton } from '../components/Button';
import { Layout } from '../components/Layout';
import { WORD_LIST, WORD_LIST_ID } from '../config';

// Researcher-only view of everything collected. Reached at /admin; the backend
// only serves its data when ADMIN_ENABLED=true (see backend/.env.example).

const AGE_ORDER = ['under_55', '55_64', '65_74', '75_84', '85_plus', 'prefer_not_say', 'not_given'];
const SEX_ORDER = ['female', 'male', 'other', 'prefer_not_say', 'not_given'];

const LABELS: Record<string, string> = {
  under_55: 'Under 55',
  '55_64': '55–64',
  '65_74': '65–74',
  '75_84': '75–84',
  '85_plus': '85+',
  female: 'Female',
  male: 'Male',
  other: 'Other',
  prefer_not_say: 'Prefer not to say',
  not_given: 'Not given',
  cookie_theft: 'Cookie Theft',
  word_recall: 'Word recall',
};

const label = (key: string | null) => (key ? LABELS[key] ?? key : '—');

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

/** Which list words appear in a recall transcript (plural-tolerant). */
function scoreRecall(transcript: string): Set<string> {
  const spoken = new Set(
    transcript
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter(Boolean)
      .map((w) => w.replace(/s$/, '')),
  );
  return new Set(WORD_LIST.filter((w) => spoken.has(w.replace(/s$/, ''))));
}

export function Admin() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [o, s] = await Promise.all([api.adminOverview(), api.adminSessions()]);
      setOverview(o);
      setSessions(s);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(
        msg.startsWith('404')
          ? 'The dashboard API is turned off. Set ADMIN_ENABLED=true in backend/.env and restart the backend.'
          : msg,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    return q ? sessions.filter((s) => s.study_code.includes(q)) : sessions;
  }, [sessions, query]);

  return (
    <Layout eyebrow="Researcher view" title="Collected data" maxWidth="wide">
      {error && (
        <div className="bg-white border border-red-200 text-red-900 rounded-lg p-6 mb-8">
          {error}
        </div>
      )}

      {overview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatTile
              value={overview.sessions}
              label="Sessions"
              detail={`${overview.completed_sessions} completed`}
            />
            <StatTile
              value={overview.active_codes}
              label="Study codes used"
              detail={`of ${overview.study_codes} issued`}
            />
            <StatTile
              value={overview.recordings}
              label="Recordings"
              detail={Object.entries(overview.recordings_by_test)
                .map(([t, n]) => `${n} ${label(t).toLowerCase()}`)
                .join(' · ')}
            />
            <StatTile
              value={formatDuration(overview.audio_seconds)}
              label="Audio collected"
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <BarCard title="Age" counts={overview.age_band} order={AGE_ORDER} />
            <BarCard title="Sex" counts={overview.sex} order={SEX_ORDER} />
            <BarCard title="Primary language" counts={overview.primary_language} />
          </div>
        </>
      )}

      {overview && (
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
          <h2 className="text-xl font-semibold text-stone-900">Sessions</h2>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by study code"
              className="border border-stone-300 rounded-md px-3 py-2 text-sm flex-1 sm:w-64 focus:outline-none focus:border-emerald-900"
            />
            <SecondaryButton
              onClick={load}
              disabled={loading}
              title="Refresh"
              className="flex items-center gap-2 !px-3 !py-2 text-sm"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </SecondaryButton>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {visible.map((s) => (
          <SessionCard key={s.id} session={s} />
        ))}
        {overview && visible.length === 0 && (
          <div className="text-sm text-stone-500">No sessions match.</div>
        )}
      </div>
    </Layout>
  );
}

function StatTile({ value, label, detail }: { value: number | string; label: string; detail?: string }) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <div className="text-3xl font-semibold text-stone-900 tabular-nums">{value}</div>
      <div className="text-sm text-stone-700 mt-1">{label}</div>
      {detail && <div className="text-xs text-stone-500 mt-1">{detail}</div>}
    </div>
  );
}

function BarCard({
  title,
  counts,
  order,
}: {
  title: string;
  counts: Record<string, number>;
  order?: string[];
}) {
  const entries = Object.entries(counts).sort(([a, x], [b, y]) =>
    order ? order.indexOf(a) - order.indexOf(b) : y - x,
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const max = Math.max(1, ...entries.map(([, n]) => n));

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5">
      <div className="text-xs tracking-widest uppercase text-stone-500 mb-4">{title}</div>
      {entries.length === 0 && <div className="text-sm text-stone-500">No data yet</div>}
      <div className="space-y-3">
        {entries.map(([key, n]) => (
          <div key={key} title={`${label(key)}: ${n} of ${total} sessions`}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-stone-700">{label(key)}</span>
              <span className="text-stone-500 tabular-nums">{n}</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-sm">
              <div
                className="h-full bg-emerald-900 rounded-sm"
                style={{ width: `${(n / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionCard({ session: s }: { session: AdminSession }) {
  const demographics = [
    label(s.age_band),
    label(s.sex),
    s.primary_language,
    s.education_years != null ? `${s.education_years} yrs education` : null,
  ].filter(Boolean);

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <div className="flex items-baseline gap-3">
          <span className="font-mono font-semibold text-stone-900">{s.study_code}</span>
          <span className="text-sm text-stone-500">{formatDate(s.started_at)}</span>
        </div>
        <span
          className={
            'text-xs px-2 py-1 rounded ' +
            (s.completed_at ? 'bg-emerald-50 text-emerald-900' : 'bg-stone-100 text-stone-600')
          }
        >
          {s.completed_at ? 'Completed' : 'Not finished'}
        </span>
      </div>
      <div className="text-sm text-stone-600 mb-4">{demographics.join(' · ')}</div>

      {s.recordings.length === 0 ? (
        <div className="text-sm text-stone-500">No recordings.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {s.recordings.map((r) => (
            <RecordingBlock key={r.id} recording={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function RecordingBlock({ recording: r }: { recording: AdminRecording }) {
  const recalled =
    r.test_type === 'word_recall' && r.transcript && r.test_config.word_list_id === WORD_LIST_ID
      ? scoreRecall(r.transcript)
      : null;

  return (
    <div className="border border-stone-200 rounded-md p-4">
      <div className="flex justify-between text-sm mb-3">
        <span className="font-medium text-stone-900">{label(r.test_type)}</span>
        <span className="text-stone-500 tabular-nums">{formatDuration(r.duration_sec)}</span>
      </div>

      {r.audio_available ? (
        <audio controls preload="none" src={adminAudioUrl(r.id)} className="w-full h-10" />
      ) : (
        <div className="text-sm text-stone-500">Audio file missing on disk.</div>
      )}

      <div className="mt-3 text-sm">
        {r.transcript != null ? (
          <p className="text-stone-700 leading-relaxed">“{r.transcript}”</p>
        ) : (
          <p className="text-stone-400 italic">Not transcribed yet (run scripts/transcribe.py)</p>
        )}
      </div>

      {recalled && (
        <div className="mt-3">
          <div className="text-xs text-stone-500 mb-2">
            {recalled.size} of {WORD_LIST.length} words recalled
          </div>
          <div className="flex flex-wrap gap-1">
            {WORD_LIST.map((w) => (
              <span
                key={w}
                className={
                  'text-xs px-2 py-0.5 rounded ' +
                  (recalled.has(w)
                    ? 'bg-emerald-900 text-white'
                    : 'bg-stone-100 text-stone-400')
                }
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
