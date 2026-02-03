import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import toast from 'react-hot-toast';
import { Play, Video, Upload, Link, Loader2 } from 'lucide-react';

interface VideoItem {
  id?: string;
  name: string;
  url: string;
  duration: number;
  thumbnail_url?: string;
  is_active: boolean;
}

const VideoLibrary: React.FC = () => {
  const { videos, refreshVideos } = useStore();
  const [isAdding, setIsAdding] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newVideo, setNewVideo] = useState<VideoItem>({
    name: '',
    url: '',
    duration: 10,
    thumbnail_url: '',
    is_active: true
  });

  // Map store videos to local format
  const videoItems = useMemo(() => 
    videos.map(v => ({
      id: v.id,
      name: v.name,
      url: v.url,
      duration: v.duration || 10,
      thumbnail_url: v.thumbnail_url,
      is_active: true
    })),
    [videos]
  );

  const addVideo = async () => {
    if (!newVideo.name || !newVideo.url) {
      toast.error('Please fill in at least name and URL');
      return;
    }

    const { error } = await supabase
      .from('videos')
      .insert([newVideo]);

    if (error) {
      console.error('Error adding video:', error);
      toast.error('Error saving video');
      return;
    }

    toast.success('Video added successfully');
    await refreshVideos();
    resetForm();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid video file (MP4, WebM, OGG, or MOV)');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 100MB');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `train-campaigns/${fileName}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      // Auto-fill the name if empty
      const videoName = newVideo.name || file.name.replace(/\.[^/.]+$/, '');
      
      setNewVideo(prev => ({
        ...prev,
        name: videoName,
        url: publicUrl
      }));

      toast.success('Video uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading video:', error);
      toast.error(error.message || 'Error uploading video');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setUploadMode('url');
    setNewVideo({
      name: '',
      url: '',
      duration: 10,
      thumbnail_url: '',
      is_active: true
    });
  };

  const toggleVideo = async (id: string, is_active: boolean) => {
    const { error } = await supabase
      .from('videos')
      .update({ is_active })
      .eq('id', id);

    if (error) {
      console.error('Error updating video:', error);
      toast.error('Error updating video');
      return;
    }

    toast.success(is_active ? 'Video activated' : 'Video deactivated');
    await refreshVideos();
  };

  const deleteVideo = async (id: string) => {
    if (!confirm('Are you sure you want to delete this video?')) return;

    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting video:', error);
      toast.error('Error deleting video');
      return;
    }

    toast.success('Video deleted successfully');
    await refreshVideos();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Video Library</h1>
          <p className="text-gray-600 mt-1">Manage videos for train campaign displays</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
        >
          {isAdding ? 'Cancel' : '+ Add Video'}
        </button>
      </div>

      {/* Add new video form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-lg font-semibold mb-4">Add New Video</h3>

          {/* Upload Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setUploadMode('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMode === 'url'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Link size={18} />
              URL / Embed
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('file')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                uploadMode === 'file'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Upload size={18} />
              Upload File
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video Name</label>
              <input
                type="text"
                value={newVideo.name}
                onChange={(e) => setNewVideo({...newVideo, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., Kamppi Promo Video"
              />
            </div>

            {uploadMode === 'url' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video URL (YouTube, Vimeo, or direct link)</label>
                <input
                  type="url"
                  value={newVideo.url}
                  onChange={(e) => setNewVideo({...newVideo, url: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="https://www.youtube.com/embed/..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  YouTube: Use embed URL (https://www.youtube.com/embed/VIDEO_ID)
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Video File</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-purple-500 transition-colors">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg,video/quicktime"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="video-upload"
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="video-upload" 
                    className={`cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}
                  >
                    {uploading ? (
                      <div className="flex flex-col items-center">
                        <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-2" />
                        <p className="text-sm text-gray-600">Uploading video...</p>
                      </div>
                    ) : newVideo.url ? (
                      <div className="flex flex-col items-center">
                        <Video className="w-12 h-12 text-green-500 mb-2" />
                        <p className="text-sm text-green-600 font-medium">Video uploaded!</p>
                        <p className="text-xs text-gray-500 mt-1 break-all max-w-md">{newVideo.url}</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setNewVideo(prev => ({ ...prev, url: '' }));
                          }}
                          className="mt-2 text-sm text-purple-600 hover:text-purple-800"
                        >
                          Upload different video
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
                        <p className="text-xs text-gray-500 mt-1">MP4, WebM, OGG, or MOV (max 100MB)</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
              <input
                type="number"
                value={newVideo.duration}
                onChange={(e) => setNewVideo({...newVideo, duration: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                min="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail URL (optional)</label>
              <input
                type="url"
                value={newVideo.thumbnail_url}
                onChange={(e) => setNewVideo({...newVideo, thumbnail_url: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://..."
              />
            </div>

            {/* Preview */}
            {newVideo.url && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                <div className="bg-black rounded-lg overflow-hidden" style={{aspectRatio: '16/9', maxWidth: '400px'}}>
                  {newVideo.url.includes('youtube.com') || newVideo.url.includes('vimeo.com') ? (
                    <iframe
                      src={newVideo.url}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      src={newVideo.url}
                      className="w-full h-full"
                      controls
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={addVideo}
              disabled={uploading}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Save Video
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-400 text-white px-6 py-2 rounded-lg hover:bg-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Videos grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {videoItems.map(video => (
          <div key={video.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            {/* Thumbnail */}
            <div className="bg-gray-200 relative" style={{aspectRatio: '9/16'}}>
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={video.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-purple-200">
                  <Play className="w-16 h-16 text-purple-400" />
                </div>
              )}
              <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${video.is_active ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                {video.is_active ? 'Active' : 'Inactive'}
              </span>
              <span className="absolute bottom-2 left-2 px-2 py-1 rounded text-xs font-medium bg-black/70 text-white">
                {video.duration}s
              </span>
            </div>

            {/* Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-1 truncate">{video.name}</h3>
              <p className="text-xs text-gray-500 truncate mb-3" title={video.url}>{video.url}</p>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleVideo(video.id!, !video.is_active)}
                  className={`flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors ${video.is_active ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                >
                  {video.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  onClick={() => deleteVideo(video.id!)}
                  className="px-3 py-1.5 bg-red-100 text-red-800 rounded text-sm font-medium hover:bg-red-200 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {videos.length === 0 && !isAdding && (
          <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg shadow-md">
            <Video className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No videos yet. Click "+ Add Video" to upload your first video.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoLibrary;
