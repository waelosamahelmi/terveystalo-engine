import React, { useEffect, useState, useRef } from 'react';
import { 
  getMediaScreens, 
  syncMediaScreens, 
  searchMediaScreens, 
  MediaScreen 
} from '../lib/mediaScreensService';
import { initializeMap } from '../lib/maps';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { 
  RefreshCw, 
  Search, 
  Map as MapIcon, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronUp,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const MediaScreens: React.FC = () => {
  const [screens, setScreens] = useState<MediaScreen[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedScreen, setSelectedScreen] = useState<MediaScreen | null>(null);
  const [sortField, setSortField] = useState<keyof MediaScreen>('site_url');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterCity, setFilterCity] = useState<string>('');
  const [cities, setCities] = useState<string[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [markerClusterer, setMarkerClusterer] = useState<MarkerClusterer | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalScreens, setTotalScreens] = useState<number>(0);
  const itemsPerPage = 100;
  const [displayedScreens, setDisplayedScreens] = useState<MediaScreen[]>([]);
  
  // Load screens on component mount
  useEffect(() => {
    fetchScreens();
  }, []);
  
  // Update displayed screens when pagination changes
  useEffect(() => {
    if (screens.length === 0) return;
    
    setTotalScreens(screens.length);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setDisplayedScreens(screens.slice(startIndex, endIndex));
  }, [screens, currentPage]);
  
  // Initialize map when component mounts
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    const initMap = async () => {
      try {
        const map = await initializeMap(
          'media-screens-map',
          { lat: 60.1699, lng: 24.9384 }, // Default to Helsinki center
          10
        );
        setMapInstance(map);
      } catch (error) {
        console.error('Error initializing map:', error);
        toast.error('Failed to initialize map');
      }
    };
    
    initMap();
  }, []);
  
  // Update markers when screens or selected screen changes
  useEffect(() => {
    if (!mapInstance) return;
    
    // Clear existing markers and clusterer
    if (markerClusterer) {
      markerClusterer.clearMarkers();
    }
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    
    // Only show screens with coordinates
    const validScreens = screens.filter(
      screen => screen.latitude && screen.longitude
    );
    
    if (validScreens.length === 0) return;
    
    // Create new markers
    const newMarkers = validScreens.map(screen => {
      if (!screen.latitude || !screen.longitude) return null;
      
      const isSelected = selectedScreen?.id === screen.id;
      
      const marker = new google.maps.Marker({
        position: { 
          lat: screen.latitude, 
          lng: screen.longitude 
        },
        map: null, // Don't add to map yet - clusterer will do this
        title: screen.site_url,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: isSelected ? '#FF0000' : '#4285F4',
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: isSelected ? 10 : 8
        }
      });
      
      // Add info window
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 300px; padding: 5px;">
            <h3 style="margin-top: 0; font-size: 16px; font-weight: 500;">${screen.rtb_supplier_name}</h3>
            <p style="font-size: 13px; margin: 4px 0;">${screen.site_url}</p>
            <p style="font-size: 12px; margin: 4px 0;">Daily Requests: ${screen.daily_request.toLocaleString()}</p>
            ${screen.dimensions ? `<p style="font-size: 12px; margin: 4px 0;">Dimensions: ${screen.dimensions}</p>` : ''}
            <p style="font-size: 12px; color: #666; margin: 4px 0;">ID: ${screen.id}</p>
          </div>
        `
      });
      
      // Show info window when marker is clicked
      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map: mapInstance
        });
        setSelectedScreen(screen);
      });
      
      return marker;
    }).filter(Boolean) as google.maps.Marker[];
    
    setMarkers(newMarkers);
    
    // Create a new MarkerClusterer
    const clusterer = new MarkerClusterer({
      map: mapInstance,
      markers: newMarkers,
    });
    
    setMarkerClusterer(clusterer);
    
    // If we have a selected screen, center the map on it
    if (selectedScreen?.latitude && selectedScreen?.longitude) {
      mapInstance.setCenter({ 
        lat: selectedScreen.latitude, 
        lng: selectedScreen.longitude 
      });
      mapInstance.setZoom(14);
    } 
    // Otherwise fit bounds to show all markers
    else if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach(marker => {
        bounds.extend(marker.getPosition()!);
      });
      mapInstance.fitBounds(bounds);
      
      // Don't zoom in too far
      if (mapInstance.getZoom()! > 14) {
        mapInstance.setZoom(14);
      }
    }
  }, [screens, selectedScreen, mapInstance]);
  
  // Extract unique cities when screens change
  useEffect(() => {
    if (!screens.length) return;
    
    const uniqueCities = [...new Set(
      screens
        .map(screen => screen.city)
        .filter(Boolean) as string[]
    )];
    
    setCities(uniqueCities.sort());
  }, [screens]);
  
  // Filter screens when search term or city filter changes
  useEffect(() => {
    if (searchTerm || filterCity) {
      performSearch();
    }
  }, [searchTerm, filterCity]);
  
  // Fetch screens from Supabase
  const fetchScreens = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await getMediaScreens();
      
      if (error) throw error;
      
      if (data) {
        setScreens(data);
        // Reset to first page when fetching new data
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching media screens:', error);
      toast.error('Failed to load media screens');
    } finally {
      setLoading(false);
    }
  };
  
  // Sync screens from BidTheatre API
  const handleSync = async (city: string = 'ALL_FINLAND') => {
    setSyncing(true);
    
    try {
      const result = await syncMediaScreens(city);
      
      if (result.success) {
        toast.success(`Successfully synced ${result.count} media screens`);
        // After syncing, fetch the latest screens from Supabase
        const { data: latestScreens, error } = await getMediaScreens();
        if (error) throw error;
        if (latestScreens) {
          setScreens(latestScreens);
          setCurrentPage(1);
        }
      } else {
        toast.error(`Sync failed: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error syncing media screens:', error);
      toast.error(`Sync failed: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  };
  
  // Search screens
  const performSearch = async () => {
    setLoading(true);
    
    try {
      let filteredScreens;
      
      // If we have a search term, use the search endpoint
      if (searchTerm) {
        const { data, error } = await searchMediaScreens(searchTerm);
        
        if (error) throw error;
        
        filteredScreens = data || [];
      } else {
        // Otherwise fetch all screens
        const { data, error } = await getMediaScreens();
        
        if (error) throw error;
        
        filteredScreens = data || [];
      }
      
      // Apply city filter if needed
      if (filterCity) {
        filteredScreens = filteredScreens.filter(
          screen => screen.city === filterCity
        );
      }
      
      setScreens(filteredScreens);
      // Reset to first page when searching
      setCurrentPage(1);
    } catch (error) {
      console.error('Error searching media screens:', error);
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };
  
  // Sort screens by field
  const sortScreens = (field: keyof MediaScreen) => {
    // If already sorting by this field, toggle direction
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    
    // Sort the screens
    const sortedScreens = [...screens].sort((a, b) => {
      let aValue = a[field];
      let bValue = b[field];
      
      // Handle null values
      if (aValue === null) return sortDirection === 'asc' ? -1 : 1;
      if (bValue === null) return sortDirection === 'asc' ? 1 : -1;
      
      // Compare based on type
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        // For numbers and other types
        return sortDirection === 'asc'
          ? aValue > bValue ? 1 : -1
          : aValue < bValue ? 1 : -1;
      }
    });
    
    setScreens(sortedScreens);
    // Reset to first page when sorting
    setCurrentPage(1);
  };
  
  // Pagination controls
  const totalPages = Math.ceil(totalScreens / itemsPerPage);
  
  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };
  
  // Download screens as CSV
  const downloadCSV = () => {
    if (!screens.length) return;
    
    // Create CSV header
    const headers = [
      'ID',
      'Location',
      'City',
      'Supplier',
      'Site URL',
      'Type',
      'Daily Requests',
      'Dimensions',
      'Latitude',
      'Longitude'
    ];
    
    // Create CSV rows
    const rows = screens.map(screen => [
      screen.id,
      screen.location || '',
      screen.city || '',
      screen.rtb_supplier_name,
      screen.site_url,
      screen.site_type,
      screen.daily_request,
      screen.dimensions || '',
      screen.latitude || '',
      screen.longitude || ''
    ]);
    
    // Combine header and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `media-screens-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  // Render sort indicator
  const renderSortIndicator = (field: keyof MediaScreen) => {
    if (sortField !== field) return null;
    
    return sortDirection === 'asc' 
      ? <ChevronUp size={14} /> 
      : <ChevronDown size={14} />;
  };
  
  return (
    <div className="p-4 h-full">
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Media Screens</h1>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
                disabled={syncing}
                onClick={() => handleSync('ALL_FINLAND')}
              >
                {syncing ? (
                  <><RefreshCw size={16} className="mr-2 animate-spin" /> Syncing...</>
                ) : (
                  <><RefreshCw size={16} className="mr-2" /> Sync</>
                )}
              </button>
            </div>
            
            <button
              className="px-3 py-2 border border-gray-300 rounded hover:bg-gray-50 flex items-center"
              onClick={downloadCSV}
              disabled={!screens.length}
            >
              <Download size={16} className="mr-2" /> Export
            </button>
          </div>
        </div>
        
        <div className="flex mb-4 gap-2">
          <div className="relative flex-grow">
            <Search size={16} className="absolute left-3 top-2.5 text-gray-500" />
            <input
              type="text"
              placeholder="Search media screens..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && performSearch()}
            />
          </div>
          
          {cities.length > 0 && (
            <div className="relative">
              <select 
                className="pl-3 pr-8 py-2 border border-gray-300 rounded appearance-none bg-white"
                value={filterCity}
                onChange={e => setFilterCity(e.target.value)}
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <Filter size={16} className="absolute right-3 top-2.5 text-gray-500 pointer-events-none" />
            </div>
          )}
        </div>
        
        <div className="flex flex-grow gap-4 overflow-hidden">
          {/* Left Column - Table */}
          <div className="w-1/2 overflow-hidden flex flex-col">
            <div className="overflow-auto flex-grow border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => sortScreens('site_url')}
                    >
                      <div className="flex items-center">
                        Location
                        {renderSortIndicator('site_url')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => sortScreens('rtb_supplier_name')}
                    >
                      <div className="flex items-center">
                        Supplier
                        {renderSortIndicator('rtb_supplier_name')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => sortScreens('daily_request')}
                    >
                      <div className="flex items-center">
                        Daily Requests
                        {renderSortIndicator('daily_request')}
                      </div>
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => sortScreens('dimensions')}
                    >
                      <div className="flex items-center">
                        Dimensions
                        {renderSortIndicator('dimensions')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4">
                        <div className="flex justify-center">
                          <RefreshCw size={20} className="animate-spin text-gray-500" />
                        </div>
                      </td>
                    </tr>
                  ) : displayedScreens.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No media screens found
                      </td>
                    </tr>
                  ) : (
                    displayedScreens.map(screen => (
                      <tr 
                        key={screen.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${selectedScreen?.id === screen.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setSelectedScreen(screen)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {screen.location || screen.site_url.split(' - ')[0]}
                          {screen.city && (
                            <span className="ml-1 text-xs text-gray-500">({screen.city})</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {screen.rtb_supplier_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {screen.daily_request.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {screen.dimensions || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalScreens)} of {totalScreens}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-2 py-1 border rounded ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  <span className="text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-2 py-1 border rounded ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
            
            {!loading && totalPages <= 1 && (
              <div className="mt-2 text-xs text-gray-500">
                {screens.length} media screens found
              </div>
            )}
          </div>
          
          {/* Right Column - Map */}
          <div className="w-1/2 flex flex-col overflow-hidden">
            <div 
              id="media-screens-map" 
              ref={mapContainerRef}
              className="rounded-lg border border-gray-200 w-full h-full"
            />
            
            {selectedScreen && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm">
                <h3 className="font-medium text-gray-800">{selectedScreen.site_url}</h3>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500">Supplier:</span> {selectedScreen.rtb_supplier_name}
                  </div>
                  <div>
                    <span className="text-gray-500">Daily Requests:</span> {selectedScreen.daily_request.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-500">Dimensions:</span> {selectedScreen.dimensions || '—'}
                  </div>
                  <div>
                    <span className="text-gray-500">City:</span> {selectedScreen.city || '—'}
                  </div>
                  {selectedScreen.latitude && selectedScreen.longitude && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Coordinates:</span> {selectedScreen.latitude.toFixed(6)}, {selectedScreen.longitude.toFixed(6)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaScreens;