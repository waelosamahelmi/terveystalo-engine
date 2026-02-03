import React, { useEffect, useRef, useState } from 'react';
import { X, Loader, BarChart3 } from 'lucide-react';
import { initializeMap, addMarker, addRadiusCircle } from '../lib/maps';
import { getBidTheatreToken, getBidTheatreCredentials } from '../lib/bidTheatre';
import { MediaScreen, countScreensInRadius } from '../lib/mediaScreensService';
import ReactDOM from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  coordinates: { lat: number; lng: number };
  radius: number;
}

interface BidTheatreSite {
  id: number;
  siteURL: string;
  rtbSupplierName: string;
  dailyRequest: number;
  coordinates?: { lat: number; lng: number };
}

interface ScreenCountData {
  total: number;
  byType: Record<string, number>;
  screensInRadius: MediaScreen[];
}

// Create a global state management for the modal outside of React's component hierarchy
let openMapModal: (props: Omit<MapModalProps, 'isOpen' | 'onClose'>) => void = () => {};
let closeMapModal: () => void = () => {};

const MapModal: React.FC<MapModalProps> & { 
  open: (props: { lat: number; lng: number; radius: number; address: string }) => void 
} = ({
  isOpen,
  onClose,
  address,
  coordinates,
  radius
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [loadingMarkers, setLoadingMarkers] = useState<boolean>(false);
  const [bidTheatreSites, setBidTheatreSites] = useState<BidTheatreSite[]>([]);
  const [screenCount, setScreenCount] = useState<ScreenCountData | null>(null);
  const [loadingScreenCount, setLoadingScreenCount] = useState<boolean>(false);
  
  // Extract city from address
  const extractCity = (address: string): string => {
    const parts = address.split(',');
    if (parts.length > 1) {
      const trimmedParts = parts.map(part => part.trim());
      for (let i = trimmedParts.length - 1; i >= 0; i--) {
        const part = trimmedParts[i];
        if (!/^\d+\s*$/.test(part)) {
          return part;
        }
      }
      return trimmedParts[trimmedParts.length - 2] || trimmedParts[trimmedParts.length - 1];
    }
    return "Helsinki";
  };
  
  // Get BidTheatre sites for a city
  const getBidTheatreSites = async (city: string, token: string): Promise<BidTheatreSite[]> => {
    try {
      const credentials = await getBidTheatreCredentials();
      const networkId = credentials.network_id;
      
      const response = await axios.get(
        `https://asx-api.bidtheatre.com/v2.0/api/${networkId}/rtb-site?siteType=dooh&siteURL=${encodeURIComponent(city)}`, 
        {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          withCredentials: true
        }
      );
      
      if (!response.data) {
        throw new Error('No data returned from BidTheatre API');
      }
      
      return processLocationData(response.data, city);
    } catch (error) {
      console.error(`Error getting BidTheatre sites for ${city}:`, error);
      return [];
    }
  };
  
  // Process location data from site URLs
  const processLocationData = (data: any, city: string): BidTheatreSite[] => {
    if (!Array.isArray(data)) {
      data = [data];
    }
    
    const sites = data.filter((site: any) => site && site.siteURL);
    
    return sites.map((site: any) => {
      const siteData: BidTheatreSite = {
        id: site.id,
        siteURL: site.siteURL,
        rtbSupplierName: site.rtbSupplierName || 'Unknown',
        dailyRequest: site.dailyRequest || 0
      };
      
      try {
        const coordPattern = /(\d+\.\d+)[,\s]+(\d+\.\d+)/;
        const match = site.siteURL.match(coordPattern);
        
        if (match && match.length >= 3) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            siteData.coordinates = { lat, lng };
          }
        } else {
          const addressParts = site.siteURL.split('-');
          if (addressParts.length > 1) {
            const randomOffset = () => (Math.random() - 0.5) * 0.02;
            siteData.coordinates = {
              lat: coordinates.lat + randomOffset(),
              lng: coordinates.lng + randomOffset()
            };
          }
        }
      } catch (error) {
        console.error('Error extracting coordinates from site data:', error);
      }
      
      return siteData;
    });
  };
  
  // Add site markers to the map
  const addSiteMarkersToMap = (map: google.maps.Map, sites: BidTheatreSite[]) => {
    sites.forEach(site => {
      if (site.coordinates) {
        const marker = new google.maps.Marker({
          position: site.coordinates,
          map: map,
          title: site.siteURL,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#4285F4',
            fillOpacity: 0.8,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 8
          }
        });
        
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="max-width: 300px; padding: 5px;">
              <h3 style="margin-top: 0; font-size: 16px; font-weight: 500;">${site.rtbSupplierName}</h3>
              <p style="font-size: 13px; margin: 4px 0;">${site.siteURL}</p>
              <p style="font-size: 12px; margin: 4px 0;">Daily Requests: ${site.dailyRequest.toLocaleString()}</p>
              <p style="font-size: 12px; color: #666; margin: 4px 0;">ID: ${site.id}</p>
            </div>
          `
        });
        
        marker.addListener('click', () => {
          infoWindow.open({
            anchor: marker,
            map
          });
        });
      }
    });
  };

  // Count screens within radius from supabase database
  const fetchScreenCount = async () => {
    if (!coordinates || coordinates.lat === 0 || coordinates.lng === 0) {
      return;
    }

    setLoadingScreenCount(true);
    try {
      const result = await countScreensInRadius(
        coordinates.lat, 
        coordinates.lng, 
        radius
      );

      setScreenCount(result);
      
      if (result.total > 0) {
        const topTypes = Object.entries(result.byType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([type, count]) => `${type}: ${count}`)
          .join(', ');
        
        toast.success(`Found ${result.total} media screens within ${radius}m radius. Top types: ${topTypes}`);
      } else {
        toast.info('No media screens found within this radius');
      }
    } catch (error) {
      console.error('Error fetching screen count:', error);
      toast.error('Failed to count media screens in radius');
    } finally {
      setLoadingScreenCount(false);
    }
  };
  
  // Fetch BidTheatre data and add markers to map
  const fetchBidTheatreData = async () => {
    if (!mapInstance) return;
    
    setLoadingMarkers(true);
    
    try {
      const city = extractCity(address);
      
      const token = await getBidTheatreToken();
      
      if (!token) {
        throw new Error('Failed to obtain authorization token');
      }
      
      const sites = await getBidTheatreSites(city, token);
      setBidTheatreSites(sites);
      
      if (sites.length > 0) {
        addSiteMarkersToMap(mapInstance, sites);
        toast.success(`Found ${sites.length} media locations in ${city}`);
      } else {
        toast.error(`No media locations found in ${city}`);
      }
    } catch (error) {
      console.error('Error fetching BidTheatre data:', error);
      toast.error('Failed to fetch media locations. Please try again later.');
    } finally {
      setLoadingMarkers(false);
    }
  };
  
  // Initialize map when modal is opened and coordinates are available
  useEffect(() => {
    if (!isOpen || !mapContainerRef.current || !coordinates || coordinates.lat === 0 || coordinates.lng === 0) {
      return;
    }
    
    const initMap = async () => {
      try {
        const map = await initializeMap(
          'detailed-campaign-map',
          coordinates,
          14
        );
        
        setMapInstance(map);
        
        await addMarker(
          map,
          coordinates,
          address
        );
        
        await addRadiusCircle(
          map,
          coordinates,
          radius
        );
        
        fetchBidTheatreData();
        fetchScreenCount();
      } catch (error) {
        console.error('Error initializing map in modal:', error);
      }
    };
    
    initMap();
  }, [isOpen, coordinates, radius, address]);

  // Update map radius when radius changes
  useEffect(() => {
    if (!mapInstance || !coordinates || coordinates.lat === 0 || coordinates.lng === 0) {
      return;
    }
    
    try {
      mapInstance.data.forEach((feature) => {
        mapInstance.data.remove(feature);
      });
      
      addRadiusCircle(
        mapInstance,
        coordinates,
        radius
      );

      // Refresh screen count when radius changes
      fetchScreenCount();
    } catch (error) {
      console.error('Error updating map radius in modal:', error);
    }
  }, [radius, mapInstance, coordinates]);

  // Generate a breakdown of screens by type
  const renderScreenTypeBreakdown = () => {
    if (!screenCount || screenCount.total === 0) {
      return null;
    }

    const sortedTypes = Object.entries(screenCount.byType)
      .sort((a, b) => b[1] - a[1]);
    
    return (
      <div className="mt-3 border-t pt-3">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center">
          <BarChart3 size={16} className="mr-1" />
          Screen Types:
        </h4>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {sortedTypes.map(([type, count]) => (
            <div key={type} className="text-xs">
              <span className="font-medium">{type}:</span> {count}
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            Campaign Location Map
            {loadingMarkers && (
              <span className="ml-2 inline-block">
                <Loader size={16} className="animate-spin inline-block" /> Loading media locations...
              </span>
            )}
            {loadingScreenCount && (
              <span className="ml-2 inline-block">
                <Loader size={16} className="animate-spin inline-block" /> Counting screens...
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchBidTheatreData}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              disabled={loadingMarkers}
            >
              {loadingMarkers ? (
                <><Loader size={14} className="animate-spin mr-1" /> Loading...</>
              ) : (
                'Refresh Media Locations'
              )}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={22} />
            </button>
          </div>
        </div>
        
        <div className="p-4">
          <div
            id="detailed-campaign-map"
            ref={mapContainerRef}
            className="w-full h-[70vh] rounded-lg border border-gray-200"
          ></div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700">
                <strong>Address:</strong> {address}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Radius:</strong> {radius} meters
              </p>
              <p className="text-sm text-gray-700">
                <strong>Coordinates:</strong> {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
              </p>
            </div>
            <div className="bg-gray-50 p-3 rounded-md">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-gray-700">
                  <strong>Media Locations:</strong> {bidTheatreSites.length} found
                </p>
                <button 
                  onClick={fetchScreenCount} 
                  className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 flex items-center"
                  disabled={loadingScreenCount}
                >
                  {loadingScreenCount ? (
                    <><Loader size={10} className="animate-spin mr-1" /> Counting...</>
                  ) : (
                    'Recount Screens'
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                <strong>Media Screens in Radius:</strong> {screenCount ? screenCount.total : '-'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click on markers to see details
              </p>
              {renderScreenTypeBreakdown()}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Create a container for the modal portal
const MapModalContainer = () => {
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    address: string;
    coordinates: { lat: number; lng: number };
    radius: number;
  }>({
    isOpen: false,
    address: '',
    coordinates: { lat: 0, lng: 0 },
    radius: 0
  });

  useEffect(() => {
    openMapModal = ({ address, coordinates, radius }) => {
      setModalState({
        isOpen: true,
        address,
        coordinates,
        radius
      });
    };

    closeMapModal = () => {
      setModalState(prev => ({ ...prev, isOpen: false }));
    };
  }, []);

  return (
    <MapModal
      isOpen={modalState.isOpen}
      onClose={closeMapModal}
      address={modalState.address}
      coordinates={modalState.coordinates}
      radius={modalState.radius}
    />
  );
};

// Static method to open the map modal from anywhere
MapModal.open = ({ lat, lng, radius, address }) => {
  openMapModal({
    address,
    coordinates: { lat, lng },
    radius
  });
};

// Create a portal root if needed
let mapModalRoot = document.getElementById('map-modal-root');
if (!mapModalRoot) {
  mapModalRoot = document.createElement('div');
  mapModalRoot.id = 'map-modal-root';
  document.body.appendChild(mapModalRoot);
}

// Render the container into the portal
ReactDOM.render(<MapModalContainer />, mapModalRoot);

export default MapModal;