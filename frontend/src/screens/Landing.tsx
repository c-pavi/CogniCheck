import { PrimaryButton } from '../components/Button';

interface LandingProps {
  onBegin: () => void;
}

export function Landing({ onBegin }: LandingProps) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 sm:py-24">
      <div className="text-xs tracking-widest uppercase text-stone-500 mb-4">
        CogniCheck / Speech screening
      </div>
      <h1 className="text-4xl sm:text-5xl font-semibold text-stone-900 mb-4">
        Two short speech tests.
      </h1>
      <p className="text-lg text-stone-600 leading-relaxed mb-10 max-w-2xl">
        A research prototype for detecting early signs of cognitive change from
        speech. Both tests together take about six minutes. Nothing you record
        will be shown to you — everything is stored for the researcher to analyze
        later.
      </p>

      <PrimaryButton onClick={onBegin}>Begin</PrimaryButton>

      <div className="mt-16 pt-8 border-t border-stone-200 text-xs text-stone-400">
        Research prototype • Not for clinical use
      </div>
    </div>
  );
}
