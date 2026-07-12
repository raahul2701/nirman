import { TodaysWorkViewModel } from '../../config/todays-work.config';
import { TodaysWorkItem } from './TodaysWorkItem';

interface TodaysWorkContentProps {
  tasks: TodaysWorkViewModel[];
}

export function TodaysWorkContent({ tasks }: TodaysWorkContentProps) {
  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <TodaysWorkItem key={task.id} task={task} />
      ))}
    </div>
  );
}