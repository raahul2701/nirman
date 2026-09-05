import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ProjectOption } from '../services/assignedProjectsService';
import { loadContractorProjects } from '../services/contractorSiteTeamService';
import {
  createEquipmentAsset,
  deployEquipmentAsset,
  endEquipmentDeployment,
  listEquipmentAssets,
  listEquipmentDeployments,
  listEquipmentExecutionLogs,
  recordEquipmentExecution,
  setEquipmentAssetStatus,
  uploadEquipmentExecutionPhotos,
  type CreateEquipmentAssetInput,
  type DeployEquipmentAssetInput,
  type EquipmentAssetRecord,
  type EquipmentDeploymentRecord,
  type EquipmentExecutionLogRecord,
  type RecordEquipmentExecutionInput,
} from '../services/contractorEquipmentService';

export type EquipmentViewTab = 'today' | 'history' | 'assets';

export type LatestMeterReading = { hourMeter: number; km: number };

export function useEquipmentExecution() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [assets, setAssets] = useState<EquipmentAssetRecord[]>([]);
  const [deployments, setDeployments] = useState<EquipmentDeploymentRecord[]>([]);
  const [logs, setLogs] = useState<EquipmentExecutionLogRecord[]>([]);

  // Business lock C: the V1 UI supports project_table='projects' only.
  const projectOptions = useMemo(() => projects.filter((project) => project.table === 'projects'), [projects]);
  const selectedProject = useMemo(
    () => projectOptions.find((project) => project.id === selectedProjectId) ?? null,
    [projectOptions, selectedProjectId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedProjects, loadedAssets, loadedDeployments, loadedLogs] = await Promise.all([
        loadContractorProjects(),
        listEquipmentAssets(),
        listEquipmentDeployments(),
        listEquipmentExecutionLogs({ limit: 200 }),
      ]);
      setProjects(loadedProjects);
      setAssets(loadedAssets);
      setDeployments(loadedDeployments);
      setLogs(loadedLogs);
      setSelectedProjectId((current) => current || loadedProjects.find((project) => project.table === 'projects')?.id || '');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load equipment execution data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const registerAsset = useCallback(async (input: CreateEquipmentAssetInput) => {
    await createEquipmentAsset(input);
    await refresh();
  }, [refresh]);

  const toggleAssetStatus = useCallback(async (assetId: string, status: 'active' | 'inactive') => {
    await setEquipmentAssetStatus(assetId, status);
    await refresh();
  }, [refresh]);

  const deployAsset = useCallback(async (input: DeployEquipmentAssetInput) => {
    await deployEquipmentAsset(input);
    await refresh();
  }, [refresh]);

  const endDeployment = useCallback(async (deploymentId: string) => {
    await endEquipmentDeployment(deploymentId);
    await refresh();
  }, [refresh]);

  const recordExecution = useCallback(async (input: RecordEquipmentExecutionInput) => {
    if (!selectedProject) throw new Error('Select a project first.');
    const result = await recordEquipmentExecution(selectedProject.id, input);
    await refresh();
    return result;
  }, [refresh, selectedProject]);

  const uploadPhotos = useCallback(async (files: File[]) => uploadEquipmentExecutionPhotos(files), []);

  /**
   * Latest authoritative closing readings per asset (server-generated values
   * from the last log, falling back to the asset registration readings) so the
   * execution form can prefill the next expected meter baselines.
   */
  const latestReadings = useMemo(() => {
    const map = new Map<string, LatestMeterReading>();
    assets.forEach((asset) => map.set(asset.id, { hourMeter: asset.initial_hour_meter, km: asset.initial_km }));
    [...logs]
      .sort((a, b) => (a.execution_date < b.execution_date ? -1 : a.execution_date > b.execution_date ? 1 : 0))
      .forEach((log) => map.set(log.equipment_asset_id, { hourMeter: log.end_hour_meter, km: log.end_km }));
    return map;
  }, [assets, logs]);

  const today = new Date().toISOString().slice(0, 10);

  const projectDeployments = useMemo(
    () => (selectedProject ? deployments.filter((deployment) => deployment.project_id === selectedProject.id) : []),
    [deployments, selectedProject],
  );

  const todayDeployments = useMemo(
    () => projectDeployments.filter(
      (deployment) => deployment.status === 'active' && deployment.deployed_on <= today
        && assets.some((asset) => asset.id === deployment.equipment_asset_id && asset.status === 'active'),
    ),
    [assets, projectDeployments, today],
  );

  const projectLogs = useMemo(
    () => (selectedProject ? logs.filter((log) => log.project_id === selectedProject.id) : []),
    [logs, selectedProject],
  );

  const todayLogs = useMemo(() => projectLogs.filter((log) => log.execution_date === today), [projectLogs, today]);

  const kpis = useMemo(() => ({
    deployedCount: todayDeployments.length,
    loggedCount: todayLogs.length,
    runningHours: todayLogs.reduce((sum, log) => sum + (Number(log.running_hours) || 0), 0),
    kmTravelled: todayLogs.reduce((sum, log) => sum + (Number(log.km_travelled) || 0), 0),
    fuelUsed: todayLogs.reduce((sum, log) => sum + (Number(log.fuel_used_litres) || 0), 0),
  }), [todayDeployments, todayLogs]);

  return {
    loading,
    error,
    refresh,
    projects: projectOptions,
    selectedProjectId,
    setSelectedProjectId,
    selectedProject,
    assets,
    deployments,
    projectDeployments,
    todayDeployments,
    logs,
    projectLogs,
    todayLogs,
    latestReadings,
    kpis,
    registerAsset,
    toggleAssetStatus,
    deployAsset,
    endDeployment,
    recordExecution,
    uploadPhotos,
  };
}