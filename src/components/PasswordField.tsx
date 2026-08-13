import React, { useState } from 'react';

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

export const PasswordField: React.FC<Props> = ({ label, className, id, ...inputProps }) => {
  const [visible, setVisible] = useState(false);
  const inputId = id || inputProps.name || 'password';
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold uppercase text-slate-400 mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...inputProps}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`${className || ''} pr-12`}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
          onClick={() => setVisible(value => !value)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
          tabIndex={0}
        >
          {visible ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6" />
              <path d="M9.9 5.1A9.8 9.8 0 0112 5c5 0 9.3 3.1 11 7.5a11.8 11.8 0 01-4.2 5.1" />
              <path d="M6.7 6.7C4.3 8.2 2.6 10.4 1 12.5 2.7 16.9 7 20 12 20a10.4 10.4 0 005.3-1.4" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5" aria-hidden="true">
              <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5C21.3 16.9 17 20 12 20S2.7 16.9 1 12.5z" />
              <circle cx="12" cy="12.5" r="3.5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};
