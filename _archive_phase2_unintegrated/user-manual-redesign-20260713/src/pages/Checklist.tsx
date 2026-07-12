import React from 'react';
import { CheckSquare } from 'lucide-react';

interface ChecklistProps {
  items: readonly string[];
}

export const Checklist = React.memo(({ items }: ChecklistProps) => (
  <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground" role="list">
    {items.map((item) => (
      <li key={item} className="flex gap-2" role="listitem">
        <CheckSquare size={15} className="mt-0.5 flex-shrink-0 text-primary" aria-hidden="true" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
));
