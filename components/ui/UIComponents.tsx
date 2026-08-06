/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, Info, LucideIcon } from 'lucide-react';

/* ============================================================================
   1. PAGE HEADER COMPONENT
   ============================================================================ */
export interface UIHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onBack?: () => void;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function UIHeader({
  title,
  subtitle,
  icon: Icon,
  onBack,
  actions,
  badge,
  className = '',
}: UIHeaderProps) {
  return (
    <div
      className={`bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3 w-full sm:w-auto">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="p-2 sm:p-2.5 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer text-slate-500 hover:text-slate-800 shrink-0"
            title="Voltar"
          >
            <ArrowLeft className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>
        )}

        {Icon && (
          <div className="p-2.5 sm:p-3 bg-slate-100 rounded-xl sm:rounded-2xl text-[#003366] shrink-0">
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-base sm:text-lg font-bold text-[#003366] tracking-tight uppercase">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed truncate sm:whitespace-normal">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end shrink-0 flex-wrap">
          {actions}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   2. CARD CONTAINER COMPONENT
   ============================================================================ */
export interface UICardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function UICard({ children, className = '', noPadding = false, ...props }: UICardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs transition duration-150 ${
        noPadding ? '' : 'p-4 sm:p-6 space-y-4'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/* ============================================================================
   3. BUTTON COMPONENTS
   ============================================================================ */
export interface UIButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  children?: React.ReactNode;
  loading?: boolean;
}

export function UIButton({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  loading = false,
  disabled,
  className = '',
  ...props
}: UIButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl transition duration-150 cursor-pointer focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.99] whitespace-nowrap';

  const sizeClasses = {
    sm: 'h-8 sm:h-9 px-3 py-1.5 text-xs gap-1.5',
    md: 'h-10 sm:h-11 px-4 py-2.5 text-xs sm:text-sm gap-2',
    lg: 'h-11 sm:h-12 px-5 py-3 text-sm gap-2.5',
  };

  const variantClasses = {
    primary:
      'bg-[#003366] text-white hover:bg-[#002244] focus:ring-[#003366]/20 shadow-xs border border-transparent',
    secondary:
      'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200 shadow-xs',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200 shadow-xs border border-transparent',
    outline:
      'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-[#003366] hover:border-slate-300 focus:ring-[#003366]/10 shadow-2xs',
    ghost:
      'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-200 border border-transparent',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      {children}
    </button>
  );
}

/* ============================================================================
   4. FORM CONTROL COMPONENTS
   ============================================================================ */
export interface UIFormGroupProps {
  label?: string;
  required?: boolean;
  error?: string;
  helpText?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}

export function UIFormGroup({
  label,
  required = false,
  error,
  helpText,
  children,
  className = '',
  htmlFor,
}: UIFormGroupProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
          {label}
          {required && <span className="text-rose-500 font-bold ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}
      {helpText && !error && <p className="text-[11px] text-slate-400 font-medium">{helpText}</p>}
    </div>
  );
}

export interface UIInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  onClear?: () => void;
}

export const UIInput = React.forwardRef<HTMLInputElement, UIInputProps>(
  ({ icon: Icon, onClear, className = '', value, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </span>
        )}
        <input
          ref={ref}
          value={value}
          className={`w-full bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold h-10 sm:h-11 transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#003366]/15 focus:border-[#003366] placeholder:text-slate-400 placeholder:font-normal ${
            Icon ? 'pl-9.5' : 'pl-3.5'
          } ${onClear && value ? 'pr-9' : 'pr-3.5'} ${className}`}
          {...props}
        />
        {onClear && value && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            title="Limpar"
          >
            <span className="text-xs font-bold">×</span>
          </button>
        )}
      </div>
    );
  }
);
UIInput.displayName = 'UIInput';

export const UISelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-semibold h-10 sm:h-11 px-3.5 py-2 transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#003366]/15 focus:border-[#003366] cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
UISelect.displayName = 'UISelect';

export const UITextarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full bg-white border border-slate-200 rounded-xl text-slate-800 text-xs sm:text-sm font-medium p-3 transition duration-150 focus:outline-none focus:ring-2 focus:ring-[#003366]/15 focus:border-[#003366] placeholder:text-slate-400 ${className}`}
        {...props}
      />
    );
  }
);
UITextarea.displayName = 'UITextarea';

/* ============================================================================
   5. STATUS BADGE COMPONENT
   ============================================================================ */
export interface UIBadgeProps {
  status?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | string;
  label: string;
  icon?: LucideIcon;
  className?: string;
}

export function UIBadge({ status = 'neutral', label, icon: Icon, className = '' }: UIBadgeProps) {
  const statusStyles: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    error: 'bg-rose-50 text-rose-700 border-rose-200/80',
    info: 'bg-sky-50 text-sky-700 border-sky-200/80',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const styleClass = statusStyles[status] || statusStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-2xs whitespace-nowrap uppercase tracking-wider ${styleClass} ${className}`}
    >
      {Icon && <Icon className="w-3 h-3 shrink-0" />}
      {label}
    </span>
  );
}

/* ============================================================================
   6. ALERT FEEDBACK COMPONENT
   ============================================================================ */
export interface UIAlertProps {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export function UIAlert({ type = 'info', title, message, onClose, className = '' }: UIAlertProps) {
  const alertConfigs = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200/90 text-emerald-800',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200/90 text-amber-800',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
    },
    error: {
      bg: 'bg-rose-50 border-rose-200/90 text-rose-800',
      icon: AlertCircle,
      iconColor: 'text-rose-600',
    },
    info: {
      bg: 'bg-sky-50 border-sky-200/90 text-sky-800',
      icon: Info,
      iconColor: 'text-sky-600',
    },
  };

  const config = alertConfigs[type];
  const Icon = config.icon;

  return (
    <div
      className={`p-4 rounded-xl border flex items-start justify-between gap-3 text-xs sm:text-sm font-medium shadow-xs ${config.bg} ${className}`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${config.iconColor}`} />
        <div>
          {title && <h4 className="font-bold uppercase tracking-tight text-xs mb-0.5">{title}</h4>}
          <div className="leading-relaxed">{message}</div>
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-black/5 transition cursor-pointer shrink-0"
        >
          ×
        </button>
      )}
    </div>
  );
}

/* ============================================================================
   7. TABLE COMPONENTS
   ============================================================================ */
export function UITableContainer({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`w-full overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs ${className}`}>
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  );
}

export function UITableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50/90 border-b border-slate-200">
      <tr>{children}</tr>
    </thead>
  );
}

export function UITableTh({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

export function UITableRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <tr className={`border-b border-slate-100 hover:bg-slate-50/70 transition duration-150 ${className}`}>{children}</tr>;
}

export function UITableTd({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 text-xs font-medium text-slate-700 align-middle ${className}`}>{children}</td>;
}
