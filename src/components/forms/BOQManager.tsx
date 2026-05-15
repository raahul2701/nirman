import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { FileText, Upload, Download, Calculator, CheckCircle, AlertCircle } from 'lucide-react';

const boqItemSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  description: z.string().min(1, 'Description is required'),
  unit: z.string().min(1, 'Unit is required'),
  quantity: z.number().min(0.01, 'Quantity must be > 0'),
  rate: z.number().min(0.01, 'Rate must be > 0'),
  amount: z.number().min(0, 'Amount must be >= 0'),
  category: z.string().min(1, 'Category is required'),
  work_type: z.string().min(1, 'Work type is required')
});

type BOQItemFormData = z.infer<typeof boqItemSchema>;

type BOQItem = BOQItemFormData & {
  id: string;
  boq_id: string;
  completed_quantity: number;
  completion_percentage: number;
};

interface BOQManagerProps {
  projectId: string;
  onSuccess?: () => void;
}

export const BOQManager: React.FC<BOQManagerProps> = ({ projectId, onSuccess }) => {
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<BOQItem | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<BOQItemFormData>({
    resolver: zodResolver(boqItemSchema)
  });

  // Auto-calculate amount when quantity or rate changes
  const watchedQuantity = watch('quantity');
  const watchedRate = watch('rate');

  useEffect(() => {
    const quantity = watchedQuantity || 0;
    const rate = watchedRate || 0;
    setValue('amount', quantity * rate);
  }, [watchedQuantity, watchedRate, setValue]);

  const loadBOQItems = React.useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('project_boq')
        .select(`
          *,
          boq_items (*)
        `)
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setBoqItems(data.boq_items || []);
      } else {
        setBoqItems([]);
      }
    } catch (error) {
      console.error('Load BOQ error:', error);
      toast.error('Failed to load BOQ items');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  // Load BOQ items
  useEffect(() => {
    loadBOQItems();
  }, [loadBOQItems]);

  const onSubmit = async (data: BOQItemFormData) => {
    setIsSubmitting(true);

    try {
      // First ensure project_boq exists
      const { data: currentBoq, error: boqError } = await supabase
        .from('project_boq')
        .select('id')
        .eq('project_id', projectId)
        .single();
      let boqData = currentBoq;

      if (boqError && boqError.code === 'PGRST116') {
        // Create project_boq if it doesn't exist
        const { data: newBoq, error: createError } = await supabase
          .from('project_boq')
          .insert([{ project_id: projectId }])
          .select('id')
          .single();

        if (createError) throw createError;
        boqData = newBoq;
      } else if (boqError) {
        throw boqError;
      }

      if (!boqData) throw new Error('Failed to get or create BOQ');

      const itemData = {
        ...data,
        boq_id: boqData.id,
        completed_quantity: 0,
        completion_percentage: 0
      };

      if (editingItem) {
        // Update existing item
        const { error } = await supabase
          .from('boq_items')
          .update(itemData)
          .eq('id', editingItem.id);

        if (error) throw error;
        toast.success('BOQ item updated successfully!');
      } else {
        // Add new item
        const { error } = await supabase
          .from('boq_items')
          .insert([itemData]);

        if (error) throw error;
        toast.success('BOQ item added successfully!');
      }

      reset();
      setShowAddForm(false);
      setEditingItem(null);
      loadBOQItems();
      onSuccess?.();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to save BOQ item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: BOQItem) => {
    setEditingItem(item);
    setValue('item_code', item.item_code);
    setValue('description', item.description);
    setValue('unit', item.unit);
    setValue('quantity', item.quantity);
    setValue('rate', item.rate);
    setValue('amount', item.amount);
    setValue('category', item.category);
    setValue('work_type', item.work_type);
    setShowAddForm(true);
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this BOQ item?')) return;

    try {
      const { error } = await supabase
        .from('boq_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('BOQ item deleted successfully!');
      loadBOQItems();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete BOQ item');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `boq-${Date.now()}.${fileExt}`;
      const filePath = `boq-files/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Call extract-boq edge function
      const { error: extractError } = await supabase.functions
        .invoke('extract-boq', {
          body: {
            file_url: `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/uploads/${filePath}`,
            file_type: fileExt,
            project_id: projectId
          }
        });

      if (extractError) throw extractError;

      toast.success('BOQ extraction started! Check back in a few moments.');
      setTimeout(() => loadBOQItems(), 3000); // Reload after 3 seconds

    } catch (error) {
      console.error('BOQ upload error:', error);
      toast.error('Failed to process BOQ file');
    }
  };

  const totalBOQAmount = boqItems.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalCompletedAmount = boqItems.reduce((sum, item) => {
    const completed = item.completed_quantity || 0;
    const rate = item.rate || 0;
    return sum + (completed * rate);
  }, 0);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          BOQ Manager
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage Bill of Quantities for the project
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <Calculator className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Items</p>
              <p className="text-2xl font-bold">{boqItems.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <FileText className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Value</p>
              <p className="text-2xl font-bold">₹{totalBOQAmount.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <CheckCircle className="w-8 h-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Completed Value</p>
              <p className="text-2xl font-bold">₹{totalCompletedAmount.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <AlertCircle className="w-8 h-8 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Progress</p>
              <p className="text-2xl font-bold">
                {totalBOQAmount > 0 ? ((totalCompletedAmount / totalBOQAmount) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-4">
          <Button
            onClick={() => setShowAddForm(!showAddForm)}
            variant={showAddForm ? "outline" : "default"}
          >
            {showAddForm ? 'Cancel' : '+ Add Item'}
          </Button>

          <label className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            Upload BOQ File
            <input
              type="file"
              accept=".xlsx,.xls,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export BOQ
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingItem ? 'Edit BOQ Item' : 'Add BOQ Item'}
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Item Code</label>
                <Input
                  {...register('item_code')}
                  placeholder="e.g., CIVIL-001"
                  error={errors.item_code?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  {...register('category')}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">Select Category</option>
                  <option value="civil">Civil Work</option>
                  <option value="electrical">Electrical</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="finishing">Finishing</option>
                  <option value="structural">Structural</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && (
                  <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                {...register('description')}
                rows={2}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                placeholder="Detailed description of the work item..."
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Unit</label>
                <select
                  {...register('unit')}
                  className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                >
                  <option value="">Select Unit</option>
                  <option value="sqm">sqm</option>
                  <option value="cum">cum</option>
                  <option value="kg">kg</option>
                  <option value="nos">nos</option>
                  <option value="rmt">rmt</option>
                  <option value="ls">ls</option>
                </select>
                {errors.unit && (
                  <p className="text-red-500 text-sm mt-1">{errors.unit.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Quantity</label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('quantity', { valueAsNumber: true })}
                  error={errors.quantity?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Rate (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('rate', { valueAsNumber: true })}
                  error={errors.rate?.message}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  {...register('amount', { valueAsNumber: true })}
                  readOnly
                  className="bg-gray-100 dark:bg-gray-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Work Type</label>
              <select
                {...register('work_type')}
                className="w-full p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
              >
                <option value="">Select Work Type</option>
                <option value="earthwork">Earthwork</option>
                <option value="concrete">Concrete Work</option>
                <option value="masonry">Masonry</option>
                <option value="plastering">Plastering</option>
                <option value="flooring">Flooring</option>
                <option value="electrical">Electrical</option>
                <option value="plumbing">Plumbing</option>
                <option value="finishing">Finishing</option>
                <option value="other">Other</option>
              </select>
              {errors.work_type && (
                <p className="text-red-500 text-sm mt-1">{errors.work_type.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : (editingItem ? 'Update Item' : 'Add Item')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* BOQ Items Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">BOQ Items</h3>

        {boqItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No BOQ items found. Add items manually or upload a BOQ file.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-600">
                  <th className="text-left p-2">Item Code</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2">Category</th>
                  <th className="text-right p-2">Qty</th>
                  <th className="text-left p-2">Unit</th>
                  <th className="text-right p-2">Rate</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-center p-2">Progress</th>
                  <th className="text-center p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item) => (
                  <tr key={item.id} className="border-b dark:border-gray-700">
                    <td className="p-2 font-medium">{item.item_code}</td>
                    <td className="p-2">{item.description}</td>
                    <td className="p-2">
                      <Badge variant="outline">{item.category}</Badge>
                    </td>
                    <td className="p-2 text-right">{item.quantity}</td>
                    <td className="p-2">{item.unit}</td>
                    <td className="p-2 text-right">₹{item.rate?.toLocaleString()}</td>
                    <td className="p-2 text-right font-medium">
                      ₹{item.amount?.toLocaleString()}
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${item.completion_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className="text-sm">{item.completion_percentage || 0}%</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(item.id)}
                          className="text-red-500"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};