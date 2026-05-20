import { createDriveFolder, findDriveFolder, getOrCreateDriveFolder } from './googleDriveStorage';

export const projectFolderCategories = [
  'Drawings',
  'Material Tests',
  'Site Photos',
  'TPA Reports',
  'Bills',
  'Diesel Logs',
  'Inspection Videos',
];

export function buildDriveProjectFolderName(projectId: string) {
  return `NIRMAN AI/${projectId}`;
}

export function buildDriveCategoryName(category: string) {
  if (projectFolderCategories.includes(category)) return category;
  return 'Documents';
}

export async function ensureProjectFolders(projectId: string, accessToken?: string) {
  const root = await getOrCreateDriveFolder('NIRMAN AI', undefined, accessToken);
  const projectFolder = await getOrCreateDriveFolder(buildDriveProjectFolderName(projectId), root.id, accessToken);
  const children = await Promise.all(
    projectFolderCategories.map(async (category) => {
      const existing = await findDriveFolder(category, projectFolder.id, accessToken);
      return existing || (await createDriveFolder(category, projectFolder.id, accessToken));
    }),
  );
  return {
    root,
    projectFolder,
    categoryFolders: Object.fromEntries(children.map((folder) => [folder.name, folder])),
  };
}

export async function getCategoryFolderId(projectId: string, category: string, accessToken?: string) {
  const projectFolder = await getOrCreateDriveFolder(buildDriveProjectFolderName(projectId), undefined, accessToken);
  const folder = await getOrCreateDriveFolder(buildDriveCategoryName(category), projectFolder.id, accessToken);
  return folder.id;
}
