import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';

type ClearButtonProps = {
  onClear: () => void;
  ariaLabel: string;
};

function ClearButton({ onClear, ariaLabel }: ClearButtonProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
      aria-label={ariaLabel}
      title="清空"
    >
      <X className="h-4 w-4" />
    </button>
  );
}

type ClearableInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  clearAriaLabel: string;
  containerClassName?: string;
};

export function ClearableInput({
  value,
  onChange,
  onClear,
  clearAriaLabel,
  className,
  containerClassName = 'relative',
  ...rest
}: ClearableInputProps) {
  return (
    <div className={containerClassName}>
      <input
        {...rest}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {value && <ClearButton onClear={onClear} ariaLabel={clearAriaLabel} />}
    </div>
  );
}

type ClearableTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  clearAriaLabel: string;
  containerClassName?: string;
};

export function ClearableTextarea({
  value,
  onChange,
  onClear,
  clearAriaLabel,
  className,
  containerClassName = 'relative',
  ...rest
}: ClearableTextareaProps) {
  return (
    <div className={containerClassName}>
      <textarea
        {...rest}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={className}
      />
      {value && <ClearButton onClear={onClear} ariaLabel={clearAriaLabel} />}
    </div>
  );
}
