import { TodaysWorkDTO } from '../config/todays-work.config';

const now = new Date();

const mockTodaysWork: TodaysWorkDTO[] = [
  {
    id: 'task-1',
    taskType: 'INSPECTION',
    title: 'Slab Reinforcement Check - Block A',
    dueTime: new Date(now.setHours(11, 0, 0, 0)).toISOString(),
    status: 'pending',
    priority: 'high',
    actionLabel: 'Start',
    workflowId: 'inspection',
    entityId: 'insp-123',
  },
  {
    id: 'task-2',
    taskType: 'DPR',
    title: 'Submit Daily Progress Report',
    dueTime: new Date(now.setHours(17, 0, 0, 0)).toISOString(),
    status: 'pending',
    priority: 'medium',
    actionLabel: 'Submit',
    workflowId: 'dpr',
    entityId: 'dpr-456',
  },
  {
    id: 'task-3',
    taskType: 'MATERIAL_VERIFICATION',
    title: 'Verify Cement Batch #C-789',
    dueTime: new Date(now.setHours(14, 30, 0, 0)).toISOString(),
    status: 'pending',
    priority: 'medium',
    actionLabel: 'Verify',
    workflowId: 'material-verification',
    entityId: 'mat-789',
  },
];

export const todaysWorkService = {
  getTodaysWork: async (_projectId: string, _userId: string): Promise<TodaysWorkDTO[]> => {
    // TODO(API): Replace with an actual API call to fetch today's tasks for the given project and user.
    void _projectId;
    void _userId;
    return Promise.resolve(mockTodaysWork);
  },
};
