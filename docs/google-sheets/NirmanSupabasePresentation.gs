/**
 * NIRMAN AI Supabase Presentation Data Export
 *
 * Paste this file into Google Apps Script for a presentation spreadsheet.
 * It is read-only: all Supabase calls use GET against the REST API or an
 * optional read-only Edge Function.
 *
 * Required script properties:
 * SUPABASE_URL, SUPABASE_ANON_KEY, WORKSPACE_ID, PROJECT_ID, PROJECT_TABLE
 *
 * Optional script property:
 * SUPABASE_EDGE_FUNCTION_URL
 */

var NIRMAN_CONFIG = {
  DEFAULT_SUPABASE_URL: 'https://aaxbulmndnblclmcuqgj.supabase.co/rest/v1',
  PROJECT_REF: 'aaxbulmndnblclmcuqgj',
  PAGE_SIZE: 500,
  MAX_ROWS_PER_DATASET: 5000,
  MAX_CELL_CHARS: 45000,
  MAX_RETRIES: 3,
  RETRY_BASE_MS: 700,
  TRANSIENT_STATUS: { 429: true, 500: true, 502: true, 503: true, 504: true },
  SHEETS: {
    dashboard: 'Dashboard',
    projects: 'Projects',
    study: 'AI Project Study',
    reports: 'AI Reports',
    documents: 'Documents',
    boq: 'BOQ',
    assignments: 'Assignments',
    inspections: 'Inspections',
    raw: 'Raw AI JSON',
    log: 'Sync Log'
  },
  LOG_COLUMNS: ['Dataset', 'Status', 'Rows', 'Last Sync', 'Error Code', 'Message']
};

var DATASETS = [
  {
    key: 'regular_projects',
    label: 'Regular Projects',
    sheet: 'Projects',
    table: 'projects',
    columns: ['id', 'workspace_id', 'project_name', 'project_code', 'district', 'department', 'project_value', 'start_date', 'completion_date', 'created_at', 'name', 'description', 'owner_id', 'company', 'status', 'end_date', 'budget', 'progress_percent', 'location'],
    projectTable: 'projects',
    normalized: true
  },
  {
    key: 'gov_projects',
    label: 'GovTrack Projects',
    sheet: 'Projects',
    table: 'gov_projects',
    columns: ['id', 'project_name', 'project_code', 'department', 'contractor_name', 'total_contract_value', 'start_date', 'end_date', 'location', 'district', 'state', 'project_type', 'status', 'created_at'],
    projectTable: 'gov_projects',
    normalized: true
  },
  {
    key: 'ai_project_study',
    label: 'AI Project Study',
    sheet: 'AI Project Study',
    table: 'ai_project_study',
    columns: ['id', 'workspace_id', 'project_id', 'agreement_document_id', 'confidence_score', 'technical_specifications', 'important_clauses', 'payment_terms', 'completion_schedule', 'milestones', 'extracted_boq', 'bg_terms', 'sd_terms', 'dlp_terms', 'reviewed_by', 'created_at', 'updated_at'],
    rawJson: ['technical_specifications', 'important_clauses', 'payment_terms', 'completion_schedule', 'milestones', 'extracted_boq', 'bg_terms', 'sd_terms', 'dlp_terms']
  },
  {
    key: 'ai_reports',
    label: 'AI Reports',
    sheet: 'AI Reports',
    table: 'ai_reports',
    columns: ['id', 'workspace_id', 'project_id', 'report_type', 'severity', 'confidence_score', 'ai_summary', 'created_at'],
    rawJson: ['ai_summary']
  },
  {
    key: 'material_ai_reports',
    label: 'Material AI Reports',
    sheet: 'AI Reports',
    table: 'material_ai_reports',
    columns: ['id', 'project_id', 'material_id', 'severity', 'confidence', 'report', 'structured_output', 'created_by', 'created_at', 'updated_at'],
    rawJson: ['report', 'structured_output']
  },
  {
    key: 'agreement_documents',
    label: 'Agreement Documents',
    sheet: 'Documents',
    table: 'agreement_documents',
    columns: ['id', 'workspace_id', 'project_id', 'file_name', 'original_filename', 'document_type', 'module_name', 'role', 'document_status', 'ai_processing_status', 'ai_error_message', 'storage_provider', 'file_url', 'supabase_path', 'google_drive_file_id', 'google_drive_sync_status', 'drive_folder_path', 'mime_type', 'uploaded_by', 'created_at', 'updated_at']
  },
  {
    key: 'document_metadata',
    label: 'Document Metadata',
    sheet: 'Documents',
    table: 'document_metadata',
    columns: ['id', 'workspace_id', 'project_id', 'project_table', 'file_name', 'original_filename', 'document_type', 'module_name', 'role', 'ai_processed', 'ai_processing_status', 'metadata', 'mime_type', 'size_bytes', 'storage_provider', 'file_url', 'supabase_path', 'google_drive_file_id', 'google_drive_sync_status', 'drive_folder_path', 'uploaded_by', 'created_at'],
    rawJson: ['metadata']
  },
  {
    key: 'project_boq',
    label: 'Project BOQ',
    sheet: 'BOQ',
    table: 'project_boq',
    columns: ['id', 'project_id', 'total_estimated_value', 'extraction_confidence', 'source_file_url', 'extracted_at', 'created_at', 'updated_at']
  },
  {
    key: 'boq_items',
    label: 'BOQ Items',
    sheet: 'BOQ',
    table: 'boq_items',
    columns: ['id', 'workspace_id', 'project_id', 'boq_id', 'agreement_document_id', 'item_number', 'item_code', 'description', 'category', 'work_type', 'component_type', 'unit', 'quantity', 'rate', 'amount', 'completed_quantity', 'completion_percentage', 'technical_specification', 'notes', 'created_at']
  },
  {
    key: 'project_assignments',
    label: 'Project Assignments',
    sheet: 'Assignments',
    table: 'project_assignments',
    columns: ['id', 'workspace_id', 'project_id', 'project_table', 'executive_engineer_id', 'assistant_engineer_id', 'junior_engineer_id', 'contractor_id', 'contractor_company_name', 'user_id', 'assigned_role', 'access_status', 'created_at']
  },
  {
    key: 'inspection_reports',
    label: 'Inspection Reports',
    sheet: 'Inspections',
    table: 'inspection_reports',
    columns: ['id', 'project_id', 'milestone_id', 'report_code', 'inspection_type', 'inspection_date', 'inspected_by', 'overall_quality_score', 'recommendation', 'ai_report', 'quality_issues', 'structural_issues', 'compliance_issues', 'photos', 'pdf_report_url', 'created_at'],
    rawJson: ['ai_report', 'quality_issues', 'structural_issues', 'compliance_issues', 'photos']
  },
  {
    key: 'material_tests',
    label: 'Material Tests',
    sheet: 'Inspections',
    table: 'material_tests',
    columns: ['id', 'project_id', 'milestone_id', 'test_type', 'test_date', 'material_type', 'sample_location', 'site_id', 'result', 'required_value', 'achieved_value', 'unit', 'ai_authenticity_score', 'ai_report_verified', 'ai_verification_notes', 'blocks_payment', 'reviewed_by', 'submitted_by', 'lab_name', 'lab_certificate_number', 'drive_link', 'test_report_url', 'created_at']
  }
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('NIRMAN AI')
    .addItem('Refresh All Data', 'refreshNirmanAllData')
    .addItem('Refresh AI Data', 'refreshNirmanAiData')
    .addItem('Build Dashboard', 'buildNirmanDashboard')
    .addSeparator()
    .addItem('Configure Connection', 'configureNirmanConnection')
    .addItem('Install Hourly Refresh', 'installNirmanHourlyRefresh')
    .addItem('Remove Refresh Triggers', 'removeNirmanRefreshTriggers')
    .addToUi();
}

function configureNirmanConnection() {
  var props = PropertiesService.getScriptProperties();
  var defaults = {
    SUPABASE_URL: NIRMAN_CONFIG.DEFAULT_SUPABASE_URL,
    SUPABASE_ANON_KEY: 'paste anon key in script properties',
    WORKSPACE_ID: 'paste workspace id',
    PROJECT_ID: 'paste project id',
    PROJECT_TABLE: 'projects'
  };
  Object.keys(defaults).forEach(function (key) {
    if (!props.getProperty(key)) props.setProperty(key, defaults[key]);
  });
  SpreadsheetApp.getUi().alert('Connection properties were created. Open Project Settings > Script properties and replace the placeholder values.');
}

function refreshNirmanAllData() {
  return refreshNirmanData(DATASETS);
}

function refreshNirmanAiData() {
  return refreshNirmanData(filterDatasets(['ai_project_study', 'ai_reports', 'material_ai_reports']));
}

function refreshNirmanData(datasets) {
  ensureSheets();
  clearSyncLog();
  writeRawAiJson([]);
  var ctx = getConfigContext();
  var results = tryRefreshViaEdgeFunction(ctx, datasets);
  if (!results) results = fetchDatasetsFromRest(ctx, datasets);
  var summary = createEmptySummary();
  Object.keys(results).forEach(function (key) {
    var result = results[key];
    if (result.ok) {
      writeDatasetRows(result.dataset, result.rows, summary);
    } else {
      appendSyncLog(result.dataset.label, 'Error', 0, result.errorCode, result.message);
    }
  });
  buildNirmanDashboard(summary);
  SpreadsheetApp.getActive().toast('NIRMAN refresh complete. Check Sync Log for partial failures.', 'NIRMAN AI', 6);
}

function fetchDatasetsFromRest(ctx, datasets) {
  var results = {};
  datasets.forEach(function (dataset) {
    try {
      var rows = fetchDatasetRows(ctx, dataset);
      results[dataset.key] = { ok: true, dataset: dataset, rows: rows };
    } catch (err) {
      results[dataset.key] = { ok: false, dataset: dataset, rows: [], errorCode: err.code || 'FETCH_ERROR', message: sanitizeErrorMessage(err.message) };
    }
  });
  return results;
}

function tryRefreshViaEdgeFunction(ctx, datasets) {
  if (!ctx.edgeFunctionUrl) return null;
  try {
    var payload = {
      workspaceId: ctx.workspaceId,
      projectId: ctx.projectId,
      projectTable: ctx.projectTable,
      datasets: datasets.map(function (dataset) { return dataset.key; })
    };
    var response = fetchWithRetry(ctx.edgeFunctionUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
      headers: { Authorization: 'Bearer ' + ctx.anonKey }
    });
    var data = JSON.parse(response.getContentText() || '{}');
    if (!data.datasets) return null;
    var byKey = {};
    datasets.forEach(function (dataset) {
      var rows = data.datasets[dataset.key] || [];
      byKey[dataset.key] = { ok: true, dataset: dataset, rows: rows };
    });
    return byKey;
  } catch (err) {
    appendSyncLog('Edge Function', 'Warning', 0, err.code || 'EDGE_FALLBACK', sanitizeErrorMessage(err.message));
    return null;
  }
}

function fetchDatasetRows(ctx, dataset) {
  var filters = buildFilters(ctx, dataset);
  var allRows = [];
  var offset = 0;
  while (allRows.length < NIRMAN_CONFIG.MAX_ROWS_PER_DATASET) {
    var url = buildSupabaseUrl(ctx.supabaseUrl, dataset.table, dataset.columns, filters, offset);
    var response = fetchWithRetry(url, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        apikey: ctx.anonKey,
        Authorization: 'Bearer ' + ctx.anonKey,
        Accept: 'application/json',
        Prefer: 'count=none'
      }
    });
    var batch = JSON.parse(response.getContentText() || '[]');
    if (!Array.isArray(batch)) throw makeError('INVALID_JSON', 'Supabase returned a non-array response for ' + dataset.table);
    allRows = allRows.concat(batch);
    if (batch.length < NIRMAN_CONFIG.PAGE_SIZE) break;
    offset += NIRMAN_CONFIG.PAGE_SIZE;
  }
  return allRows.slice(0, NIRMAN_CONFIG.MAX_ROWS_PER_DATASET);
}

function buildFilters(ctx, dataset) {
  var filters = [];
  if (dataset.table === 'gov_projects') {
    if (ctx.projectTable === 'gov_projects' && ctx.projectId) filters.push(['id', 'eq', ctx.projectId]);
    return filters;
  }
  if (dataset.table === 'projects') {
    if (ctx.workspaceId) filters.push(['workspace_id', 'eq', ctx.workspaceId]);
    if (ctx.projectTable === 'projects' && ctx.projectId) filters.push(['id', 'eq', ctx.projectId]);
    return filters;
  }
  if (dataset.table === 'project_assignments') {
    if (ctx.workspaceId) filters.push(['workspace_id', 'eq', ctx.workspaceId]);
    if (ctx.projectId) filters.push(['project_id', 'eq', ctx.projectId]);
    if (ctx.projectTable) filters.push(['project_table', 'eq', ctx.projectTable]);
    return filters;
  }
  if (hasColumn(dataset, 'workspace_id') && ctx.workspaceId) filters.push(['workspace_id', 'eq', ctx.workspaceId]);
  if (hasColumn(dataset, 'project_id') && ctx.projectId) filters.push(['project_id', 'eq', ctx.projectId]);
  if (hasColumn(dataset, 'project_table') && ctx.projectTable) filters.push(['project_table', 'eq', ctx.projectTable]);
  return filters;
}

function buildSupabaseUrl(baseUrl, table, columns, filters, offset) {
  var params = ['select=' + encodeURIComponent(columns.join(',')), 'limit=' + NIRMAN_CONFIG.PAGE_SIZE, 'offset=' + offset];
  filters.forEach(function (filter) {
    params.push(encodeURIComponent(filter[0]) + '=' + encodeURIComponent(filter[1] + '.' + filter[2]));
  });
  return trimSlash(baseUrl) + '/' + encodeURIComponent(table) + '?' + params.join('&');
}

function fetchWithRetry(url, options) {
  var lastError = null;
  for (var attempt = 0; attempt < NIRMAN_CONFIG.MAX_RETRIES; attempt++) {
    try {
      var response = UrlFetchApp.fetch(url, options);
      var status = response.getResponseCode();
      if (status >= 200 && status < 300) return response;
      var err = makeHttpError(status, response.getContentText());
      if (!NIRMAN_CONFIG.TRANSIENT_STATUS[status]) throw err;
      lastError = err;
    } catch (err2) {
      lastError = err2;
      if (!isTransientError(err2)) throw err2;
    }
    Utilities.sleep(NIRMAN_CONFIG.RETRY_BASE_MS * Math.pow(2, attempt));
  }
  throw lastError || makeError('FETCH_ERROR', 'Request failed after retries.');
}

function writeDatasetRows(dataset, rows, summary) {
  var writtenRows = rows;
  if (dataset.normalized) writtenRows = normalizeProjectRows(dataset, rows);
  if (dataset.sheet === 'Projects') {
    appendRowsToDatasetSheet(dataset.sheet, writtenRows, dataset.key === 'regular_projects');
  } else {
    appendRowsToDatasetSheet(dataset.sheet, writtenRows, true);
  }
  collectSummary(dataset, writtenRows, summary);
  collectRawJson(dataset, rows);
  appendSyncLog(dataset.label, 'OK', rows.length, '', '');
}

function appendRowsToDatasetSheet(sheetName, rows, clearFirst) {
  var sheet = getOrCreateSheet(sheetName);
  if (clearFirst) sheet.clear();
  if (!rows.length && sheet.getLastRow() === 0) {
    sheet.getRange(1, 1).setValue('No rows returned');
    return;
  }
  if (!rows.length) return;
  var columns = orderedColumns(rows);
  var startRow = sheet.getLastRow() + 1;
  if (startRow === 1) {
    sheet.getRange(1, 1, 1, columns.length).setValues([columns.map(toFriendlyHeader)]);
    startRow = 2;
  }
  var values = rows.map(function (row) {
    return columns.map(function (column) { return formatCellValue(row[column]); });
  });
  sheet.getRange(startRow, 1, values.length, columns.length).setValues(values);
  applySheetFormatting(sheet, columns.length);
}

function buildNirmanDashboard(summary) {
  ensureSheets();
  if (!summary) summary = createSummaryFromSheets();
  var ctx = getConfigContext(false);
  var sheet = getOrCreateSheet(NIRMAN_CONFIG.SHEETS.dashboard);
  sheet.clear();
  var project = summary.primaryProject || {};
  var rows = [
    ['NIRMAN AI Presentation Dashboard', ''],
    ['Last Sync', new Date()],
    ['Workspace ID', ctx.workspaceId || 'Not configured'],
    ['Project ID', ctx.projectId || 'Not configured'],
    ['Project Table', ctx.projectTable || 'Not configured'],
    ['Project Name', project.project_name || project.name || 'Not available'],
    ['Project Code', project.project_code || 'Not available'],
    ['Department', project.department || 'Not available'],
    ['Contractor', project.contractor_name || summary.contractorFromAssignments || 'Not available'],
    ['Contract Value', project.total_contract_value || project.project_value || project.budget || 'Not available'],
    ['Status', project.status || 'Not available'],
    ['AI Study Rows', summary.counts.ai_project_study || 0],
    ['AI Report Rows', (summary.counts.ai_reports || 0) + (summary.counts.material_ai_reports || 0)],
    ['Document Rows', (summary.counts.agreement_documents || 0) + (summary.counts.document_metadata || 0)],
    ['BOQ Rows', (summary.counts.project_boq || 0) + (summary.counts.boq_items || 0)],
    ['Assignment Rows', summary.counts.project_assignments || 0],
    ['Inspection Rows', (summary.counts.inspection_reports || 0) + (summary.counts.material_tests || 0)]
  ];
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1, 1, 2).merge().setFontWeight('bold').setFontSize(16);
  sheet.getRange(2, 1, rows.length - 1, 1).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, 2);
}

function collectSummary(dataset, rows, summary) {
  summary.counts[dataset.key] = rows.length;
  if (!summary.primaryProject && dataset.sheet === 'Projects' && rows.length) summary.primaryProject = rows[0];
  if (dataset.key === 'project_assignments') {
    rows.forEach(function (row) {
      if (!summary.contractorFromAssignments && row.contractor_company_name) summary.contractorFromAssignments = row.contractor_company_name;
      if (!summary.contractorFromAssignments && row.contractor_id) summary.contractorFromAssignments = row.contractor_id;
    });
  }
}

function collectRawJson(dataset, rows) {
  if (!dataset.rawJson || !dataset.rawJson.length) return;
  var rawRows = [];
  rows.forEach(function (row) {
    dataset.rawJson.forEach(function (column) {
      if (row[column] !== null && row[column] !== undefined && row[column] !== '') {
        rawRows.push({ dataset: dataset.label, column_name: column, record_id: row.id || '', json_value: row[column], captured_at: new Date() });
      }
    });
  });
  if (rawRows.length) appendRowsToDatasetSheet(NIRMAN_CONFIG.SHEETS.raw, rawRows, false);
}

function writeRawAiJson(rows) {
  var sheet = getOrCreateSheet(NIRMAN_CONFIG.SHEETS.raw);
  sheet.clear();
  if (rows && rows.length) appendRowsToDatasetSheet(NIRMAN_CONFIG.SHEETS.raw, rows, true);
}

function normalizeProjectRows(dataset, rows) {
  return rows.map(function (row) {
    if (dataset.table === 'gov_projects') {
      return {
        source_table: 'gov_projects',
        id: row.id,
        workspace_id: '',
        project_name: row.project_name,
        project_code: row.project_code,
        district: row.district,
        department: row.department,
        contractor_name: row.contractor_name,
        project_value: row.total_contract_value,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        location: row.location,
        created_at: row.created_at
      };
    }
    return {
      source_table: 'projects',
      id: row.id,
      workspace_id: row.workspace_id,
      project_name: row.project_name || row.name,
      project_code: row.project_code,
      district: row.district,
      department: row.department,
      contractor_name: '',
      project_value: firstValue([row.project_value, row.budget]),
      start_date: row.start_date,
      end_date: firstValue([row.end_date, row.completion_date]),
      status: row.status,
      location: row.location,
      created_at: row.created_at
    };
  });
}

function createEmptySummary() {
  return { counts: {}, primaryProject: null, contractorFromAssignments: '' };
}

function createSummaryFromSheets() {
  var summary = createEmptySummary();
  DATASETS.forEach(function (dataset) {
    var sheet = SpreadsheetApp.getActive().getSheetByName(dataset.sheet);
    summary.counts[dataset.key] = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;
  });
  return summary;
}

function appendSyncLog(dataset, status, rowCount, errorCode, message) {
  var sheet = getOrCreateSheet(NIRMAN_CONFIG.SHEETS.log);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, NIRMAN_CONFIG.LOG_COLUMNS.length).setValues([NIRMAN_CONFIG.LOG_COLUMNS]);
  sheet.appendRow([dataset, status, rowCount, new Date(), errorCode || '', sanitizeErrorMessage(message || '')]);
  applySheetFormatting(sheet, NIRMAN_CONFIG.LOG_COLUMNS.length);
}

function clearSyncLog() {
  var sheet = getOrCreateSheet(NIRMAN_CONFIG.SHEETS.log);
  sheet.clear();
  sheet.getRange(1, 1, 1, NIRMAN_CONFIG.LOG_COLUMNS.length).setValues([NIRMAN_CONFIG.LOG_COLUMNS]);
  applySheetFormatting(sheet, NIRMAN_CONFIG.LOG_COLUMNS.length);
}

function installNirmanHourlyRefresh() {
  removeNirmanRefreshTriggers();
  ScriptApp.newTrigger('refreshNirmanAllData').timeBased().everyHours(1).create();
  SpreadsheetApp.getActive().toast('Hourly NIRMAN refresh installed.', 'NIRMAN AI', 5);
}

function removeNirmanRefreshTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'refreshNirmanAllData') ScriptApp.deleteTrigger(trigger);
  });
  SpreadsheetApp.getActive().toast('NIRMAN refresh triggers removed.', 'NIRMAN AI', 5);
}

function ensureSheets() {
  Object.keys(NIRMAN_CONFIG.SHEETS).forEach(function (key) {
    getOrCreateSheet(NIRMAN_CONFIG.SHEETS[key]);
  });
}

function getOrCreateSheet(name) {
  var ss = SpreadsheetApp.getActive();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function getConfigContext(requireSecrets) {
  if (requireSecrets === undefined) requireSecrets = true;
  var props = PropertiesService.getScriptProperties();
  var ctx = {
    supabaseUrl: props.getProperty('SUPABASE_URL') || NIRMAN_CONFIG.DEFAULT_SUPABASE_URL,
    anonKey: props.getProperty('SUPABASE_ANON_KEY') || '',
    workspaceId: props.getProperty('WORKSPACE_ID') || '',
    projectId: props.getProperty('PROJECT_ID') || '',
    projectTable: props.getProperty('PROJECT_TABLE') || 'projects',
    edgeFunctionUrl: props.getProperty('SUPABASE_EDGE_FUNCTION_URL') || ''
  };
  if (requireSecrets && (!ctx.supabaseUrl || !ctx.anonKey || !ctx.projectId)) {
    throw makeError('CONFIG_MISSING', 'Configure SUPABASE_URL, SUPABASE_ANON_KEY, PROJECT_ID, WORKSPACE_ID, and PROJECT_TABLE in script properties.');
  }
  return ctx;
}

function filterDatasets(keys) {
  return DATASETS.filter(function (dataset) { return keys.indexOf(dataset.key) !== -1; });
}

function hasColumn(dataset, column) {
  return dataset.columns.indexOf(column) !== -1;
}

function orderedColumns(rows) {
  var seen = {};
  var columns = [];
  rows.forEach(function (row) {
    Object.keys(row).forEach(function (key) {
      if (!seen[key]) {
        seen[key] = true;
        columns.push(key);
      }
    });
  });
  return columns;
}

function applySheetFormatting(sheet, columnCount) {
  if (sheet.getLastRow() < 1 || columnCount < 1) return;
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, columnCount).setFontWeight('bold');
  sheet.getDataRange().setWrap(true);
  if (!sheet.getFilter()) sheet.getDataRange().createFilter();
  for (var col = 1; col <= columnCount; col++) {
    sheet.autoResizeColumn(col);
    if (sheet.getColumnWidth(col) > 360) sheet.setColumnWidth(col, 360);
  }
}

function formatCellValue(value) {
  if (value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') return value;
  if (typeof value === 'object') return limitCell(JSON.stringify(value));
  return limitCell(String(value));
}

function toFriendlyHeader(value) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
}

function firstValue(values) {
  for (var i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined && values[i] !== '') return values[i];
  }
  return '';
}

function limitCell(value) {
  if (value.length <= NIRMAN_CONFIG.MAX_CELL_CHARS) return value;
  return value.slice(0, NIRMAN_CONFIG.MAX_CELL_CHARS - 20) + '... [truncated]';
}

function makeHttpError(status, body) {
  var code = classifyStatus(status);
  var message = 'Supabase HTTP ' + status;
  var parsed = parseJsonSafe(body);
  if (parsed && parsed.message) message += ': ' + parsed.message;
  var err = makeError(code, message);
  err.status = status;
  return err;
}

function makeError(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}

function classifyStatus(status) {
  if (status === 401 || status === 403) return 'PERMISSION_DENIED';
  if (status === 404) return 'TABLE_NOT_FOUND';
  if (status === 400 || status === 406 || status === 409 || status === 422) return 'SCHEMA_OR_FILTER_ERROR';
  if (NIRMAN_CONFIG.TRANSIENT_STATUS[status]) return 'TRANSIENT_HTTP_' + status;
  return 'HTTP_' + status;
}

function isTransientError(err) {
  return err && err.status && NIRMAN_CONFIG.TRANSIENT_STATUS[err.status];
}

function sanitizeErrorMessage(message) {
  return String(message || '')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [redacted]')
    .replace(/apikey=([A-Za-z0-9._-]+)/g, 'apikey=[redacted]')
    .replace(/SUPABASE_ANON_KEY=[^&\s]+/g, 'SUPABASE_ANON_KEY=[redacted]');
}

function parseJsonSafe(value) {
  try {
    return JSON.parse(value || '');
  } catch (err) {
    return null;
  }
}

function trimSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}
