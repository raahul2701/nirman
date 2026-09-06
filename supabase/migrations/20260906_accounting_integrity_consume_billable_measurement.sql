CREATE OR REPLACE FUNCTION public.consume_billable_measurement(p_measurement_id uuid, p_ra_bill_number text)
 RETURNS ra_bill_items
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare 
  v_measurement public.measurement_book_entries%rowtype;
  v_boq public.boq_items%rowtype;
  v_contractor uuid;
  v_item public.ra_bill_items%rowtype;
begin
  -- 1. Lock measurement row (exact production pattern)
  SELECT *
  INTO v_measurement
  FROM public.measurement_book_entries
  WHERE id = p_measurement_id
  FOR UPDATE;
  
  -- 2. Preserve ALL existing authorization checks unchanged
  if not found or not public.measurement_assignment_allows(v_measurement.workspace_id, v_measurement.project_id, 'executive_engineer')
    or v_measurement.status <> 'billable' or not v_measurement.billable or v_measurement.billable_by is null or v_measurement.je_verified_by is null or v_measurement.ae_reviewed_by is null
    or v_measurement.calculated_quantity is null then raise exception 'Billable measurement consumption is not authorised'; 
  end if;
  
  -- 3. Lock the exact BOQ row separately
  SELECT *
  INTO v_boq
  FROM public.boq_items
  WHERE id = v_measurement.boq_item_id
    AND workspace_id = v_measurement.workspace_id
    AND project_id = v_measurement.project_id
  FOR UPDATE;
  
  -- 4. Raise appropriate error if BOQ not found
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Measurement BOQ/project relationship is invalid';
  END IF;
  
  -- 5. Validate quantity constraint (no over-consumption)
  if (v_boq.completed_quantity + v_measurement.calculated_quantity) > v_boq.quantity then
    raise exception 'Consumption would exceed BOQ quantity';
  end if;
  
  -- 7. Obtain contractor_id separately using existing production project_assignments relationship
  SELECT pa.contractor_id
  INTO v_contractor
  FROM public.project_assignments pa
  WHERE pa.workspace_id = v_boq.workspace_id
    AND pa.project_id = v_boq.project_id
    AND pa.access_status IN ('active', 'pilot')
  LIMIT 1;
  
  -- 8. Validate contractor and rate
  IF v_contractor IS NULL OR v_boq.rate IS NULL THEN
    RAISE EXCEPTION 'Measurement BOQ/project relationship is invalid';
  END IF;
  
  -- 9. Insert exactly one ra_bill_items row using existing columns
  -- 9. Use v_boq.rate directly
  insert into public.ra_bill_items (workspace_id, project_id, contractor_id, boq_item_id, measurement_book_entry_id, ra_bill_number, item_quantity, rate, status)
    values (v_measurement.workspace_id, v_measurement.project_id, v_contractor, v_measurement.boq_item_id, v_measurement.id, p_ra_bill_number, v_measurement.calculated_quantity, v_boq.rate, 'draft') 
    returning * into v_item;
  
  -- 10. Update ONLY completed_quantity and completion_percentage
  -- 11. Calculate new_completed_quantity and completion_percentage
  update public.boq_items 
  set 
    completed_quantity = v_boq.completed_quantity + v_measurement.calculated_quantity,
    completion_percentage = ROUND((v_boq.completed_quantity + v_measurement.calculated_quantity) / v_boq.quantity * 100, 2)
  where id = v_boq.id;
  
  -- 12. Preserve existing audit log behavior
  perform public.write_measurement_audit('quantity_consumed', v_measurement, 'billable', p_ra_bill_number);
  
  return v_item;
end;
$function$;
