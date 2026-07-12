import { mockProjectStatusResponse, ProjectStatusResponse } from './project-status.config';

export interface ProjectStatusRepository {
  getProjectStatus(projectId: string): Promise<ProjectStatusResponse>;
}

export const projectStatusRepository: ProjectStatusRepository = {
  async getProjectStatus(projectId: string) {
    console.log(`Fetching project status for project: ${projectId}`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    return mockProjectStatusResponse;
  },
};

export const projectStatusService = {
  async getProjectStatus(projectId: string) {
    return projectStatusRepository.getProjectStatus(projectId);
  },
};