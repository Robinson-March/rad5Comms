import type { InputHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  icon?: LucideIcon;
  trailing?: ReactNode;
}

const AuthInput = ({ icon: Icon, trailing, className = '', ...props }: AuthInputProps) => {
  return (
    <label className="group relative flex items-center rounded-[22px] border border-border bg-panel-muted/80 px-4 py-3 transition focus-within:border-blue/30 focus-within:bg-white focus-within:shadow-[0_18px_35px_rgba(148,163,184,0.14)]">
      {Icon ? <Icon className="mr-3 h-5 w-5 shrink-0 text-text-secondary transition group-focus-within:text-blue" /> : null}
      <input
        {...props}
        className={`w-full bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-60 ${className}`.trim()}
      />
      {trailing ? <div className="ml-3 shrink-0">{trailing}</div> : null}
    </label>
  );
};

export default AuthInput;
