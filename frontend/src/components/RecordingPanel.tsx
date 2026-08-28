import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
  Mic,
  RotateCcw,
  Square,
  Upload,
} from 'lucide-react';

import { api } from '../api';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import type { RecordingMetadata, TestType } from '../types';

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface RecordingPanelProps {
  sessionId: string;
  testType: TestType;
  testConfig?: Record<string, unknown>;
  suggestedSec: number;
  onUploaded: () => void;
  restartLabel?: string;
  onRestart?: () => void;
}

/**
 * The main recording UI, reused by both test screens. Owns the recorder hook
 * and drives upload once the user confirms.
 */
export function RecordingPanel({
  sessionId,
  testType,
  testConfig,
  suggestedSec,
  onUploaded,
  restartLabel = 'Record again',
  onRestart,
}: RecordingPanelProps) {
  const recorder = useAudioRecorder();
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    'idle',
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const overSuggested = recorder.duration > suggestedSec;

  const handleUpload = async () => {
    if (!recorder.audioBlob || !recorder.startedAt || !recorder.completedAt) return;
    setUploadState('uploading');
    setUploadError(null);
    try {
      const metadata: RecordingMetadata = {
        test_type: testType,
        started_at: recorder.startedAt,
        completed_at: recorder.completedAt,
        duration_sec: recorder.duration,
        mime_type: recorder.mimeType ?? undefined,
        sample_rate_hz: recorder.sampleRateHz ?? undefined,
        mic_device_label: recorder.micDeviceLabel ?? undefined,
        test_config: testConfig,
      };
      await api.uploadRecording(sessionId, metadata, recorder.audioBlob);
      setUploadState('done');
      onUploaded();
    } catch (err) {
      setUploadState('error');
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  const handleRestart = () => {
    recorder.reset();
    setUploadState('idle');
    setUploadError(null);
    if (onRestart) onRestart();
  };

  const handleDownload = () => {
    if (!recorder.audioBlob) return;
    const url = URL.createObjectURL(recorder.audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${testType}_${new Date().toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const { isRecording, audioUrl, duration, error, start, stop } = recorder;

  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6 sm:p-8">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-sm text-red-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium mb-1">Microphone unavailable</div>
            <div className="text-red-800">{error}</div>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-sm text-red-900">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium mb-1">Upload failed</div>
            <div className="text-red-800">{uploadError}</div>
            <div className="text-red-700 mt-2 text-xs">
              Your recording is still saved in this browser. Press "Try upload again".
            </div>
          </div>
        </div>
      )}

      {/* Idle: show start button */}
      {!audioUrl && !isRecording && (
        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            onClick={start}
            aria-label="Start recording"
            className="w-20 h-20 rounded-full bg-red-700 hover:bg-red-800 flex items-center justify-center text-white shadow-sm transition-colors"
          >
            <Mic size={30} />
          </button>
          <div className="mt-4 text-sm text-stone-600">Tap to start recording</div>
          <div className="mt-1 text-xs text-stone-400">
            Suggested duration: {formatTime(suggestedSec)}
          </div>
        </div>
      )}

      {/* Recording in progress */}
      {isRecording && (
        <div className="flex flex-col items-center py-6">
          <button
            type="button"
            onClick={stop}
            aria-label="Stop recording"
            className="w-20 h-20 rounded-full bg-red-700 hover:bg-red-800 flex items-center justify-center text-white shadow-sm transition-colors relative"
          >
            <Square size={26} fill="white" />
            <span className="absolute inset-0 rounded-full border-4 border-red-700 animate-ping opacity-60" />
          </button>
          <div className="mt-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
            <span className="text-lg font-mono tabular-nums text-stone-900">
              {formatTime(duration)}
            </span>
          </div>
          <div className={`mt-1 text-xs ${overSuggested ? 'text-amber-700' : 'text-stone-400'}`}>
            {overSuggested
              ? `Past suggested ${formatTime(suggestedSec)} — stop when ready`
              : `Recording • Suggested ${formatTime(suggestedSec)}`}
          </div>
        </div>
      )}

      {/* Recorded: playback + submit */}
      {audioUrl && !isRecording && (
        <div className="space-y-5">
          <div className="flex items-center gap-3 text-sm text-emerald-900">
            <CheckCircle2 size={18} />
            <span className="font-medium">Recording complete • {formatTime(duration)}</span>
          </div>

          <audio src={audioUrl} controls className="w-full" />

          {uploadState === 'done' ? (
            <div className="flex items-center gap-3 text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-md p-4">
              <CheckCircle2 size={18} />
              <span className="font-medium">Uploaded successfully.</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={handleUpload}
                disabled={uploadState === 'uploading'}
                className="flex items-center gap-2 bg-emerald-900 hover:bg-emerald-950 disabled:bg-stone-300 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                {uploadState === 'uploading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading…
                  </>
                ) : uploadState === 'error' ? (
                  <>
                    <Upload size={16} />
                    Try upload again
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Submit recording
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                disabled={uploadState === 'uploading'}
                className="flex items-center gap-2 bg-white border border-stone-300 hover:border-stone-400 text-stone-700 text-sm font-medium px-4 py-2 rounded-md transition-colors"
              >
                <RotateCcw size={16} />
                {restartLabel}
              </button>

              <button
                type="button"
                onClick={handleDownload}
                disabled={uploadState === 'uploading'}
                className="flex items-center gap-2 text-stone-500 hover:text-stone-800 text-sm font-medium px-4 py-2 transition-colors"
              >
                <Download size={16} />
                Download
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
