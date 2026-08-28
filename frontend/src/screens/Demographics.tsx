import { FormEvent, useState } from 'react';

import { PrimaryButton } from '../components/Button';
import { Layout, PromptCard } from '../components/Layout';
import type { AgeBand, Demographics, Sex } from '../types';

interface DemographicsScreenProps {
  onSubmit: (data: Demographics) => void;
  onBack: () => void;
}

const AGE_OPTIONS: Array<{ value: AgeBand; label: string }> = [
  { value: 'under_55', label: 'Under 55' },
  { value: '55_64', label: '55 to 64' },
  { value: '65_74', label: '65 to 74' },
  { value: '75_84', label: '75 to 84' },
  { value: '85_plus', label: '85 or older' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
];

const SEX_OPTIONS: Array<{ value: Sex; label: string }> = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
];

const LANGUAGE_OPTIONS = [
  'English',
  'French',
  'Spanish',
  'Mandarin',
  'Cantonese',
  'Punjabi',
  'Tagalog',
  'Arabic',
  'Other',
];

export function DemographicsScreen({ onSubmit, onBack }: DemographicsScreenProps) {
  const [ageBand, setAgeBand] = useState<AgeBand | ''>('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [educationYears, setEducationYears] = useState<string>('');
  const [primaryLanguage, setPrimaryLanguage] = useState<string>('');

  const canSubmit = ageBand && sex && primaryLanguage;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const parsedEducation = educationYears.trim() === '' ? null : Number(educationYears);
    onSubmit({
      age_band: ageBand as AgeBand,
      sex: sex as Sex,
      education_years:
        parsedEducation !== null && Number.isFinite(parsedEducation) ? parsedEducation : null,
      primary_language: primaryLanguage,
    });
  };

  return (
    <Layout eyebrow="Step 3 of 4" title="A few questions about you" onBack={onBack}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <PromptCard>
          <div className="space-y-8">
            <RadioGroup
              legend="Your age"
              name="age"
              options={AGE_OPTIONS}
              value={ageBand}
              onChange={(v) => setAgeBand(v as AgeBand)}
            />
            <RadioGroup
              legend="Your sex"
              name="sex"
              options={SEX_OPTIONS}
              value={sex}
              onChange={(v) => setSex(v as Sex)}
            />
            <div>
              <label
                htmlFor="education"
                className="block text-base font-medium text-stone-900 mb-3"
              >
                Years of formal education
                <span className="text-stone-500 font-normal ml-2">(optional)</span>
              </label>
              <input
                id="education"
                type="number"
                min={0}
                max={30}
                placeholder="e.g. 12"
                value={educationYears}
                onChange={(e) => setEducationYears(e.target.value)}
                className="w-32 bg-white border border-stone-300 focus:border-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-900 rounded-md px-3 py-2 text-stone-900"
              />
            </div>
            <div>
              <label
                htmlFor="language"
                className="block text-base font-medium text-stone-900 mb-3"
              >
                Primary language spoken at home
              </label>
              <select
                id="language"
                value={primaryLanguage}
                onChange={(e) => setPrimaryLanguage(e.target.value)}
                className="w-full sm:w-64 bg-white border border-stone-300 focus:border-emerald-900 focus:outline-none focus:ring-1 focus:ring-emerald-900 rounded-md px-3 py-2 text-stone-900"
              >
                <option value="" disabled>
                  Select a language…
                </option>
                {LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </PromptCard>

        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={!canSubmit}>
            Continue
          </PrimaryButton>
        </div>
      </form>
    </Layout>
  );
}

interface RadioGroupProps {
  legend: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (v: string) => void;
}

function RadioGroup({ legend, name, options, value, onChange }: RadioGroupProps) {
  return (
    <fieldset>
      <legend className="text-base font-medium text-stone-900 mb-3">{legend}</legend>
      <div className="space-y-2">
        {options.map((opt) => (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-3 border rounded-md cursor-pointer transition-colors ${
              value === opt.value
                ? 'border-emerald-900 bg-emerald-50'
                : 'border-stone-200 hover:border-stone-300'
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={(e) => onChange(e.target.value)}
              className="w-5 h-5 accent-emerald-900 cursor-pointer"
            />
            <span className="text-stone-800">{opt.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
