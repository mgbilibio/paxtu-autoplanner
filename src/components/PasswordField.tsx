import React, { useState } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
}

/** Campo de senha com olho mostrar/ocultar (todo campo de senha da web). */
export const PasswordField: React.FC<Props> = ({
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  disabled,
  id,
  className = 'w-full p-3 rounded-lg bg-slate-900 border border-slate-600 pr-12',
}) => {
  const [visible, setVisible] = useState(false);
  const label = visible ? 'Ocultar senha' : 'Mostrar senha';
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        className={className}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={label}
        title={label}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-current"
      >
        {visible ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 10.6a2 2 0 102.8 2.8" />
            <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.8 11.8 0 01-2.2 3.3" />
            <path d="M6.6 6.6A11.7 11.7 0 001 12.5C2.7 16.9 7 20 12 20a10 10 0 005.4-1.6" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
            <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z" />
            <circle cx="12" cy="12.5" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
};
