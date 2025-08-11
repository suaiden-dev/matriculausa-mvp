import * as React from 'react';
import { cn } from '../../lib/cn';

type DivProps = React.ComponentProps<'div'>;

export function Separator({ className, ...props }: DivProps) {
  return (
    <div
      role="separator"
      className={cn('bg-slate-200 h-px w-full', className)}
      {...props}
    />
  );
}


