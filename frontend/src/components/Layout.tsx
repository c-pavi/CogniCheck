import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';

interface LayoutProps {
  eyebrow?: string;
  title?: string;
  children: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  maxWidth?: 'narrow' | 'wide';
}

/** Standard screen layout: back link + eyebrow + title + content. */
export function Layout({
  eyebrow,
  title,
  children,
  onBack,
  backLabel = 'Back',
  maxWidth = 'narrow',
}: LayoutProps) {
  const widthClass = maxWidth === 'wide' ? 'max-w-5xl' : 'max-w-3xl';
  return (
    <div className={`${widthClass} mx-auto px-6 py-10`}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 mb-8 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>{backLabel}</span>
        </button>
      )}

      {(eyebrow || title) && (
        <div className="mb-8">
          {eyebrow && (
            <div className="text-xs tracking-widest uppercase text-stone-500 mb-2">
              {eyebrow}
            </div>
          )}
          {title && (
            <h1 className="text-3xl font-semibold text-stone-900">{title}</h1>
          )}
        </div>
      )}

      {children}
    </div>
  );
}

interface PromptCardProps {
  children: ReactNode;
}

export function PromptCard({ children }: PromptCardProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-lg p-6 sm:p-8">
      {children}
    </div>
  );
}
