// ============================================================================
// SUUN TERVEYSTALO - Reports Page
// Generate, schedule, and export reports
// ============================================================================

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { exportAnalytics } from '../lib/analyticsService';
import type { ScheduledReport, ExportRecord } from '../types';
import { format, subDays, subMonths } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  FileBarChart,
  Download,
  Plus,
  Calendar,
  Clock,
  Mail,
  Trash2,
  Edit,
  Play,
  X,
  Check,
  RefreshCw,
  FileText,
  Table,
  BarChart3,
  PieChart,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

// Report Type Card
interface ReportTypeCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  selected: boolean;
  onClick: () => void;
}

const ReportTypeCard = ({ title, description, icon: Icon, selected, onClick }: ReportTypeCardProps) => (
  <button
    onClick={onClick}
    className={`p-4 rounded-xl border-2 text-left transition-all ${
      selected 
        ? 'border-[#00A5B5] bg-[#00A5B5]/5' 
        : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <div className={`p-2 rounded-lg inline-flex mb-3 ${selected ? 'bg-[#00A5B5]/10 text-[#00A5B5]' : 'bg-gray-100 text-gray-500'}`}>
      <Icon size={20} />
    </div>
    <h4 className="font-medium text-gray-900">{title}</h4>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </button>
);

// Export Record Row
interface ExportRowProps {
  record: ExportRecord;
  onDownload: (record: ExportRecord) => void;
}

const ExportRow = ({ record, onDownload }: ExportRowProps) => (
  <tr className="hover:bg-gray-50">
    <td>
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-gray-100">
          <FileText size={16} className="text-gray-600" />
        </div>
        <div>
          <p className="font-medium text-gray-900">{record.name}</p>
          <p className="text-sm text-gray-500">{record.type}</p>
        </div>
      </div>
    </td>
    <td className="text-gray-600">
      {format(new Date(record.created_at), 'd.M.yyyy HH:mm', { locale: fi })}
    </td>
    <td>
      <span className="badge badge-gray uppercase">{record.format}</span>
    </td>
    <td className="text-right">
      {record.status === 'ready' && record.file_url ? (
        <button
          onClick={() => onDownload(record)}
          className="btn-ghost btn-sm text-[#00A5B5]"
        >
          <Download size={16} className="mr-1" />
          Lataa
        </button>
      ) : record.status === 'processing' ? (
        <span className="text-yellow-600 text-sm flex items-center justify-end">
          <RefreshCw size={14} className="animate-spin mr-1" />
          Käsitellään
        </span>
      ) : (
        <span className="text-red-600 text-sm">Virhe</span>
      )}
    </td>
  </tr>
);

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [exportHistory, setExportHistory] = useState<ExportRecord[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Report generation form
  const [reportForm, setReportForm] = useState({
    type: 'campaign_performance',
    dateRange: '30d',
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    format: 'csv',
    campaignId: '',
    branchId: '',
    includeCharts: false,
    scheduled: false,
    scheduleFrequency: 'weekly',
    scheduleEmail: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load scheduled reports
      const { data: scheduled } = await supabase
        .from('scheduled_reports')
        .select('*')
        .order('created_at', { ascending: false });
      setScheduledReports(scheduled || []);

      // Load export history
      const { data: exports } = await supabase
        .from('export_records')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setExportHistory(exports || []);

      // Load campaigns for filter
      const { data: campaignData } = await supabase
        .from('dental_campaigns')
        .select('id, name')
        .order('name');
      setCampaigns(campaignData || []);

      // Load branches for filter
      const { data: branchData } = await supabase
        .from('branches')
        .select('id, name, city')
        .order('city, name');
      setBranches(branchData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Tietojen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (range: string) => {
    setReportForm({ ...reportForm, dateRange: range });
    
    const today = new Date();
    switch (range) {
      case '7d':
        setReportForm(prev => ({
          ...prev,
          startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }));
        break;
      case '30d':
        setReportForm(prev => ({
          ...prev,
          startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }));
        break;
      case '90d':
        setReportForm(prev => ({
          ...prev,
          startDate: format(subDays(today, 90), 'yyyy-MM-dd'),
          endDate: format(today, 'yyyy-MM-dd'),
        }));
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        setReportForm(prev => ({
          ...prev,
          startDate: format(lastMonth, 'yyyy-MM-01'),
          endDate: format(today, 'yyyy-MM-dd'),
        }));
        break;
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const result = await exportAnalytics(
        reportForm.type as any,
        reportForm.format as any,
        reportForm.startDate,
        reportForm.endDate,
        {
          campaignId: reportForm.campaignId || undefined,
          branchId: reportForm.branchId || undefined,
          includeCharts: reportForm.includeCharts,
        }
      );

      if (result) {
        toast.success('Raportti luotu onnistuneesti!');
        
        // If scheduled report
        if (reportForm.scheduled && reportForm.scheduleEmail) {
          await supabase.from('scheduled_reports').insert({
            type: reportForm.type,
            format: reportForm.format,
            frequency: reportForm.scheduleFrequency,
            recipients: [reportForm.scheduleEmail],
            filters: {
              campaignId: reportForm.campaignId,
              branchId: reportForm.branchId,
            },
            active: true,
          });
          toast.success('Ajastettu raportti luotu!');
        }

        // Download the file
        window.open(result.url, '_blank');
        
        // Refresh export history
        loadData();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Raportin luominen epäonnistui');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän ajastetun raportin?')) return;
    
    const { error } = await supabase
      .from('scheduled_reports')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Poistaminen epäonnistui');
    } else {
      setScheduledReports(prev => prev.filter(r => r.id !== id));
      toast.success('Ajastettu raportti poistettu');
    }
  };

  const handleDownloadExport = (record: ExportRecord) => {
    if (record.file_url) {
      window.open(record.file_url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="spinner text-[#00A5B5]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raportit</h1>
          <p className="text-gray-500 mt-1">
            Luo ja hallinnoi raportteja
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary">
          <Plus size={18} className="mr-2" />
          Luo raportti
        </button>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => {
            setReportForm({ ...reportForm, type: 'campaign_performance', dateRange: '30d' });
            handleDateRangeChange('30d');
            setShowCreateModal(true);
          }}
          className="card-hover p-6 text-left"
        >
          <div className="p-3 rounded-xl bg-[#00A5B5]/10 inline-flex mb-4">
            <BarChart3 size={24} className="text-[#00A5B5]" />
          </div>
          <h3 className="font-semibold text-gray-900">Kampanjaraportti</h3>
          <p className="text-sm text-gray-500 mt-1">Yksityiskohtainen kampanjasuorituskyky</p>
        </button>

        <button
          onClick={() => {
            setReportForm({ ...reportForm, type: 'channel_breakdown', dateRange: '30d' });
            handleDateRangeChange('30d');
            setShowCreateModal(true);
          }}
          className="card-hover p-6 text-left"
        >
          <div className="p-3 rounded-xl bg-[#1B365D]/10 inline-flex mb-4">
            <PieChart size={24} className="text-[#1B365D]" />
          </div>
          <h3 className="font-semibold text-gray-900">Kanavaerittely</h3>
          <p className="text-sm text-gray-500 mt-1">Vertaile kanavien suorituskykyä</p>
        </button>

        <button
          onClick={() => {
            setReportForm({ ...reportForm, type: 'budget_summary', dateRange: 'lastMonth' });
            handleDateRangeChange('lastMonth');
            setShowCreateModal(true);
          }}
          className="card-hover p-6 text-left"
        >
          <div className="p-3 rounded-xl bg-[#E31E24]/10 inline-flex mb-4">
            <FileBarChart size={24} className="text-[#E31E24]" />
          </div>
          <h3 className="font-semibold text-gray-900">Budjettiraportti</h3>
          <p className="text-sm text-gray-500 mt-1">Kustannusten ja kulutuksen yhteenveto</p>
        </button>
      </div>

      {/* Scheduled Reports */}
      {scheduledReports.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Clock size={18} className="mr-2 text-gray-400" />
            Ajastetut raportit
          </h2>
          <div className="space-y-3">
            {scheduledReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${report.active ? 'bg-green-100' : 'bg-gray-200'}`}>
                    <Clock size={18} className={report.active ? 'text-green-600' : 'text-gray-400'} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 capitalize">{report.type.replace('_', ' ')}</p>
                    <p className="text-sm text-gray-500">
                      {report.frequency === 'daily' ? 'Päivittäin' : 
                       report.frequency === 'weekly' ? 'Viikoittain' : 'Kuukausittain'}
                      {' • '}
                      {report.recipients?.join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`badge ${report.active ? 'badge-success' : 'badge-gray'}`}>
                    {report.active ? 'Aktiivinen' : 'Pysäytetty'}
                  </span>
                  <button
                    onClick={() => handleDeleteScheduled(report.id)}
                    className="p-2 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export History */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center">
          <FileText size={18} className="mr-2 text-gray-400" />
          Viimeisimmät raportit
        </h2>
        
        {exportHistory.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <FileBarChart size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Ei raportteja</h3>
            <p className="text-gray-500 mb-6">Luo ensimmäinen raportti aloittaaksesi.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary">
              <Plus size={18} className="mr-2" />
              Luo raportti
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Raportti</th>
                  <th>Luotu</th>
                  <th>Muoto</th>
                  <th className="text-right">Toiminto</th>
                </tr>
              </thead>
              <tbody>
                {exportHistory.map((record) => (
                  <ExportRow 
                    key={record.id} 
                    record={record}
                    onDownload={handleDownloadExport}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Report Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold text-gray-900">Luo raportti</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Report Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Raporttityyppi</label>
                <div className="grid grid-cols-2 gap-3">
                  <ReportTypeCard
                    title="Kampanjasuorituskyky"
                    description="Näytöt, klikkaukset, CTR"
                    icon={BarChart3}
                    selected={reportForm.type === 'campaign_performance'}
                    onClick={() => setReportForm({ ...reportForm, type: 'campaign_performance' })}
                  />
                  <ReportTypeCard
                    title="Kanavaerittely"
                    description="Vertailu kanavittain"
                    icon={PieChart}
                    selected={reportForm.type === 'channel_breakdown'}
                    onClick={() => setReportForm({ ...reportForm, type: 'channel_breakdown' })}
                  />
                  <ReportTypeCard
                    title="Alueellinen"
                    description="Suorituskyky alueittain"
                    icon={Table}
                    selected={reportForm.type === 'geographic'}
                    onClick={() => setReportForm({ ...reportForm, type: 'geographic' })}
                  />
                  <ReportTypeCard
                    title="Budjettiyhteenveto"
                    description="Kulutus ja ROI"
                    icon={FileBarChart}
                    selected={reportForm.type === 'budget_summary'}
                    onClick={() => setReportForm({ ...reportForm, type: 'budget_summary' })}
                  />
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aikaväli</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: '7 päivää', value: '7d' },
                    { label: '30 päivää', value: '30d' },
                    { label: '90 päivää', value: '90d' },
                    { label: 'Viime kuukausi', value: 'lastMonth' },
                  ].map(({ label, value }) => (
                    <button
                      key={value}
                      onClick={() => handleDateRangeChange(value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        reportForm.dateRange === value
                          ? 'bg-[#00A5B5] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input
                      type="date"
                      value={reportForm.startDate}
                      onChange={(e) => setReportForm({ ...reportForm, startDate: e.target.value })}
                      className="input"
                    />
                  </div>
                  <div>
                    <input
                      type="date"
                      value={reportForm.endDate}
                      onChange={(e) => setReportForm({ ...reportForm, endDate: e.target.value })}
                      className="input"
                    />
                  </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kampanja</label>
                  <select
                    value={reportForm.campaignId}
                    onChange={(e) => setReportForm({ ...reportForm, campaignId: e.target.value })}
                    className="input"
                  >
                    <option value="">Kaikki kampanjat</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Toimipiste</label>
                  <select
                    value={reportForm.branchId}
                    onChange={(e) => setReportForm({ ...reportForm, branchId: e.target.value })}
                    className="input"
                  >
                    <option value="">Kaikki toimipisteet</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}, {b.city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Muoto</label>
                <div className="flex space-x-2">
                  {['csv', 'excel', 'pdf'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setReportForm({ ...reportForm, format: fmt })}
                      className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-colors ${
                        reportForm.format === fmt
                          ? 'bg-[#00A5B5] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Schedule */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reportForm.scheduled}
                    onChange={(e) => setReportForm({ ...reportForm, scheduled: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-[#00A5B5] focus:ring-[#00A5B5]"
                  />
                  <span className="font-medium text-gray-900">Ajasta raportti</span>
                </label>
                
                {reportForm.scheduled && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Toistuvuus</label>
                      <select
                        value={reportForm.scheduleFrequency}
                        onChange={(e) => setReportForm({ ...reportForm, scheduleFrequency: e.target.value })}
                        className="input"
                      >
                        <option value="daily">Päivittäin</option>
                        <option value="weekly">Viikoittain</option>
                        <option value="monthly">Kuukausittain</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Vastaanottajan sähköposti</label>
                      <input
                        type="email"
                        value={reportForm.scheduleEmail}
                        onChange={(e) => setReportForm({ ...reportForm, scheduleEmail: e.target.value })}
                        placeholder="email@example.com"
                        className="input"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
              <button onClick={() => setShowCreateModal(false)} className="btn-ghost">
                Peruuta
              </button>
              <button onClick={handleGenerateReport} className="btn-primary" disabled={generating}>
                {generating ? (
                  <>
                    <div className="spinner mr-2" />
                    Luodaan...
                  </>
                ) : (
                  <>
                    <Download size={18} className="mr-2" />
                    Luo raportti
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
