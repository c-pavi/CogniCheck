import { useEffect, useRef, useState } from 'react';

export interface RecorderState {
  isRecording: boolean;
  audioUrl: string | null;
  audioBlob: Blob | null;
  duration: number;
  error: string | null;
  mimeType: string | null;
  sampleRateHz: number | null;
  micDeviceLabel: string | null;
  startedAt: string | null;
  completedAt: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * Wraps the browser MediaRecorder API. Captures audio into a Blob and exposes
 * the URL for playback, plus timing and device metadata that goes into the
 * upload payload.
 */
export function useAudioRecorder(): RecorderState {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [sampleRateHz, setSampleRateHz] = useState<number | null>(null);
  const [micDeviceLabel, setMicDeviceLabel] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    audioUrlRef.current = audioUrl;
  }, [audioUrl]);

  // Cleanup on unmount: stop recording, release mic, revoke URL.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    };
  }, []);

  const start = async () => {
    setError(null);

    // Clear any previous recording before starting a new one.
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
      setAudioBlob(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Capture device + audio parameters for research metadata.
      const audioTrack = stream.getAudioTracks()[0];
      setMicDeviceLabel(audioTrack?.label || null);
      const trackSettings = audioTrack?.getSettings();
      setSampleRateHz(trackSettings?.sampleRate ?? null);

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      setMimeType(mr.mimeType || 'audio/webm');

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setCompletedAt(new Date().toISOString());
        stream.getTracks().forEach((t) => t.stop());
      };

      mr.start();
      const now = Date.now();
      startTimeRef.current = now;
      setStartedAt(new Date(now).toISOString());
      setCompletedAt(null);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);
      setIsRecording(true);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not access microphone';
      setError(`${message}. Please check that your browser has permission to use the microphone.`);
    }
  };

  const stop = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAudioBlob(null);
    setDuration(0);
    setError(null);
    setStartedAt(null);
    setCompletedAt(null);
  };

  return {
    isRecording,
    audioUrl,
    audioBlob,
    duration,
    error,
    mimeType,
    sampleRateHz,
    micDeviceLabel,
    startedAt,
    completedAt,
    start,
    stop,
    reset,
  };
}
