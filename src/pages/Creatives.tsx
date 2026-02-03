// ============================================================================
// SUUN TERVEYSTALO - Creatives Page
// Gallery view for creatives with preview and download
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { 
  getCreativeTemplates, 
  renderCreativePreview, 
  getCreativeSizes,
  getBrandAssets
} from '../lib/creativeService';
import type { Creative, CreativeTemplate, CreativeSize } from '../types';
import { format } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  Image,
  Download,
  Search,
  Filter,
  Grid,
  List,
  Eye,
  X,
  Palette,
  Monitor,
  Smartphone,
  Square,
  Copy,
  ExternalLink,
  ChevronDown,
  Check,
  Layers,
  Maximize2,
  ZoomIn,
  MoreVertical
} from 'lucide-react';
import toast from 'react-hot-toast';

type ViewMode = 'grid' | 'list';
type SizeCategory = 'all' | 'dooh' | 'display' | 'social';

// Creative Card
interface CreativeCardProps {
  creative: Creative;
  onPreview: () => void;
  onDownload: () => void;
}

const CreativeCard = ({ creative, onPreview, onDownload }: CreativeCardProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="card group relative overflow-hidden">
      {/* Preview Image */}
      <div 
        className="aspect-video bg-gray-100 relative cursor-pointer"
        onClick={onPreview}
      >
        {creative.preview_url ? (
          <img 
            src={creative.preview_url} 
            alt={creative.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image size={48} className="text-gray-300" />
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3">
          <button className="p-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors">
            <Eye size={20} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDownload(); }}
            className="p-3 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <Download size={20} />
          </button>
        </div>

        {/* Size badge */}
        <span className="absolute top-2 left-2 badge badge-gray text-xs">
          {creative.width}×{creative.height}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{creative.name}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(new Date(creative.created_at), 'd.M.yyyy', { locale: fi })}
            </p>
          </div>
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>
            
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                  <button onClick={onPreview} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
                    <Eye size={14} className="mr-2 text-gray-400" />
                    Esikatsele
                  </button>
                  <button onClick={onDownload} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
                    <Download size={14} className="mr-2 text-gray-400" />
                    Lataa
                  </button>
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center">
                    <Copy size={14} className="mr-2 text-gray-400" />
                    Kopioi URL
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Channel badge */}
        <div className="mt-3 flex items-center space-x-2">
          <span className={`badge text-xs ${
            creative.channel === 'dooh' ? 'badge-primary' :
            creative.channel === 'display' ? 'badge-secondary' :
            'badge-accent'
          }`}>
            {creative.channel?.toUpperCase() || 'DISPLAY'}
          </span>
          {creative.service_name && (
            <span className="badge badge-gray text-xs">{creative.service_name}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Size Category Button
interface SizeCategoryBtnProps {
  label: string;
  value: SizeCategory;
  icon: React.ElementType;
  active: boolean;
  onClick: () => void;
}

const SizeCategoryBtn = ({ label, value, icon: Icon, active, onClick }: SizeCategoryBtnProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-xl font-medium text-sm flex items-center transition-colors ${
      active 
        ? 'bg-[#00A5B5] text-white' 
        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
    }`}
  >
    <Icon size={16} className="mr-2" />
    {label}
  </button>
);

const Creatives = () => {
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [templates, setTemplates] = useState<CreativeTemplate[]>([]);
  const [sizes, setSizes] = useState<CreativeSize[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeCategory, setSizeCategory] = useState<SizeCategory>('all');
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [previewCreative, setPreviewCreative] = useState<Creative | null>(null);
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpg' | 'html'>('png');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load creatives
      const { data: creativesData } = await supabase
        .from('creatives')
        .select(`
          *,
          creative_templates(name),
          dental_services(name)
        `)
        .order('created_at', { ascending: false });
      
      const mappedCreatives = (creativesData || []).map(c => ({
        ...c,
        template_name: c.creative_templates?.name,
        service_name: c.dental_services?.name,
      }));
      setCreatives(mappedCreatives);

      // Load templates
      const templatesData = await getCreativeTemplates();
      setTemplates(templatesData);

      // Load sizes
      const sizesData = await getCreativeSizes();
      setSizes(sizesData);

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Tietojen lataaminen epäonnistui');
    } finally {
      setLoading(false);
    }
  };

  // Filtered creatives
  const filteredCreatives = useMemo(() => {
    return creatives.filter(creative => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!creative.name.toLowerCase().includes(query) &&
            !creative.template_name?.toLowerCase().includes(query) &&
            !creative.service_name?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Size category filter
      if (sizeCategory !== 'all') {
        if (creative.channel !== sizeCategory) return false;
      }

      // Specific size filter
      if (selectedSize) {
        const size = selectedSize.split('x');
        if (creative.width !== parseInt(size[0]) || creative.height !== parseInt(size[1])) {
          return false;
        }
      }

      // Template filter
      if (selectedTemplate && creative.template_id !== selectedTemplate) {
        return false;
      }

      return true;
    });
  }, [creatives, searchQuery, sizeCategory, selectedSize, selectedTemplate]);

  // Filtered sizes by category
  const filteredSizes = useMemo(() => {
    if (sizeCategory === 'all') return sizes;
    return sizes.filter(s => s.category === sizeCategory);
  }, [sizes, sizeCategory]);

  const handleDownload = async (creative: Creative) => {
    try {
      if (downloadFormat === 'html' && creative.html_content) {
        // Download as HTML file
        const blob = new Blob([creative.html_content], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creative.name}.html`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (creative.preview_url) {
        // Download image
        const response = await fetch(creative.preview_url);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${creative.name}.${downloadFormat}`;
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success('Lataus aloitettu');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Lataus epäonnistui');
    }
  };

  const handleBulkDownload = async () => {
    toast.loading('Valmistellaan latausta...', { duration: 2000 });
    // In real implementation, would zip files or download one by one
    for (const creative of filteredCreatives.slice(0, 10)) {
      await handleDownload(creative);
      await new Promise(r => setTimeout(r, 500));
    }
    toast.success('Lataukset valmis');
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
          <h1 className="text-2xl font-bold text-gray-900">Luovat</h1>
          <p className="text-gray-500 mt-1">
            {filteredCreatives.length} luovaa
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={downloadFormat}
            onChange={(e) => setDownloadFormat(e.target.value as any)}
            className="input text-sm py-2"
          >
            <option key="png" value="png">PNG</option>
            <option key="jpg" value="jpg">JPG</option>
            <option key="html" value="html">HTML</option>
          </select>
          <button onClick={handleBulkDownload} className="btn-primary">
            <Download size={18} className="mr-2" />
            Lataa kaikki
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-4">
        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Hae luovia..."
              className="input pl-10"
            />
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-[#00A5B5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' ? 'bg-[#00A5B5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Size Categories */}
        <div className="flex flex-wrap gap-2">
          <SizeCategoryBtn
            label="Kaikki"
            value="all"
            icon={Layers}
            active={sizeCategory === 'all'}
            onClick={() => { setSizeCategory('all'); setSelectedSize(''); }}
          />
          <SizeCategoryBtn
            label="DOOH"
            value="dooh"
            icon={Monitor}
            active={sizeCategory === 'dooh'}
            onClick={() => { setSizeCategory('dooh'); setSelectedSize(''); }}
          />
          <SizeCategoryBtn
            label="Display"
            value="display"
            icon={Square}
            active={sizeCategory === 'display'}
            onClick={() => { setSizeCategory('display'); setSelectedSize(''); }}
          />
          <SizeCategoryBtn
            label="Social"
            value="social"
            icon={Smartphone}
            active={sizeCategory === 'social'}
            onClick={() => { setSizeCategory('social'); setSelectedSize(''); }}
          />
        </div>

        {/* Size and Template Dropdowns */}
        <div className="flex flex-wrap gap-3">
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
            className="input text-sm py-2 w-auto"
          >
            <option value="">Kaikki koot</option>
            {filteredSizes.map((size) => (
              <option key={size.id} value={`${size.width}x${size.height}`}>
                {size.name} ({size.width}×{size.height})
              </option>
            ))}
          </select>

          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="input text-sm py-2 w-auto"
          >
            <option value="">Kaikki mallit</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>

          {(selectedSize || selectedTemplate || searchQuery) && (
            <button
              onClick={() => {
                setSelectedSize('');
                setSelectedTemplate('');
                setSearchQuery('');
                setSizeCategory('all');
              }}
              className="text-sm text-[#00A5B5] hover:text-[#008A98] flex items-center"
            >
              <X size={14} className="mr-1" />
              Tyhjennä suodattimet
            </button>
          )}
        </div>
      </div>

      {/* Creatives Grid/List */}
      {filteredCreatives.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Image size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ei luovia</h3>
          <p className="text-gray-500">
            {searchQuery || selectedSize || selectedTemplate
              ? 'Yritä eri hakutermeillä tai suodattimilla.'
              : 'Luo ensimmäiset luovat kampanjaa varten.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredCreatives.map((creative) => (
            <CreativeCard
              key={creative.id}
              creative={creative}
              onPreview={() => setPreviewCreative(creative)}
              onDownload={() => handleDownload(creative)}
            />
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Esikatselu</th>
                <th>Nimi</th>
                <th>Koko</th>
                <th>Kanava</th>
                <th>Palvelu</th>
                <th>Luotu</th>
                <th className="text-right">Toiminnot</th>
              </tr>
            </thead>
            <tbody>
              {filteredCreatives.map((creative) => (
                <tr key={creative.id} className="hover:bg-gray-50">
                  <td>
                    <div 
                      className="w-20 h-12 rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                      onClick={() => setPreviewCreative(creative)}
                    >
                      {creative.preview_url ? (
                        <img src={creative.preview_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Image size={16} className="text-gray-300" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="font-medium text-gray-900">{creative.name}</td>
                  <td className="text-gray-600">{creative.width}×{creative.height}</td>
                  <td>
                    <span className={`badge text-xs ${
                      creative.channel === 'dooh' ? 'badge-primary' :
                      creative.channel === 'display' ? 'badge-secondary' :
                      'badge-accent'
                    }`}>
                      {creative.channel?.toUpperCase() || 'DISPLAY'}
                    </span>
                  </td>
                  <td className="text-gray-600">{creative.service_name || '-'}</td>
                  <td className="text-gray-500">
                    {format(new Date(creative.created_at), 'd.M.yyyy', { locale: fi })}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button
                        onClick={() => setPreviewCreative(creative)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => handleDownload(creative)}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#00A5B5]"
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewCreative && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{previewCreative.name}</h2>
                <p className="text-sm text-gray-500">
                  {previewCreative.width}×{previewCreative.height} • {previewCreative.channel?.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={downloadFormat}
                  onChange={(e) => setDownloadFormat(e.target.value as any)}
                  className="input text-sm py-1.5 w-auto"
                >
                  <option key="png-modal" value="png">PNG</option>
                  <option key="jpg-modal" value="jpg">JPG</option>
                  <option key="html-modal" value="html">HTML</option>
                </select>
                <button 
                  onClick={() => handleDownload(previewCreative)}
                  className="btn-primary btn-sm"
                >
                  <Download size={16} className="mr-1" />
                  Lataa
                </button>
                <button 
                  onClick={() => setPreviewCreative(null)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            {/* Preview */}
            <div className="p-6 bg-gray-100 overflow-auto" style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className="flex items-center justify-center">
                {previewCreative.html_content ? (
                  <div 
                    className="bg-white shadow-lg"
                    style={{ 
                      width: Math.min(previewCreative.width, 800),
                      height: Math.min(previewCreative.height, 600),
                    }}
                  >
                    <iframe
                      srcDoc={previewCreative.html_content}
                      className="w-full h-full border-0"
                      title="Creative preview"
                    />
                  </div>
                ) : previewCreative.preview_url ? (
                  <img 
                    src={previewCreative.preview_url}
                    alt={previewCreative.name}
                    className="max-w-full max-h-[60vh] object-contain shadow-lg"
                  />
                ) : (
                  <div className="w-96 h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                    <Image size={48} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6 text-gray-600">
                  <span>
                    <strong className="text-gray-900">Malli:</strong> {previewCreative.template_name || '-'}
                  </span>
                  <span>
                    <strong className="text-gray-900">Palvelu:</strong> {previewCreative.service_name || '-'}
                  </span>
                  <span>
                    <strong className="text-gray-900">Luotu:</strong>{' '}
                    {format(new Date(previewCreative.created_at), 'd.M.yyyy HH:mm', { locale: fi })}
                  </span>
                </div>
                {previewCreative.preview_url && (
                  <button
                    onClick={() => window.open(previewCreative.preview_url, '_blank')}
                    className="text-[#00A5B5] hover:underline flex items-center"
                  >
                    <ExternalLink size={14} className="mr-1" />
                    Avaa uuteen ikkunaan
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Creatives;
