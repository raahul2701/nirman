import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Upload, Users, Wrench, FileText, Camera } from 'lucide-react';

const dailyReportSchema = z.object({
  project_id: z.string().min(1, 'Project is required'),
  site_id: z.string().min(1, 'Site is required'),
  report_date: z.string().min(1, 'Report date is required'),

  // Manpower
  total_workers: z.number().min(0, 'Total workers must be >= 0'),
  skilled_workers: z.number().min(0, 'Skilled workers must be >= 0'),
  unskilled_workers: z.number().min(0, 'Unskilled workers must be >= 0'),

  // Work Done
  work_description: z.string().min(10, 'Work description must be at least 10 characters'),
  work_quantity: z.string().min(1, 'Work quantity is required'),
  work_unit: z.string().min(1, 'Work unit is required'),

  // Materials Used
  materials_used: z.array(z.object({
    material_name: z.string().min(1, 'Material name required'),
    quantity: z.number().min(0.01, 'Quantity must be > 0'),
    unit: z.string().min(1, 'Unit required')
  })).optional(),

  // Equipment Used
  equipment_used: z.array(z.object({
    equipment_name: z.string().min(1, 'Equipment name required'),
    hours_used: z.number().min(0.1, 'Hours must be > 0')
  })).optional(),

  // Issues Faced
  issues_faced: z.string().optional(),
  weather_conditions: z.string().min(1, 'Weather conditions required'),

  // Photos
  photos: z.array(z.string()).optional(),

  // Checklist Items (9-step form)
  checklist: z.object({
    site_clean: z.boolean(),
    safety_measures: z.boolean(),
    quality_checks: z.boolean(),
    material_stacked: z.boolean(),
    equipment_maintained: z.boolean(),
    workers_protected: z.boolean(),
    documentation_complete: z.boolean(),
    measurements_recorded: z.boolean(),
    supervisor_present: z.boolean()
  })
});

type DailyReportFormData = z.infer<typeof dailyReportSchema>;

interface DailyReportFormProps {
  projectId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const DailyReportForm: React.FC<DailyReportFormProps> = ({
  projectId,
  onSuccess,
  onCancel
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [materials, setMaterials] = useState([{ material_name: '', quantity: 0, unit: '' }]);
  const [equipment, setEquipment] = useState([{ equipment_name: '', hours_used: 0 }]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<DailyReportFormData>({
    resolver: zodResolver(dailyReportSchema),
    defaultValues: {
      project_id: projectId || '',
      report_date: new Date().toISOString().split('T')[0],
      total_workers: 0,
      skilled_workers: 0,
      unskilled_workers: 0,
      materials_used: [],
      equipment_used: [],
      checklist: {
        site_clean: false,
        safety_measures: false,
        quality_checks: false,
        material_stacked: false,
        equipment_maintained: false,
        workers_protected: false,
        documentation_complete: false,
        measurements_recorded: false,
        supervisor_present: false
      }
    }
  });

  const watchedTotalWorkers = watch('total_workers');
  const watchedSkilledWorkers = watch('skilled_workers');
  const watchedUnskilledWorkers = watch('unskilled_workers');

  // Auto-calculate unskilled workers
  React.useEffect(() => {
    const total = watchedTotalWorkers || 0;
    const skilled = watchedSkilledWorkers || 0;
    const unskilled = total - skilled;
    if (unskilled >= 0) {
      setValue('unskilled_workers', unskilled);
    }
  }, [watchedTotalWorkers, watchedSkilledWorkers, setValue]);

  const handlePhotoUpload = async (files: FileList) => {
    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `daily-reports/${fileName}`;

        const { data, error } = await supabase.storage
          .from('uploads')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      } catch (error) {
        console.error('Photo upload error:', error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setPhotos(prev => [...prev, ...files]);
    setValue('photos', [...(watch('photos') || []), ...uploadedUrls]);
  };

  const addMaterial = () => {
    setMaterials([...materials, { material_name: '', quantity: 0, unit: '' }]);
  };

  const removeMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const addEquipment = () => {
    setEquipment([...equipment, { equipment_name: '', hours_used: 0 }]);
  };

  const removeEquipment = (index: number) => {
    setEquipment(equipment.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: DailyReportFormData) => {
    setIsSubmitting(true);

    try {
      // Prepare materials and equipment data
      const materialsData = materials.filter(m => m.material_name && m.quantity > 0);
      const equipmentData = equipment.filter(e => e.equipment_name && e.hours_used > 0);

      const reportData = {
        ...data,
        materials_used: materialsData,
        equipment_used: equipmentData,
        report_code: `DR-${Date.now()}`, // Generate report code
        submitted_by: (await supabase.auth.getUser()).data.user?.id
      };

      const { error } = await supabase
        .from('daily_reports')
        .insert([reportData]);

      if (error) throw error;

      toast.success('Daily report submitted successfully!');
      onSuccess?.();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to submit daily report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const checklistItems = [
    { key: 'site_clean', label: 'Site is clean and organized' },
    { key: 'safety_measures', label: 'Safety measures implemented' },
    { key: 'quality_checks', label: 'Quality checks performed' },
    { key: 'material_stacked', label: 'Materials properly stacked' },
    { key: 'equipment_maintained', label: 'Equipment well maintained' },
    { key: 'workers_protected', label: 'Workers using protective gear' },
    { key: 'documentation_complete', label: 'Documentation complete' },
    { key: 'measurements_recorded', label: 'Measurements recorded' },
    { key: 'supervisor_present', label: 'Supervisor present on site' }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Daily Site Report
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Submit comprehensive daily progress report
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Project</label>
              <select
                {...register('project_id')}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Select Project</option>
                {/* Add project options */}
              </select>
              {errors.project_id && (
                <p className="text-red-500 text-sm mt-1">{errors.project_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Site</label>
              <select
                {...register('site_id')}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Select Site</option>
                {/* Add site options */}
              </select>
              {errors.site_id && (
                <p className="text-red-500 text-sm mt-1">{errors.site_id.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Report Date</label>
              <Input
                type="date"
                {...register('report_date')}
                error={errors.report_date?.message}
              />
            </div>
          </div>
        </Card>

        {/* Manpower */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Manpower
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Total Workers</label>
              <Input
                type="number"
                {...register('total_workers', { valueAsNumber: true })}
                error={errors.total_workers?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Skilled Workers</label>
              <Input
                type="number"
                {...register('skilled_workers', { valueAsNumber: true })}
                error={errors.skilled_workers?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Unskilled Workers</label>
              <Input
                type="number"
                value={watchedUnskilledWorkers}
                readOnly
                className="bg-gray-100 dark:bg-gray-700"
              />
            </div>
          </div>
        </Card>

        {/* Work Done */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Wrench className="w-5 h-5 mr-2" />
            Work Done
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Work Description</label>
              <textarea
                {...register('work_description')}
                rows={3}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Describe the work completed today..."
              />
              {errors.work_description && (
                <p className="text-red-500 text-sm mt-1">{errors.work_description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  {...register('work_quantity')}
                  placeholder="e.g., 50"
                  error={errors.work_quantity?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  {...register('work_unit')}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">Select Unit</option>
                  <option value="sqm">Square Meters</option>
                  <option value="cum">Cubic Meters</option>
                  <option value="kg">Kilograms</option>
                  <option value="nos">Numbers</option>
                  <option value="rmt">Running Meters</option>
                </select>
                {errors.work_unit && (
                  <p className="text-red-500 text-sm mt-1">{errors.work_unit.message}</p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Materials Used */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Materials Used</h3>

          {materials.map((material, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 p-4 border rounded-lg">
              <Input
                placeholder="Material Name"
                value={material.material_name}
                onChange={(e) => {
                  const newMaterials = [...materials];
                  newMaterials[index].material_name = e.target.value;
                  setMaterials(newMaterials);
                }}
              />

              <Input
                type="number"
                step="0.01"
                placeholder="Quantity"
                value={material.quantity}
                onChange={(e) => {
                  const newMaterials = [...materials];
                  newMaterials[index].quantity = parseFloat(e.target.value) || 0;
                  setMaterials(newMaterials);
                }}
              />

              <select
                value={material.unit}
                onChange={(e) => {
                  const newMaterials = [...materials];
                  newMaterials[index].unit = e.target.value;
                  setMaterials(newMaterials);
                }}
                className="p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Unit</option>
                <option value="kg">kg</option>
                <option value="bags">bags</option>
                <option value="cum">cum</option>
                <option value="sqm">sqm</option>
                <option value="nos">nos</option>
              </select>

              {materials.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeMaterial(index)}
                  className="text-red-500"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addMaterial}>
            Add Material
          </Button>
        </Card>

        {/* Equipment Used */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Equipment Used</h3>

          {equipment.map((equip, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border rounded-lg">
              <Input
                placeholder="Equipment Name"
                value={equip.equipment_name}
                onChange={(e) => {
                  const newEquipment = [...equipment];
                  newEquipment[index].equipment_name = e.target.value;
                  setEquipment(newEquipment);
                }}
              />

              <Input
                type="number"
                step="0.1"
                placeholder="Hours Used"
                value={equip.hours_used}
                onChange={(e) => {
                  const newEquipment = [...equipment];
                  newEquipment[index].hours_used = parseFloat(e.target.value) || 0;
                  setEquipment(newEquipment);
                }}
              />

              {equipment.length > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => removeEquipment(index)}
                  className="text-red-500"
                >
                  Remove
                </Button>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" onClick={addEquipment}>
            Add Equipment
          </Button>
        </Card>

        {/* Issues and Weather */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Additional Information</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Issues Faced (Optional)</label>
              <textarea
                {...register('issues_faced')}
                rows={2}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Any issues or challenges faced today..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Weather Conditions</label>
              <select
                {...register('weather_conditions')}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Select Weather</option>
                <option value="sunny">Sunny</option>
                <option value="cloudy">Cloudy</option>
                <option value="rainy">Rainy</option>
                <option value="stormy">Stormy</option>
                <option value="foggy">Foggy</option>
              </select>
              {errors.weather_conditions && (
                <p className="text-red-500 text-sm mt-1">{errors.weather_conditions.message}</p>
              )}
            </div>
          </div>
        </Card>

        {/* Photos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Camera className="w-5 h-5 mr-2" />
            Photos
          </h3>

          <div className="space-y-4">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => e.target.files && handlePhotoUpload(e.target.files)}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            {photos.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 9-Step Checklist */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Site Checklist (9 Steps)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {checklistItems.map((item) => (
              <label key={item.key} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  {...register(`checklist.${item.key}` as any)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm">{item.label}</span>
              </label>
            ))}
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </form>
    </div>
  );
};