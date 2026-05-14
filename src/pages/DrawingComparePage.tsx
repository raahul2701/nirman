import React, { useState, useRef } from 'react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { ScanLine, Upload, Camera, AlertTriangle, CheckCircle, Eye } from 'lucide-react';
import { DrawingAI } from '../services/ai/drawingAI';

export const DrawingComparePage: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [uploadedDrawing, setUploadedDrawing] = useState<File | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<File | null>(null);
  const drawingInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleDrawingUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedDrawing(file);
    }
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedPhoto(file);
    }
  };

  const analyzeComparison = async () => {
    if (!uploadedDrawing || !uploadedPhoto) {
      toast.error('Please upload both drawing and site photo');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Upload files to Supabase storage
      const drawingPath = `drawings/${Date.now()}_drawing.${uploadedDrawing.name.split('.').pop()}`;
      const photoPath = `site-photos/${Date.now()}_photo.${uploadedPhoto.name.split('.').pop()}`;

      const [drawingUpload, photoUpload] = await Promise.all([
        supabase.storage.from('project-files').upload(drawingPath, uploadedDrawing),
        supabase.storage.from('project-files').upload(photoPath, uploadedPhoto)
      ]);

      if (drawingUpload.error || photoUpload.error) {
        throw new Error('Failed to upload files');
      }

      // Get public URLs
      const { data: drawingUrl } = supabase.storage.from('project-files').getPublicUrl(drawingPath);
      const { data: photoUrl } = supabase.storage.from('project-files').getPublicUrl(photoPath);

      // Perform AI analysis
      const result = await DrawingAI.compareDrawingToReality('current-project', {
        drawingUrl: drawingUrl.publicUrl,
        sitePhotoUrl: photoUrl.publicUrl,
        drawingType: 'floor plan',
        elementType: 'structural layout',
        drawingSpec: 'Approved drawing specification as per contract documents',
        siteObservation: 'Current site photo shows actual installation status'
      });

      setComparisonResult(result);
      toast.success('Analysis completed successfully');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze drawing comparison');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return 'text-green-400';
    if (compliance >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityBadge = (severity: string) => {
    const config = {
      low: { color: 'bg-green-500', label: 'Low' },
      medium: { color: 'bg-yellow-500', label: 'Medium' },
      high: { color: 'bg-orange-500', label: 'High' },
      critical: { color: 'bg-red-500', label: 'Critical' }
    };
    const badgeConfig = config[severity as keyof typeof config] || config.low;
    return <Badge className={`${badgeConfig.color} text-white`}>{badgeConfig.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScanLine className="text-[#FF6B00]" />
            Drawing vs Reality Comparison
          </h1>
          <p className="text-gray-400 mt-1">AI-powered comparison between design drawings and actual site conditions</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Drawing Upload */}
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <div className="text-center">
            <Upload className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">Upload Design Drawing</h3>
            <p className="text-gray-400 mb-4">Upload PDF, DWG, or image file of the design drawing</p>

            <input
              ref={drawingInputRef}
              type="file"
              accept=".pdf,.dwg,.png,.jpg,.jpeg"
              onChange={handleDrawingUpload}
              className="hidden"
            />

            {!uploadedDrawing ? (
              <Button
                onClick={() => drawingInputRef.current?.click()}
                variant="outline"
                className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
              >
                <Upload size={16} className="mr-2" />
                Choose Drawing File
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>{uploadedDrawing.name}</span>
                </div>
                <Button
                  onClick={() => drawingInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
                >
                  Change File
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Photo Upload */}
        <Card className="bg-[#1A1A1A] border-[#333] p-6">
          <div className="text-center">
            <Camera className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-white mb-2">Upload Site Photo</h3>
            <p className="text-gray-400 mb-4">Upload current site photograph for comparison</p>

            <input
              ref={photoInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handlePhotoUpload}
              className="hidden"
            />

            {!uploadedPhoto ? (
              <Button
                onClick={() => photoInputRef.current?.click()}
                variant="outline"
                className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
              >
                <Camera size={16} className="mr-2" />
                Choose Photo
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle size={16} />
                  <span>{uploadedPhoto.name}</span>
                </div>
                <Button
                  onClick={() => photoInputRef.current?.click()}
                  variant="outline"
                  size="sm"
                  className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
                >
                  Change Photo
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Analyze Button */}
      <div className="text-center">
        <Button
          onClick={analyzeComparison}
          disabled={!uploadedDrawing || !uploadedPhoto || isAnalyzing}
          className="bg-[#FF6B00] hover:bg-[#FF6B00]/90 disabled:opacity-50"
          size="lg"
        >
          {isAnalyzing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Analyzing...
            </>
          ) : (
            <>
              <ScanLine size={16} className="mr-2" />
              Compare Drawing vs Reality
            </>
          )}
        </Button>
      </div>

      {/* Results Section */}
      {comparisonResult && (
        <div className="space-y-6">
          {/* Overall Compliance */}
          <Card className="bg-[#1A1A1A] border-[#333] p-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-4">Analysis Results</h3>
              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className={`text-4xl font-bold ${getComplianceColor(comparisonResult.overallCompliance)}`}>
                    {comparisonResult.overallCompliance}%
                  </div>
                  <p className="text-gray-400">Compliance Score</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {comparisonResult.deviationsFound}
                  </div>
                  <p className="text-gray-400">Deviations Found</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-400">
                    {comparisonResult.compliantElements}
                  </div>
                  <p className="text-gray-400">Compliant Elements</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-yellow-400">
                    {comparisonResult.minorDeviations}
                  </div>
                  <p className="text-gray-400">Minor Deviations</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-red-400">
                    {comparisonResult.majorDeviations}
                  </div>
                  <p className="text-gray-400">Major Deviations</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Deviations List */}
          {comparisonResult.deviations && comparisonResult.deviations.length > 0 && (
            <Card className="bg-[#1A1A1A] border-[#333] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="text-yellow-400" />
                Identified Deviations
              </h3>
              <div className="space-y-3">
                {comparisonResult.deviations.map((deviation: any, index: number) => (
                  <div key={index} className="border border-[#333] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-white">{deviation.element}</h4>
                      {getSeverityBadge(deviation.severity)}
                    </div>
                    <p className="text-gray-300 mb-2">{deviation.description}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-400">
                        Expected: {deviation.expectedValue}
                      </span>
                      <span className="text-gray-400">
                        Actual: {deviation.actualValue}
                      </span>
                      <span className="text-gray-400">
                        Deviation: {deviation.deviation}%
                      </span>
                    </div>
                    {deviation.recommendations && (
                      <div className="mt-3 p-3 bg-[#2A2A2A] rounded">
                        <p className="text-sm text-gray-300">
                          <strong>Recommendation:</strong> {deviation.recommendations}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recommendations */}
          {comparisonResult.recommendations && (
            <Card className="bg-[#1A1A1A] border-[#333] p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-400" />
                Recommendations
              </h3>
              <div className="space-y-2">
                {comparisonResult.recommendations.map((rec: string, index: number) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#FF6B00] rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-300">{rec}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => {
                // Generate report
                toast.success('Report generation feature coming soon');
              }}
              variant="outline"
              className="border-[#444] text-gray-300 hover:bg-[#2A2A2A]"
            >
              Generate Report
            </Button>
            <Button
              onClick={() => {
                // Save to database
                toast.success('Analysis saved to database');
              }}
              className="bg-[#FF6B00] hover:bg-[#FF6B00]/90"
            >
              Save Analysis
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};