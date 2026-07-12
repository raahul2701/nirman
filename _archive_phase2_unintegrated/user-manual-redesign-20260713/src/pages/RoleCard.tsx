import React from 'react';
import { Card } from '@/components/ui/Card';
import type { Role } from '@/types/userManual';

export const RoleCard = React.memo(({ role }: { role: Role }) => (
  <Card className="p-4">
    <h3 className="font-semibold text-foreground">{role.role}</h3>
    <div className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
      <p><strong className="font-semibold text-foreground">Can do:</strong> {role.can}</p>
      <p><strong className="font-semibold text-foreground">Use daily:</strong> {role.daily}</p>
      <p><strong className="font-semibold text-foreground">Review:</strong> {role.review}</p>
      <p><strong className="font-semibold text-foreground">Cannot do:</strong> {role.cannot}</p>
    </div>
  </Card>
));
