'use client';

import { Input } from '@/components/ui/input';
import { LIVESTOCK_FORM_LABELS } from '@/features/livestock-application/labels';

type FieldKey = keyof typeof LIVESTOCK_FORM_LABELS.fields;

interface BaseProps {
  fieldName: FieldKey;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  hideLabel?: boolean;
  placeholder?: string;
}

const selectClass =
  'w-full min-w-[12rem] rounded-lg border-2 border-gray-200 px-3 py-2.5 text-sm text-gray-900 focus:border-[var(--main-blue)] focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-gray-100 disabled:cursor-not-allowed';

function resolvePlaceholder(fieldName: FieldKey, override?: string): string | undefined {
  const placeholders = LIVESTOCK_FORM_LABELS.placeholders as Partial<Record<FieldKey, string>>;
  return override ?? placeholders[fieldName];
}

export function LivestockTextField({
  fieldName,
  value,
  onChange,
  error,
  required,
  disabled,
  type = 'text',
  hideLabel,
  placeholder,
  step,
  inputMode,
}: BaseProps & { type?: string; step?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'] }) {
  return (
    <Input
      name={fieldName}
      label={LIVESTOCK_FORM_LABELS.fields[fieldName]}
      type={type}
      step={step}
      inputMode={inputMode}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      required={required}
      disabled={disabled}
      size="compact"
      hideLabel={hideLabel}
      placeholder={resolvePlaceholder(fieldName, placeholder)}
    />
  );
}

export function LivestockTextArea({
  fieldName,
  value,
  onChange,
  error,
  required,
  disabled,
  rows = 3,
  placeholder,
}: BaseProps & { rows?: number }) {
  const label = LIVESTOCK_FORM_LABELS.fields[fieldName];
  const ph = resolvePlaceholder(fieldName, placeholder);
  return (
    <div className="mb-2">
      <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <textarea
        name={fieldName}
        rows={rows}
        value={value}
        disabled={disabled}
        placeholder={ph}
        onChange={(e) => onChange(e.target.value)}
        className={`${selectClass} min-w-0 resize-y min-h-[80px] placeholder:text-gray-400`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LivestockSelect({
  fieldName,
  value,
  onChange,
  options,
  error,
  required,
  disabled,
  placeholder = 'Hitamo…',
  hideLabel,
}: BaseProps & {
  options: readonly { value: string; label: string }[];
  placeholder?: string;
}) {
  const label = LIVESTOCK_FORM_LABELS.fields[fieldName];
  return (
    <div className={hideLabel ? 'mb-0 min-w-[12rem]' : 'mb-2'}>
      {!hideLabel && (
        <label className="mb-1 block text-xs font-semibold tracking-wide text-gray-600">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <select
        name={fieldName}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function LivestockRadioGroup({
  fieldName,
  value,
  onChange,
  options,
  error,
  required,
  disabled,
}: BaseProps & { options: readonly { value: string; label: string }[] }) {
  const label = LIVESTOCK_FORM_LABELS.fields[fieldName];
  return (
    <fieldset className="mb-2" disabled={disabled}>
      <legend className="mb-2 text-xs font-semibold tracking-wide text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </legend>
      <div className="flex flex-wrap gap-4">
        {options.map((opt) => (
          <label key={opt.value} className="inline-flex items-center gap-2 text-sm text-gray-800">
            <input
              type="radio"
              name={fieldName}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 text-[var(--main-blue)]"
            />
            {opt.label}
          </label>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </fieldset>
  );
}
