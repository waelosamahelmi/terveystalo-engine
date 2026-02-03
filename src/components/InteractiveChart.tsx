// ============================================================================
// SUUN TERVEYSTALO - Interactive Chart Component
// Enhanced charts with zoom, pan, annotations, and click interactions
// ============================================================================

import { useState, useRef, useCallback } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  TooltipItem
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';
import annotationPlugin from 'chartjs-plugin-annotation';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Minimize2,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

// Register plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Try to register zoom and annotation plugins if available
try {
  ChartJS.register(zoomPlugin);
} catch (e) {
  console.warn('Zoom plugin not available');
}

try {
  ChartJS.register(annotationPlugin);
} catch (e) {
  console.warn('Annotation plugin not available');
}

type ChartType = 'line' | 'bar' | 'doughnut';

interface Annotation {
  type: 'line' | 'box' | 'point';
  value: number | string;
  label: string;
  color?: string;
}

interface InteractiveChartProps {
  type: ChartType;
  data: ChartData<any>;
  title?: string;
  subtitle?: string;
  height?: number;
  annotations?: Annotation[];
  onDataPointClick?: (dataIndex: number, datasetIndex: number, value: number) => void;
  showControls?: boolean;
  allowZoom?: boolean;
  allowPan?: boolean;
  showLegend?: boolean;
  gradientFill?: boolean;
  currency?: boolean;
  percentage?: boolean;
}

const InteractiveChart = ({
  type,
  data,
  title,
  subtitle,
  height = 300,
  annotations = [],
  onDataPointClick,
  showControls = true,
  allowZoom = true,
  allowPan = true,
  showLegend = true,
  gradientFill = true,
  currency = false,
  percentage = false
}: InteractiveChartProps) => {
  const chartRef = useRef<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hiddenDatasets, setHiddenDatasets] = useState<number[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  // Reset zoom
  const handleResetZoom = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  }, []);

  // Zoom in
  const handleZoomIn = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.zoom(1.2);
    }
  }, []);

  // Zoom out
  const handleZoomOut = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.zoom(0.8);
    }
  }, []);

  // Download chart as image
  const handleDownload = useCallback(() => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `chart-${format(new Date(), 'yyyy-MM-dd-HHmm')}.png`;
      link.href = url;
      link.click();
    }
  }, []);

  // Toggle dataset visibility
  const toggleDataset = useCallback((datasetIndex: number) => {
    setHiddenDatasets(prev => 
      prev.includes(datasetIndex)
        ? prev.filter(i => i !== datasetIndex)
        : [...prev, datasetIndex]
    );
  }, []);

  // Format value for tooltip
  const formatValue = (value: number): string => {
    if (currency) {
      return `€${value.toLocaleString('fi-FI', { minimumFractionDigits: 2 })}`;
    }
    if (percentage) {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString('fi-FI');
  };

  // Base options
  const baseOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    onClick: (event: any, elements: any[]) => {
      if (elements.length > 0 && onDataPointClick) {
        const { datasetIndex, index } = elements[0];
        const value = data.datasets[datasetIndex].data[index] as number;
        onDataPointClick(index, datasetIndex, value);
      }
    },
    plugins: {
      legend: {
        display: showLegend && type !== 'doughnut',
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            family: 'Inter, sans-serif',
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(31, 41, 55, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 12,
        padding: 12,
        titleFont: {
          family: 'Inter, sans-serif',
          size: 13,
          weight: 600
        },
        bodyFont: {
          family: 'Inter, sans-serif',
          size: 12
        },
        callbacks: {
          label: (context: TooltipItem<any>) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y ?? context.parsed;
            return `${label}: ${formatValue(value)}`;
          }
        }
      },
      zoom: allowZoom ? {
        pan: {
          enabled: allowPan,
          mode: 'x' as const,
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        }
      } : undefined,
      annotation: annotations.length > 0 ? {
        annotations: annotations.reduce((acc, ann, idx) => {
          if (ann.type === 'line') {
            acc[`line${idx}`] = {
              type: 'line',
              yMin: ann.value as number,
              yMax: ann.value as number,
              borderColor: ann.color || '#E31E24',
              borderWidth: 2,
              borderDash: [5, 5],
              label: {
                content: ann.label,
                enabled: true,
                position: 'start'
              }
            };
          }
          return acc;
        }, {} as any)
      } : undefined
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11
          },
          color: '#6B7280'
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 11
          },
          color: '#6B7280',
          callback: (value: number) => formatValue(value)
        }
      }
    } : undefined
  };

  // Apply gradient fill for line charts
  const processedData = { ...data };
  if (type === 'line' && gradientFill) {
    processedData.datasets = data.datasets.map((dataset: any, idx: number) => ({
      ...dataset,
      hidden: hiddenDatasets.includes(idx),
      fill: true,
      tension: 0.4,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointHoverBackgroundColor: dataset.borderColor,
      pointHoverBorderColor: '#fff',
      pointHoverBorderWidth: 2,
    }));
  }

  // Apply hidden state to other chart types
  if (type !== 'line') {
    processedData.datasets = data.datasets.map((dataset: any, idx: number) => ({
      ...dataset,
      hidden: hiddenDatasets.includes(idx),
    }));
  }

  const ChartComponent = type === 'line' ? Line : type === 'bar' ? Bar : Doughnut;

  return (
    <div 
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all duration-300 ${
        isFullscreen ? 'fixed inset-4 z-50 shadow-2xl' : ''
      }`}
    >
      {/* Header */}
      {(title || showControls) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
            {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          </div>
          
          {showControls && (
            <div className="flex items-center space-x-1">
              {allowZoom && type !== 'doughnut' && (
                <>
                  <button
                    onClick={handleZoomIn}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Lähennä"
                  >
                    <ZoomIn size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Loitonna"
                  >
                    <ZoomOut size={16} className="text-gray-500" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Nollaa"
                  >
                    <RotateCcw size={16} className="text-gray-500" />
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                </>
              )}
              
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Lataa kuva"
              >
                <Download size={16} className="text-gray-500" />
              </button>
              
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullscreen ? 'Pienennä' : 'Suurenna'}
              >
                {isFullscreen ? (
                  <Minimize2 size={16} className="text-gray-500" />
                ) : (
                  <Maximize2 size={16} className="text-gray-500" />
                )}
              </button>

              {data.datasets.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Asetukset"
                  >
                    <Settings size={16} className="text-gray-500" />
                  </button>

                  {showSettings && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowSettings(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <p className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Datasarjat</p>
                        {data.datasets.map((dataset: any, idx: number) => (
                          <button
                            key={idx}
                            onClick={() => toggleDataset(idx)}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50"
                          >
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: dataset.borderColor || dataset.backgroundColor }}
                              />
                              <span className="text-sm text-gray-700">{dataset.label}</span>
                            </div>
                            {hiddenDatasets.includes(idx) ? (
                              <EyeOff size={14} className="text-gray-400" />
                            ) : (
                              <Eye size={14} className="text-gray-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div className="p-4" style={{ height: isFullscreen ? 'calc(100% - 60px)' : height }}>
        <ChartComponent
          ref={chartRef}
          data={processedData}
          options={baseOptions}
        />
      </div>

      {/* Custom Legend for Doughnut */}
      {type === 'doughnut' && showLegend && (
        <div className="px-4 pb-4">
          <div className="flex flex-wrap justify-center gap-3">
            {data.labels?.map((label: string, idx: number) => {
              const bgColor = Array.isArray(data.datasets[0].backgroundColor)
                ? data.datasets[0].backgroundColor[idx]
                : data.datasets[0].backgroundColor;
              
              return (
                <button
                  key={idx}
                  onClick={() => toggleDataset(idx)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
                    hiddenDatasets.includes(idx)
                      ? 'opacity-50 bg-gray-100'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: bgColor }}
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Fullscreen Backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/50 -z-10"
          onClick={() => setIsFullscreen(false)}
        />
      )}
    </div>
  );
};

export default InteractiveChart;
