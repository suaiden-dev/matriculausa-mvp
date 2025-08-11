import * as React from 'react';
import { cn } from '../../lib/cn';

type DivProps = React.ComponentProps<'div'>;

export function Card({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'bg-white text-slate-900 flex flex-col gap-0 rounded-2xl border border-slate-200 shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6',
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: DivProps) {
  return (
    <div data-slot="card-title" className={cn('font-semibold', className)} {...props} />
  );
}

export function CardDescription({ className, ...props }: DivProps) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-slate-500', className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }: DivProps) {
  return (
    <div data-slot="card-content" className={cn('px-6', className)} {...props} />
  );
}

export function CardFooter({ className, ...props }: DivProps) {
  return (
    <div data-slot="card-footer" className={cn('px-6 pb-6', className)} {...props} />
  );
}


