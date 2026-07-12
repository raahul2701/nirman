import React from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { UploadInfoItem } from '@/types/userManual';

export const UploadInfo = React.memo(({ name, route, upload, who, verification, review }: UploadInfoItem) => (
  <Card className="p-4">
    <div className="mb-2 flex flex-wrap items-center gap-2">
      <h3 className="font-semibold text-foreground">{name}</h3>
      <Badge color="green" variant="ghost" className="font-mono">{route}</Badge>
    </div>
    <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
      <p><strong className="font-semibold text-foreground">What to upload:</strong> {upload}</p>
      <p><strong className="font-semibold text-foreground">Who uploads:</strong> {who}</p>
      <p><strong className="font-semibold text-foreground">How verification works:</strong> {verification}</p>
      <p><strong className="font-semibold text-foreground">What to review:</strong> {review}</p>
    </div>
  </Card>
));
