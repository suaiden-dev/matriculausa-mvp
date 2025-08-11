import * as React from 'react';
import { cn } from '../../lib/cn';

type DivProps = React.ComponentProps<'div'>;

interface AlertProps extends DivProps {
  variant?: 'default' | 'destructive';
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        'w-full rounded-lg border px-4 py-3 text-sm grid grid-cols-[0_1fr] gap-x-3',
        variant === 'destructive' && 'border-red-300 bg-white text-red-700',
        variant === 'default' && 'border-slate-200 bg-white text-slate-700',
        className
      )}
      {...props}
    />
  );
}

export function AlertTitle({ className, ...props }: DivProps) {
  return (
    <div className={cn('col-start-2 font-medium', className)} {...props} />
  );
}

export function AlertDescription({ className, ...props }: DivProps) {
  return (
    <div className={cn('col-start-2 text-sm text-slate-500', className)} {...props} />
  );
}


