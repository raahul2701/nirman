export type ProjectStatusResponse = {
  progress: {
    physical: number;
    financial: number;
  };
  schedule: {
    delayInDays: number;
  };
  alerts: {
    activeHindrances: number;
    openIssues: number;
  };
  updatedAt: string;
};

export type ProjectStatusDTO = ProjectStatusResponse;

export type ProjectStatusViewModel = {
  physicalProgress: number;
  financialProgress: number;
  delayDays: number;
  delayVariant: 'default' | 'destructive';
  hindranceCount: number;
  issueCount: number;
  lastUpdated: string;
};

export const mockProjectStatusResponse: ProjectStatusResponse = {
  progress: {
    physical: 34,
    financial: 28,
  },
  schedule: {
    delayInDays: 5,
  },
  alerts: {
    activeHindrances: 2,
    openIssues: 3,
  },
  updatedAt: '2026-07-05T12:00:00.000Z',
};

export const mockProjectStatus: ProjectStatusResponse = mockProjectStatusResponse;