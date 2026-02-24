import React, { useState, useEffect } from 'react';
import { AssetFile } from '../../types/editor';
import { supabase } from '../../lib/supabase';
import { RxImage, RxUpload, RxEyeOpen, RxTrash, RxPlus } from 'react-icons/rx';
import { BiLoaderAlt } from 'react-icons/bi';

interface AssetManagerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const AssetManager: React.FC<AssetManagerProps> = ({ onSelect, onClose }) => {
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'image' | 'logo' | 'background'>('all');

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.from('assets').list('', {
        limit: 100,
        offset: 0,
      });

      if (error) throw error;

      const files: AssetFile[] = (data || [])
        .filter((item) => !item.name.endsWith('/'))
        .map((item) => ({
          id: item.id,
          name: item.name,
          url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets/${item.name}`,
          type: getAssetType(item.name),
          size: item.metadata?.size || 0,
          created_at: item.created_at || '',
        }));

      setAssets(files);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAssetType = (filename: string): AssetFile['type'] => {
    const lower = filename.toLowerCase();
    if (lower.includes('logo')) return 'logo';
    if (lower.includes('background') || lower.includes('bg')) return 'background';
    return 'image';
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${file.name.replace(/\.[^/.]+$/, '')}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(fileName, file);

        if (uploadError) throw uploadError;
      }

      await loadAssets();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (asset: AssetFile) => {
    if (!confirm(`Delete "${asset.name}"?`)) return;

    try {
      const { error } = await supabase.storage.from('assets').remove([asset.name]);
      if (error) throw error;

      await loadAssets();
    } catch (error) {
      console.error('Error deleting asset:', error);
      alert('Failed to delete asset');
    }
  };

  const handleSelect = (asset: AssetFile) => {
    setSelectedAsset(asset.id);
  };

  const handleInsert = () => {
    if (!selectedAsset) return;

    const asset = assets.find((a) => a.id === selectedAsset);
    if (asset) {
      onSelect(asset.url);
      onClose();
    }
  };

  const filteredAssets = assets.filter((asset) => {
    if (filter === 'all') return true;
    return asset.type === filter;
  });

  return (
    <div className="asset-manager-overlay" onClick={onClose}>
      <div className="asset-manager-panel" onClick={(e) => e.stopPropagation()}>
        <div className="asset-manager-header">
          <h2>Asset Manager</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="asset-manager-toolbar">
          <div className="filter-tabs">
            <FilterTab
              label="All"
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
            <FilterTab
              label="Images"
              active={filter === 'image'}
              onClick={() => setFilter('image')}
            />
            <FilterTab
              label="Logos"
              active={filter === 'logo'}
              onClick={() => setFilter('logo')}
            />
            <FilterTab
              label="Backgrounds"
              active={filter === 'background'}
              onClick={() => setFilter('background')}
            />
          </div>

          <label className="upload-btn">
            <RxUpload size={18} />
            <span>Upload</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="asset-manager-content">
          {loading ? (
            <div className="asset-manager-loading">
              <BiLoaderAlt size={32} className="spinner" />
              <p>Loading assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="asset-manager-empty">
              <RxImage size={48} />
              <p>No assets found</p>
              <p className="hint">Upload images to get started</p>
            </div>
          ) : (
            <div className="asset-grid">
              {filteredAssets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAsset === asset.id}
                  onSelect={() => handleSelect(asset)}
                  onInsert={() => onSelect(asset.url)}
                  onDelete={() => handleDelete(asset)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="asset-manager-footer">
          <span className="asset-count">{filteredAssets.length} assets</span>
          <button
            className="insert-btn"
            onClick={handleInsert}
            disabled={!selectedAsset}
          >
            Insert Selected
          </button>
        </div>
      </div>
    </div>
  );
};

interface FilterTabProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const FilterTab: React.FC<FilterTabProps> = ({ label, active, onClick }) => {
  return (
    <button
      className={`filter-tab ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

interface AssetCardProps {
  asset: AssetFile;
  isSelected: boolean;
  onSelect: () => void;
  onInsert: () => void;
  onDelete: () => void;
}

const AssetCard: React.FC<AssetCardProps> = ({
  asset,
  isSelected,
  onSelect,
  onInsert,
  onDelete,
}) => {
  const [imageError, setImageError] = React.useState(false);

  return (
    <div
      className={`asset-card ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div className="asset-card-preview">
        {!imageError ? (
          <img src={asset.url} alt={asset.name} onError={() => setImageError(true)} />
        ) : (
          <div className="asset-error">
            <RxImage size={24} />
          </div>
        )}
        <div className="asset-card-overlay">
          <button
            className="asset-action-btn insert"
            onClick={(e) => {
              e.stopPropagation();
              onInsert();
            }}
            title="Insert"
          >
            <RxPlus size={16} />
          </button>
          <button
            className="asset-action-btn preview"
            onClick={(e) => {
              e.stopPropagation();
              window.open(asset.url, '_blank');
            }}
            title="Preview"
          >
            <RxEyeOpen size={16} />
          </button>
          <button
            className="asset-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete"
          >
            <RxTrash size={16} />
          </button>
        </div>
      </div>
      <div className="asset-card-info">
        <span className="asset-name">{asset.name}</span>
        <span className="asset-type">{asset.type}</span>
      </div>
    </div>
  );
};
