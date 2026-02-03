import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Campaign, CampaignApartment, Apartment, User, MediaScreen } from '../types';
import { X, Plus, Trash, Check, RefreshCw, MapPin, AlertCircle, ChevronRight, ChevronLeft, Calendar, ExternalLink, Maximize2, BarChart3, MonitorSmartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import AddressAutocomplete from './AddressAutocomplete';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { geocodeAddress, initializeMap, addMarker, addRadiusCircle } from '../lib/maps';
import { addCampaignToSheet, updateCampaignInSheet } from '../lib/googleSheets';
import { countScreensInRadius } from '../lib/mediaScreensService';

interface CampaignModalProps {
  campaign?: Campaign | null;
  onClose: () => void;
  onSave: () => void;
  apartments: Apartment[];
campaignApartments: CampaignApartment[];
}

const CampaignModal = ({
  campaign,
  onClose,
  onSave,
  apartments,
  campaignApartments
}: CampaignModalProps) => {
  // State for form data
  const [formData, setFormData] = useState({
    partner_id: '',
    partner_name: '',
    agent: '',
    agent_key: '',
    agency_id: '',
    campaign_address: '',
    campaign_postal_code: '',
    campaign_city: '',
    campaign_radius: 1500,
    campaign_start_date: format(new Date(), 'dd/MM/yyyy'),
    campaign_end_date: format(addMonths(new Date(), 1), 'dd/MM/yyyy'),
    channel_meta: false,
    channel_display: false,
    channel_pdooh: false,
    budget_meta: '',
    budget_display: '',
    budget_pdooh: '',
    budget_meta_daily: 0,
    budget_display_daily: 0,
    budget_pdooh_daily: 0,
    active: true,
  });

  // State for current user
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [agencyList, setAgencyList] = useState<{id: string, name: string}[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedApartmentKeys, setSelectedApartmentKeys] = useState<string[]>([]);
  const [filteredApartments, setFilteredApartments] = useState<Apartment[]>([]);
  const [selectedTab, setSelectedTab] = useState<'info' | 'apartments' | 'budget'>('info');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredAgencyApartments, setFilteredAgencyApartments] = useState<Apartment[]>([]);
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [campaignAddressValid, setCampaignAddressValid] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOngoing, setIsOngoing] = useState(false);
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [userAgency, setUserAgency] = useState<{id: string, name: string} | null>(null);
  const [filterByAgency, setFilterByAgency] = useState(true);
  const [invalidFields, setInvalidFields] = useState<Record<string, boolean>>({});
  
  // New states for PDOOH screens and budget settings
  const [screenCount, setScreenCount] = useState<{
    total: number;
    byType: Record<string, number>;
    screensInRadius: MediaScreen[];
  } | null>(null);
  const [loadingScreenCount, setLoadingScreenCount] = useState(false);
  const [screensLoaded, setScreensLoaded] = useState(false);
  const [mapModalOpen, setMapModalOpen] = useState(false);
  const [budgetSettings, setBudgetSettings] = useState({
    mediaSpendPercentage: 85, // Default to 85%
    impressionDivisorMeta: 4,
    impressionDivisorDisplay: 8,
    impressionDivisorPdooh: 7,
    impressionMultiplier: 1000,
  });
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const budgetMetaRef = useRef<HTMLInputElement>(null);
  const budgetDisplayRef = useRef<HTMLInputElement>(null);
  const budgetPdoohRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Fetch user and agency list on mount
  useEffect(() => {
    const fetchUserAndAgencies = async () => {
      try {
        // Get current user
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: userData, error } = await supabase
            .from('users')
            .select('*, advertiser_id')
            .eq('id', session.user.id)
            .single();
          
          if (error) throw error;
          
          setCurrentUser(userData);
          setIsAdmin(userData.role === 'admin');
          setIsManager(userData.role === 'manager');
          setIsPartner(userData.role === 'partner');
          
          // Fetch agencies for all users
          const { data: agencies, error: agencyError } = await supabase
            .from('agencies')
            .select('agency_id, name')
            .order('name', { ascending: true });
          
          if (agencyError) throw agencyError;
          setAgencyList(agencies.map(a => ({ id: a.agency_id, name: a.name })));
          
          // Set default partner data based on current user if not editing
          if (!campaign) {
            setFormData(prev => ({
              ...prev,
              partner_id: userData.partner_id || userData.id,
              partner_name: userData.partner_name || '',
              agent: userData.name || '',
              agent_key: userData.agent_key || '',
              agency_id: userData.agency_id || '',
            }));
          }
          
          // Determine user's agency by their agency_id
          if (userData.agency_id) {
            const agencyInfo = agencies.find(a => a.agency_id === userData.agency_id);
            
            if (agencyInfo) {
              setUserAgency({ id: agencyInfo.agency_id, name: agencyInfo.name });
              
              // Set as default if not editing
              if (!campaign) {
                setFormData(prev => ({
                  ...prev,
                  agent_key: userData.agent_key || '',
                  agency_id: userData.agency_id,
                  partner_name: agencyInfo.name,
                }));
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };
    
    fetchUserAndAgencies();
    fetchBudgetSettings();
  }, [campaign, apartments]);

  // Fetch budget settings from database
  const fetchBudgetSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('budget_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) {
        console.error('Error fetching budget settings:', error);
        return;
      }
      
      if (data) {
        setBudgetSettings({
          mediaSpendPercentage: data.media_spend_percentage || 85,
          impressionDivisorMeta: data.impression_divisor_meta || 4,
          impressionDivisorDisplay: data.impression_divisor_display || 8,
          impressionDivisorPdooh: data.impression_divisor_pdooh || 7,
          impressionMultiplier: data.impression_multiplier || 1000,
        });
      }
    } catch (error) {
      console.error('Error fetching budget settings:', error);
    }
  };

  // Initialize form with campaign data if editing
  useEffect(() => {
    if (campaign) {
      // Convert channels to boolean
      const updatedFormData = {
        ...campaign,
        channel_meta: campaign.channel_meta === 1,
        channel_display: campaign.channel_display === 1,
        channel_pdooh: campaign.channel_pdooh === 1,
        budget_meta: campaign.budget_meta === 0 ? '' : campaign.budget_meta,
        budget_display: campaign.budget_display === 0 ? '' : campaign.budget_display,
        budget_pdooh: campaign.budget_pdooh === 0 ? '' : campaign.budget_pdooh
      };
      
      setFormData({
        ...updatedFormData,
        campaign_start_date: campaign.campaign_start_date.split('-').reverse().join('/'), // Convert YYYY-MM-DD to dd/MM/yyyy
        campaign_end_date: campaign.campaign_end_date ? campaign.campaign_end_date.split('-').reverse().join('/') : '', // Convert if exists
      });
      setIsOngoing(!campaign.campaign_end_date);
      
      // Get selected apartment keys
      const selectedKeys = campaignApartments
        .filter(ca => ca.campaign_id === campaign.id)
        .map(ca => ca.apartment_key);
      
      console.log('Preselecting apartments for campaign:', campaign.id, 'Selected keys:', selectedKeys);
      setSelectedApartmentKeys(selectedKeys);

      // Automatically verify the address when editing a campaign
      if (campaign.campaign_address && campaign.campaign_postal_code && campaign.campaign_city) {
        handleGeocodeAddress();
      }
    }
  }, [campaign, campaignApartments]);

  // Initialize map when address is set and component is mounted
  useEffect(() => {
    if (!mapContainerRef.current || 
        !formData.campaign_coordinates || 
        formData.campaign_coordinates.lat === 0 || 
        formData.campaign_coordinates.lng === 0 ||
        selectedTab !== 'info') {
      return;
    }
    
    const initMap = async () => {
      try {
        const map = await initializeMap(
          'campaign-map',
          formData.campaign_coordinates!,
          13
        );
        
        setMapInstance(map);
        setMapLoaded(true);
        
        // Add marker for campaign location
        await addMarker(
          map,
          formData.campaign_coordinates!,
          formData.campaign_address
        );
        
        // Add circle for campaign radius
        await addRadiusCircle(
          map,
          formData.campaign_coordinates!,
          formData.campaign_radius
        );

        // Fetch and add screens to the map
        if (formData.campaign_coordinates) {
          const result = await countScreensInRadius(
            formData.campaign_coordinates.lat,
            formData.campaign_coordinates.lng,
            formData.campaign_radius
          );
          
          setScreenCount({
            total: result.total,
            byType: result.byType,
            screensInRadius: result.screensInRadius
          });
          
          if (result.screensInRadius && result.screensInRadius.length > 0) {
            addScreenMarkersToMap(map, result.screensInRadius);
            setScreensLoaded(true);
          }
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };
    
    initMap();
  }, [formData.campaign_coordinates, formData.campaign_radius, selectedTab]);

  // Update map radius when campaign radius changes
  useEffect(() => {
    if (!mapInstance || 
        !formData.campaign_coordinates || 
        formData.campaign_coordinates.lat === 0 || 
        formData.campaign_coordinates.lng === 0) {
      return;
    }
    
    try {
      // Clear previous layers
      mapInstance.data.forEach((feature) => {
        mapInstance.data.remove(feature);
      });
      
      // Add circle for campaign radius
      addRadiusCircle(
        mapInstance,
        formData.campaign_coordinates,
        formData.campaign_radius
      );
    } catch (error) {
      console.error('Error updating map radius:', error);
    }
  }, [formData.campaign_radius, mapInstance]);

  // Filter apartments based on agency
  useEffect(() => {
    if (!currentUser) return;

    let agencyApts: Apartment[] = [];

    if (!filterByAgency) {
      // If filter by agency is off, show all apartments
      agencyApts = apartments;
    } else {
      // Apply agency-based filtering
      if (isAdmin) {
        // Admins can see all apartments, optionally filtered by selected agency
        if (formData.agency_id) {
          agencyApts = apartments.filter(apt => 
            apt.agency === formData.agency_id
          );
        } else {
          agencyApts = apartments;
        }
      } else if (isManager) {
        // Managers can see all apartments for selected agency
        if (formData.agency_id) {
          agencyApts = apartments.filter(apt => 
            apt.agency === formData.agency_id
          );
        } else {
          agencyApts = apartments;
        }
      } else if (isPartner) {
        // Partners can only see apartments for their agency
        if (currentUser.agency_id) {
          agencyApts = apartments.filter(apt => 
            apt.agency === currentUser.agency_id
          );
        } else {
          // Fallback to agent email if no agency_id
          agencyApts = apartments.filter(apt => 
            apt.agentEmail?.toLowerCase() === currentUser.email.toLowerCase()
          );
        }
      }
    }

    setFilteredAgencyApartments(agencyApts);
  }, [apartments, currentUser, isAdmin, isManager, isPartner, formData.agency_id, filterByAgency]);

  // Filter apartments based on search term
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredApartments(filteredAgencyApartments);
      return;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    
    const filtered = filteredAgencyApartments.filter(apt => 
      apt.address.toLowerCase().includes(searchTermLower) ||
      apt.city.toLowerCase().includes(searchTermLower) ||
      apt.postcode.toLowerCase().includes(searchTermLower) ||
      String(apt.key).toLowerCase().includes(searchTermLower)
    );
    
    setFilteredApartments(filtered);
  }, [searchTerm, filteredAgencyApartments]);

  // Automatically calculate daily budgets and actuals based on total budget
  useEffect(() => {
    let campaignDays = 30; // Default to 30 days for ongoing campaigns
    
    if (!isOngoing && formData.campaign_start_date && formData.campaign_end_date) {
      try {
        const startParts = formData.campaign_start_date.split('/');
        const endParts = formData.campaign_end_date.split('/');
        
        if (startParts.length === 3 && endParts.length === 3) {
          const startDate = parseISO(`${startParts[2]}-${startParts[1]}-${startParts[0]}`); // YYYY-MM-DD
          const endDate = parseISO(`${endParts[2]}-${endParts[1]}-${endParts[0]}`); // YYYY-MM-DD
          
          campaignDays = differenceInDays(endDate, startDate) + 1;
          campaignDays = Math.max(campaignDays, 1); // Ensure at least 1 day
        }
      } catch (error) {
        console.error('Error calculating campaign days:', error);
        campaignDays = 30; // Fallback to 30 days
      }
    }    
    
    // Calculate daily budgets and actual media spend
    setFormData(prev => {
      const metaActual = prev.channel_meta && prev.budget_meta
        ? Math.ceil(parseFloat(prev.budget_meta.toString()) * budgetSettings.mediaSpendPercentage / 100)
        : 0;
      const displayActual = prev.channel_display && prev.budget_display
        ? Math.ceil(parseFloat(prev.budget_display.toString()) * budgetSettings.mediaSpendPercentage / 100)
        : 0;
      const pdoohActual = prev.channel_pdooh && prev.budget_pdooh
        ? Math.ceil(parseFloat(prev.budget_pdooh.toString()) * budgetSettings.mediaSpendPercentage / 100)
        : 0;

      return {
        ...prev,
        budget_meta_daily: metaActual > 0 ? Math.ceil(metaActual / campaignDays) : 0,
        budget_display_daily: displayActual > 0 ? Math.ceil(displayActual / campaignDays) : 0,
        budget_pdooh_daily: pdoohActual > 0 ? Math.ceil(pdoohActual / campaignDays) : 0,
      };
    });
  }, [
    formData.budget_meta,
    formData.budget_display,
    formData.budget_pdooh,
    formData.campaign_start_date,
    formData.campaign_end_date,
    isOngoing,
    formData.channel_meta,
    formData.channel_display,
    formData.channel_pdooh,
    budgetSettings.mediaSpendPercentage,
  ]);

  // Automatically verify address when editing a campaign
  useEffect(() => {
    if (campaign && formData.campaign_address && formData.campaign_postal_code && formData.campaign_city) {
      handleGeocodeAddress();
    }
  }, [campaign, formData.campaign_address, formData.campaign_postal_code, formData.campaign_city]);
  
  // Validate form whenever relevant data changes
  useEffect(() => {
    // Basic validation
    const isValid = 
      formData.partner_id !== '' &&
      formData.partner_name !== '' &&
      formData.agent !== '' &&
      formData.agent_key !== '' &&
      formData.agency_id !== '' && // Ensure agency_id is not empty
      formData.campaign_address !== '' &&
      formData.campaign_postal_code !== '' &&
      formData.campaign_city !== '' &&
      formData.campaign_radius > 0 &&
      formData.campaign_start_date !== '' &&
      (formData.channel_meta || formData.channel_display || formData.channel_pdooh) &&
      selectedApartmentKeys.length > 0 &&
      campaignAddressValid;
    
    // Additional budget validation
    const hasBudget = 
      (formData.channel_meta ? formData.budget_meta !== '' : true) &&
      (formData.channel_display ? formData.budget_display !== '' : true) &&
      (formData.channel_pdooh ? formData.budget_pdooh !== '' : true);
    
    setIsFormValid(isValid && hasBudget);
    
    // Check for unsaved changes
    setHasUnsavedChanges(true);
  }, [formData, selectedApartmentKeys, campaignAddressValid]);

  // Fetch screen count when address is verified
  useEffect(() => {
    if (campaignAddressValid && formData.campaign_coordinates && formData.campaign_radius > 0) {
      fetchScreenCount();
    }
  }, [campaignAddressValid, formData.campaign_coordinates, formData.campaign_radius]);

  // Function to fetch the screen count in the radius
  const fetchScreenCount = async () => {
    if (!formData.campaign_coordinates || formData.campaign_coordinates.lat === 0 || formData.campaign_coordinates.lng === 0) {
      return;
    }

    setLoadingScreenCount(true);
    try {
      const result = await countScreensInRadius(
        formData.campaign_coordinates.lat, 
        formData.campaign_coordinates.lng, 
        formData.campaign_radius
      );

      setScreenCount({
        total: result.total,
        byType: result.byType,
        screensInRadius: result.screensInRadius
      });
      
      if (result.total > 0) {
        toast.success(`Found ${result.total} media screens within ${formData.campaign_radius}m radius`);
        setScreensLoaded(true);

        // Add screen markers to the map if the map is already loaded
        if (mapInstance && formData.campaign_coordinates) {
          addScreenMarkersToMap(mapInstance, result.screensInRadius);
        }
      } else {
        toast.info(`No media screens found within ${formData.campaign_radius}m radius`);
        setScreensLoaded(false);
      }
    } catch (error) {
      console.error('Error fetching screen count:', error);
      setScreenCount(null);
      setScreensLoaded(false);
    } finally {
      setLoadingScreenCount(false);
    }
  };

  // Add screen markers to map
  const addScreenMarkersToMap = (map: google.maps.Map, screens: MediaScreen[]) => {
    if (!screens || !map) return;
    
    screens.forEach(screen => {
      if (!screen.latitude || !screen.longitude) return;
      
      const position = {
        lat: screen.latitude,
        lng: screen.longitude
      };
      
      const marker = new google.maps.Marker({
        position: position,
        map: map,
        title: screen.site_url || 'Media Screen',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: getMarkerColorByType(screen.site_type || 'default'),
          fillOpacity: 0.8,
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          scale: 7
        }
      });
      
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="max-width: 300px; padding: 5px;">
            <h3 style="margin-top: 0; font-size: 14px; font-weight: 600;">${screen.site_url || 'Media Screen'}</h3>
            <p style="font-size: 12px; margin: 4px 0;">Type: ${screen.site_type || 'N/A'}</p>
            <p style="font-size: 12px; margin: 4px 0;">Location: ${screen.location || 'N/A'}</p>
            <p style="font-size: 12px; margin: 4px 0;">Daily requests: ${screen.daily_request?.toLocaleString() || 'N/A'}</p>
          </div>
        `
      });
      
      marker.addListener('click', () => {
        infoWindow.open({
          anchor: marker,
          map
        });
      });
    });
  };

  // Get different colors for different screen types
  const getMarkerColorByType = (type: string): string => {
    const typeColors: Record<string, string> = {
      'Digital Billboard': '#4285F4',
      'Digital Screen': '#EA4335',
      'Bus Shelter': '#FBBC05',
      'Indoor': '#34A853',
      'Shopping Mall': '#FF6D01',
      'Metro': '#46BDC6',
      'Rail': '#9C27B0',
      'default': '#4285F4'
    };
    
    return typeColors[type] || typeColors.default;
  };

  // Handle moving to next/previous tab
  const handleNavigateTabs = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      // Validate before moving to the next tab
      if (selectedTab === 'info') {
        // Reset invalid fields
        const newInvalidFields: Record<string, boolean> = {};

        // Check each field individually
        if (!formData.partner_id) newInvalidFields.partner_id = true;
        if (!formData.partner_name) newInvalidFields.partner_name = true;
        if (!formData.agent) newInvalidFields.agent = true;
        if (!formData.agent_key) newInvalidFields.agent_key = true;
        if (!formData.agency_id) newInvalidFields.agency_id = true;
        if (!formData.campaign_address) newInvalidFields.campaign_address = true;
        if (!formData.campaign_postal_code) newInvalidFields.campaign_postal_code = true;
        if (!formData.campaign_city) newInvalidFields.campaign_city = true;
        if (!formData.campaign_radius || formData.campaign_radius <= 0) newInvalidFields.campaign_radius = true;
        if (!formData.campaign_start_date) newInvalidFields.campaign_start_date = true;
        if (!campaignAddressValid) newInvalidFields.address_validation = true;

        // Validate agency info tab
        const isAgencyInfoValid = 
          formData.partner_id !== '' &&
          formData.partner_name !== '' &&
          formData.agent !== '' &&
          formData.agent_key !== '' &&
          formData.agency_id !== '' &&
          formData.campaign_address !== '' &&
          formData.campaign_postal_code !== '' &&
          formData.campaign_city !== '' &&
          formData.campaign_radius > 0 &&
          formData.campaign_start_date !== '' &&
          campaignAddressValid;
          
        // Update invalid fields state
        setInvalidFields(newInvalidFields);
        
        if (!isAgencyInfoValid) {
          toast.error('Please fill in all required fields before proceeding');
          
          // Highlight which fields are missing
          if (!campaignAddressValid) {
            toast.error('Please verify the campaign address');
          }
          if (!formData.agency_id) {
            toast.error('Please select an agency');
          }
          
          return;
        }
        
        setSelectedTab('apartments');
      } else if (selectedTab === 'apartments') {
        // Validate apartments tab
        if (selectedApartmentKeys.length === 0) {
          toast.error('Please select at least one apartment before proceeding');
          return;
        }
        
        setSelectedTab('budget');
      } else if (selectedTab === 'budget') {
        // Reset invalid fields
        const newInvalidFields: Record<string, boolean> = {};
        
        // Check each channel's budget
        if (formData.channel_meta && !formData.budget_meta) newInvalidFields.budget_meta = true;
        if (formData.channel_display && !formData.budget_display) newInvalidFields.budget_display = true;
        if (formData.channel_pdooh && !formData.budget_pdooh) newInvalidFields.budget_pdooh = true;
        
        setInvalidFields(newInvalidFields);
        
        // Validate that at least one channel is selected
        if (!formData.channel_meta && !formData.channel_display && !formData.channel_pdooh) {
          toast.error('Please select at least one channel');
          return;
        }
        
        // Validate budgets for selected channels
        const budgetsValid = 
          (!formData.channel_meta || (formData.budget_meta && parseFloat(formData.budget_meta.toString()) > 0)) &&
          (!formData.channel_display || (formData.budget_display && parseFloat(formData.budget_display.toString()) > 0)) &&
          (!formData.channel_pdooh || (formData.budget_pdooh && parseFloat(formData.budget_pdooh.toString()) > 0));
        
        if (!budgetsValid) {
          toast.error('Please enter budgets for all selected channels');
          return;
        }
      }
    } else {
      if (selectedTab === 'budget') setSelectedTab('apartments');
      else if (selectedTab === 'apartments') setSelectedTab('info');
    }
  };

  // Handle form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    // Handle checkboxes
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    
    // Handle number inputs
    if (type === 'number') {
      if (value === '') {
        setFormData(prev => ({ ...prev, [name]: '' }));
      } else {
        const numValue = parseFloat(value);
        setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? '' : numValue }));
      }
      return;
    }
    
    // Handle radius input that needs to be a number
    if (name === 'campaign_radius') {
      const numValue = parseInt(value, 10);
      setFormData(prev => ({ ...prev, [name]: isNaN(numValue) ? 0 : numValue }));
      return;
    }
    
    // Handle agency selection
    if (name === 'agency_id') {
      const selectedAgency = agencyList.find(agency => agency.id === value);
      const agencyName = selectedAgency ? selectedAgency.name : '';
      
      setFormData(prev => ({
        ...prev,
        agency_id: value,
        partner_name: agencyName || prev.partner_name
      }));
      return;
    }
    
    // Handle other inputs
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateSelection = (e: React.ChangeEvent<HTMLInputElement>, isStart: boolean) => {
    const selectedDate = e.target.value; // Format: YYYY-MM-DD from input[type="date"]
    if (selectedDate) {
      const [year, month, day] = selectedDate.split('-');
      const formattedDate = `${day}/${month}/${year}`; // Convert to dd/MM/yyyy
      
      if (isStart) {
        setFormData(prev => ({ ...prev, campaign_start_date: formattedDate }));
      } else {
        setFormData(prev => ({ ...prev, campaign_end_date: formattedDate }));
      }
    }
  };

  // Toggle ongoing campaign status
  const handleOngoingToggle = () => {
    const newIsOngoing = !isOngoing;
    setIsOngoing(newIsOngoing);
    
    if (newIsOngoing) {
      setFormData(prev => ({ ...prev, campaign_end_date: '' }));
    } else {
      setFormData(prev => ({ 
        ...prev, 
        campaign_end_date: format(addMonths(new Date(), 1), '01/MM/yyyy')
      }));
    }
  };

  // Handle address selection
  const handleAddressSelect = async (address: {
    formattedAddress: string;
    streetAddress: string;
    postalCode: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
  }) => {
    setLoadingGeocode(true);
    
    try {
      setFormData(prev => ({
        ...prev,
        campaign_address: address.streetAddress,
        campaign_postal_code: address.postalCode,
        campaign_city: address.city,
        formatted_address: address.formattedAddress,
        campaign_coordinates: address.coordinates
      }));
      
      setCampaignAddressValid(true);
    } catch (error) {
      console.error('Error handling address selection:', error);
      setCampaignAddressValid(false);
    } finally {
      setLoadingGeocode(false);
    }
  };

  // Handle geocoding the address manually
  const handleGeocodeAddress = async () => {
    if (!formData.campaign_address || !formData.campaign_postal_code || !formData.campaign_city) {
      return;
    }
    
    setLoadingGeocode(true);
    
    try {
      const result = await geocodeAddress(
        formData.campaign_address,
        formData.campaign_postal_code,
        formData.campaign_city
      );
      
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          formatted_address: result.formatted_address,
          campaign_coordinates: result.coordinates
        }));
        
        setCampaignAddressValid(true);
        toast.success('Address geocoded successfully');
      } else {
        toast.error(result.error || 'Failed to geocode address');
        setCampaignAddressValid(false);
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      toast.error('Failed to geocode address');
      setCampaignAddressValid(false);
    } finally {
      setLoadingGeocode(false);
    }
  };

  // Handle apartment selection
  const handleSelectApartment = (key: string) => {
    setSelectedApartmentKeys(prev => {
      const isSelected = prev.includes(key);
      return isSelected ? prev.filter(k => k !== key) : [...prev, key];
    });
  };

  // Open apartment link in new tab
  const handleOpenApartmentLink = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://www.kiinteistomaailma.fi/${key}`, '_blank');
  };

  // Handle channel selection with budget reset
  const handleChannelToggle = (channel: 'meta' | 'display' | 'pdooh') => {
    setFormData(prev => {
      const isCurrentlyActive = prev[`channel_${channel}`];
      return {
        ...prev,
        [`channel_${channel}`]: !isCurrentlyActive,
        // Reset budget to '' when deactivating the channel
        [`budget_${channel}`]: isCurrentlyActive ? '' : prev[`budget_${channel}`]
      };
    });
  };

  // Save campaign
const handleSaveCampaign = async () => {
  if (!isFormValid) {
    toast.error('Please fill in all required fields');
    return;
  }

  // Set saving in progress
  setSaveInProgress(true);

  try {
    // Convert budget strings to numbers and calculate actual spend (85% of input)
    const rawBudgetMeta = formData.budget_meta === '' ? 0 : parseFloat(formData.budget_meta.toString());
    const rawBudgetDisplay = formData.budget_display === '' ? 0 : parseFloat(formData.budget_display.toString());
    const rawBudgetPdooh = formData.budget_pdooh === '' ? 0 : parseFloat(formData.budget_pdooh.toString());
    
    // Calculate actual spend values (this is what we'll send to Supabase)
    // Round up to the next whole integer (ceiling) to avoid cents
    const budgetMeta = formData.channel_meta ? Math.ceil(rawBudgetMeta * budgetSettings.mediaSpendPercentage / 100) : 0;
    const budgetDisplay = formData.channel_display ? Math.ceil(rawBudgetDisplay * budgetSettings.mediaSpendPercentage / 100) : 0;
    const budgetPdooh = formData.channel_pdooh ? Math.ceil(rawBudgetPdooh * budgetSettings.mediaSpendPercentage / 100) : 0;

    // Handle campaign coordinates properly for JSON serialization
    const campaignCoordinates = formData.campaign_coordinates 
      ? { lat: formData.campaign_coordinates.lat, lng: formData.campaign_coordinates.lng }
      : null;

    // Convert boolean channels to numbers
    const campaignData = {
      ...formData,
      campaign_coordinates: campaignCoordinates,
      // Use the actual spend values (85% of input)
      budget_meta: budgetMeta,
      budget_display: budgetDisplay,
      budget_pdooh: budgetPdooh,
// Store raw budgets for reference (optional, remove if not needed)
      raw_budget_meta: rawBudgetMeta,
      raw_budget_display: rawBudgetDisplay, 
      raw_budget_pdooh: rawBudgetPdooh,
// Store raw budgets for reference (optional, remove if not needed)
      channel_meta: formData.channel_meta ? 1 : 0,
      channel_display: formData.channel_display ? 1 : 0,
      channel_pdooh: formData.channel_pdooh ? 1 : 0,
      campaign_start_date: formData.campaign_start_date.split('/').reverse().join('-'), // Convert dd/MM/yyyy to YYYY-MM-DD
      campaign_end_date: isOngoing ? null : formData.campaign_end_date.split('/').reverse().join('-'), // Convert if exists
    };

    // Get current user
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('You must be logged in to save campaigns');
    }

    let campaignId;
    let campaignToSend;

    if (campaign) {
      // Update existing campaign
      const updatedCampaign = {
        ...campaignData,
        updated_at: new Date().toISOString(),
      };

      // Update the campaigns table
      const { error } = await supabase
        .from('campaigns')
        .update(updatedCampaign)
        .eq('id', campaign.id);

      if (error) throw error;
      campaignId = campaign.id;

      // Delete existing campaign apartments
      const { error: deleteError } = await supabase
        .from('campaign_apartments')
        .delete()
        .eq('campaign_id', campaign.id);

      if (deleteError) throw deleteError;

      campaignToSend = { ...updatedCampaign, id: campaignId };
    } else {
      // Create new campaign
      const { data: newCampaignData, error } = await supabase
        .from('campaigns')
        .insert({
          ...campaignData,
          created_by: session.user.email,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      if (!newCampaignData) throw new Error('Failed to create campaign');
      
      campaignId = newCampaignData.id;
      campaignToSend = newCampaignData;
    }

    console.log(`Creating/updating campaign with ID: ${campaignId}, selected apartment keys:`, selectedApartmentKeys);
    console.log('Campaign budgets (actual spend values):', { budgetMeta, budgetDisplay, budgetPdooh });

    // Create/update campaign apartments
    const apartmentData = selectedApartmentKeys.map(key => ({
      campaign_id: campaignId,
      apartment_key: key,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('campaign_apartments')
      .insert(apartmentData);

    if (insertError) throw insertError;
    
    // Add a delay to ensure apartments are saved before calling the Netlify function
    await new Promise(resolve => setTimeout(resolve, 1000));

    // --- Google Sheets sync (silent) ---
    try {
      if (campaign) {
        await updateCampaignInSheet(
          { ...campaignToSend },
          apartmentData,
          apartments
        );
      } else {
        await addCampaignToSheet(
          { ...campaignToSend },
          apartmentData,
          apartments
        );
      }
    } catch (e) {
      // Silently ignore Google Sheets sync errors
    }
    // --- End Google Sheets sync ---

    // Only call BidTheatre function if we have at least one BidTheatre channel active
    if (formData.channel_display || formData.channel_pdooh) {
      try {
        console.log('Calling Netlify function with payload including apartment keys:', campaignToSend);

        // Fetch BidTheatre campaign IDs from bidtheatre_campaigns if display_bt_id or pdooh_bt_id are null
        let displayBtId = campaignToSend.display_bt_id;
        let pdoohBtId = campaignToSend.pdooh_bt_id;

        if (campaign) {
          const { data: btCampaigns, error: btError } = await supabase
            .from('bidtheatre_campaigns')
            .select('bt_campaign_id, channel')
            .eq('campaign_id', campaignId);

          if (btError) {
            console.error('Failed to fetch BidTheatre campaign IDs:', btError);
            throw new Error('Failed to fetch BidTheatre campaign IDs');
          }

          console.log('Fetched BidTheatre campaigns:', btCampaigns);

          if (btCampaigns) {
            btCampaigns.forEach(btCampaign => {
              if (btCampaign.channel === 'DISPLAY') {
                displayBtId = btCampaign.bt_campaign_id;
              } else if (btCampaign.channel === 'PDOOH') {
                pdoohBtId = btCampaign.bt_campaign_id;
              }
            });

            // Update the campaigns table with the fetched IDs if they were missing
            const updatePayload = {};
            if (displayBtId && !campaignToSend.display_bt_id) {
              updatePayload['display_bt_id'] = displayBtId;
            }
            if (pdoohBtId && !campaignToSend.pdooh_bt_id) {
              updatePayload['pdooh_bt_id'] = pdoohBtId;
            }

            if (Object.keys(updatePayload).length > 0) {
              const { error: updateError } = await supabase
                .from('campaigns')
                .update(updatePayload)
                .eq('id', campaignId);

              if (updateError) {
                console.error('Failed to update campaign with BidTheatre IDs:', updateError);
              } else {
                console.log(`Updated campaign ${campaignId} with BidTheatre IDs:`, updatePayload);
              }
            }
          }
        }

        // Update the campaign payload with the fetched BidTheatre IDs
        campaignToSend.display_bt_id = displayBtId;
        campaignToSend.pdooh_bt_id = pdoohBtId;

        // Handle DISPLAY channel
        if (formData.channel_display) {
          const displayPayload = { ...campaignToSend, is_update: !!campaign };
          // If we're updating a campaign (campaign exists), use update function
          if (campaign && displayBtId) {
            console.log('Updating existing DISPLAY campaign:', displayBtId);
            const response = await fetch('/.netlify/functions/updateBidTheatreCampaign-background', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...displayPayload,
                btCampaignId: displayBtId,
                channel: 'DISPLAY',
                is_update: true,
              }),
            });

            const rawBody = await response.text();
            console.log('DISPLAY Update Netlify Function raw response body:', rawBody);

            let result;
            try {
              result = rawBody ? JSON.parse(rawBody) : { success: false, error: 'Empty response from server' };
            } catch (parseError) {
              console.error('Failed to parse DISPLAY update response:', parseError);
              result = { success: false, error: 'Invalid response format' };
            }

            if (!result.success) {
              console.error('DISPLAY BidTheatre update error:', result.error || 'Unknown error');
            } else {
              console.log('DISPLAY campaign updated successfully:', result);
            }
          } else {
            // Create new DISPLAY campaign
            console.log('Creating new DISPLAY campaign');
            const response = await fetch('/.netlify/functions/createBidTheatreCampaign-background', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...displayPayload,
                channel_display: 1,
                channel_pdooh: 0,
                is_update: false,
              }),
            });

            const rawBody = await response.text();
            console.log('DISPLAY Create Netlify Function raw response body:', rawBody);

            let result;
            try {
              result = rawBody ? JSON.parse(rawBody) : { success: false, error: 'Empty response from server' };
            } catch (parseError) {
              console.error('Failed to parse DISPLAY create response:', parseError);
              result = { success: false, error: 'Invalid response format' };
            }

            if (!result.success) {
              console.error('DISPLAY BidTheatre create error:', result.error || 'Unknown error');
            } else {
              console.log('DISPLAY campaign created successfully:', result);
              // Update the campaign in Supabase with the new display_bt_id
              const { error: updateError } = await supabase
                .from('campaigns')
                .update({ display_bt_id: result.btCampaignId })
                .eq('id', campaignId);
              if (updateError) {
                console.error('Failed to update display_bt_id in Supabase:', updateError);
              }
            }
          }
        }

        // Handle PDOOH channel
        if (formData.channel_pdooh) {
          const pdoohPayload = { ...campaignToSend, is_update: !!campaign };
          if (campaign && pdoohBtId) {
            // Update existing PDOOH campaign
            console.log('Updating existing PDOOH campaign:', pdoohBtId);
            const response = await fetch('/.netlify/functions/updateBidTheatreCampaign-background', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...pdoohPayload,
                btCampaignId: pdoohBtId,
                channel: 'PDOOH',
                is_update: true,
              }),
            });

            const rawBody = await response.text();
            console.log('PDOOH Update Netlify Function raw response body:', rawBody);

            let result;
            try {
              result = rawBody ? JSON.parse(rawBody) : { success: false, error: 'Empty response from server' };
            } catch (parseError) {
              console.error('Failed to parse PDOOH update response:', parseError);
              result = { success: false, error: 'Invalid response format' };
            }

            if (!result.success) {
              console.error('PDOOH BidTheatre update error:', result.error || 'Unknown error');
            } else {
              console.log('PDOOH campaign updated successfully:', result);
            }
          } else {
            // Create new PDOOH campaign
            console.log('Creating new PDOOH campaign');
            const response = await fetch('/.netlify/functions/createBidTheatreCampaign-background', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                ...pdoohPayload,
                channel_display: 0,
                channel_pdooh: 1,
                is_update: false,
              }),
            });

            const rawBody = await response.text();
            console.log('PDOOH Create Netlify Function raw response body:', rawBody);

            let result;
            try {
              result = rawBody ? JSON.parse(rawBody) : { success: false, error: 'Empty response from server' };
            } catch (parseError) {
              console.error('Failed to parse PDOOH create response:', parseError);
              result = { success: false, error: 'Invalid response format' };
            }

            if (!result.success) {
              console.error('PDOOH BidTheatre create error:', result.error || 'Unknown error');
            } else {
              console.log('PDOOH campaign created successfully:', result);
              // Update the campaign in Supabase with the new pdooh_bt_id
              const { error: updateError } = await supabase
                .from('campaigns')
                .update({ pdooh_bt_id: result.btCampaignId })
                .eq('id', campaignId);
              if (updateError) {
                console.error('Failed to update pdooh_bt_id in Supabase:', updateError);
              }
            }
          }
        }

        toast.success('Campaign completed successfully');
      } catch (btError) {
        console.error('Error calling BidTheatre function:', btError);
      }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: session.user.id,
      user_email: session.user.email,
      action: campaign ? 'update_campaign' : 'create_campaign',
      details: campaign ? `Updated campaign: ${campaignId}` : `Created campaign: ${campaignId}`,
      status: 'success',
    });

    // Success! Close modal and show toast
    toast.success(campaign ? 'Campaign updated successfully' : 'Campaign created successfully');
    onSave(); // Refresh parent component
    onClose(); // Close modal
  } catch (error) {
    console.error('Error saving campaign:', error);
    setSaveInProgress(false);
  }
};

  // Render the form
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b dark:border-white/10">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
            {campaign ? 'Edit Campaign' : 'Create New Campaign'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b dark:border-white/10">
          <button
            onClick={() => setSelectedTab('info')}
            className={`px-5 py-3 font-medium text-sm ${
              selectedTab === 'info'
                ? 'border-b-2 border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            Campaign Info
          </button>
          <button
            onClick={() => setSelectedTab('apartments')}
            className={`px-5 py-3 font-medium text-sm ${
              selectedTab === 'apartments'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Apartments ({selectedApartmentKeys.length})
          </button>
          <button
            onClick={() => setSelectedTab('budget')}
            className={`px-5 py-3 font-medium text-sm ${
              selectedTab === 'budget'
                ? 'border-b-2 border-purple-600 text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Channels & Budget
          </button>
        </div>
        
        <div className="p-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Campaign Info Tab */}
          {selectedTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Agency & Campaign Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Agency Details</h3>
                
                <div className="space-y-4">
                  {/* Agency Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agency
                    </label>
                    <select
                      name="agency_id"
                      value={formData.agency_id}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 text-base border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        invalidFields.agency_id ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Select Agency</option>
                      {agencyList.map(agency => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name} ({agency.id})
                        </option>
                      ))}
                    </select>
                    {invalidFields.agency_id && (
                      <p className="mt-1 text-xs text-red-500">Agency is required</p>
                    )}
                    {isPartner && userAgency && (
                      <p className="mt-1 text-xs text-gray-500">
                        Your default agency is {userAgency.name} ({userAgency.id})
                      </p>
                    )}
                  </div>
                  
                  {/* Partner Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partner Name
                    </label>
                    <input
                      type="text"
                      name="partner_name"
                      value={formData.partner_name}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        invalidFields.partner_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter partner name"
                      required
                    />
                    {invalidFields.partner_name && (
                      <p className="mt-1 text-xs text-red-500">Partner name is required</p>
                    )}
                  </div>
                  
                  {/* Agent Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Name
                    </label>
                    <input
                      type="text"
                      name="agent"
                      value={formData.agent}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        invalidFields.agent ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter agent name"
                      required
                    />
                    {invalidFields.agent && (
                      <p className="mt-1 text-xs text-red-500">Agent name is required</p>
                    )}
                  </div>
                  
                  {/* Agent Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Agent Key
                    </label>
                    <input
                      type="text"
                      name="agent_key"
                      value={formData.agent_key}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        invalidFields.agent_key ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Enter agent key"
                      required
                    />
                    {invalidFields.agent_key && (
                      <p className="mt-1 text-xs text-red-500">Agent key is required</p>
                    )}
                  </div>
                </div>
                
                <h3 className="text-lg font-medium text-gray-800 mt-6 mb-4">Campaign Period</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                      <Calendar size={16} className="mr-1" /> Start Date
                    </label>
                    <input
                      type="date"
                      value={formData.campaign_start_date ? format(parseISO(formData.campaign_start_date.split('/').reverse().join('-')), 'yyyy-MM-dd') : ''}
                      onChange={(e) => handleDateSelection(e, true)}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                        invalidFields.campaign_start_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    />
                    {invalidFields.campaign_start_date && (
                      <p className="mt-1 text-xs text-red-500">Start date is required</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Selected: {formData.campaign_start_date || 'Not set'}
                    </p>
                  </div>
                  
                  {/* End Date */}
                  <div>
                    <div className="flex justify-between items-center">
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                        <Calendar size={16} className="mr-1" /> End Date
                      </label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Ongoing</span>
                        <button
                          type="button"
                          onClick={handleOngoingToggle}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isOngoing ? 'bg-purple-600' : 'bg-gray-200'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${isOngoing ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {!isOngoing && (
                      <input
                        type="date"
                        value={formData.campaign_end_date ? format(parseISO(formData.campaign_end_date.split('/').reverse().join('-')), 'yyyy-MM-dd') : ''}
                        onChange={(e) => handleDateSelection(e, false)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      />
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {isOngoing 
                        ? 'Campaign has no end date' 
                        : `Selected: ${formData.campaign_end_date || 'Not set'}`}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="active_status"
                      name="active"
                      checked={formData.active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    />
                    <label htmlFor="active_status" className="text-sm font-medium text-gray-700">
                      Campaign Active
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Right Column - Location Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Location Details</h3>
                
                <div className="space-y-4">
                  {/* Address Autocomplete */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campaign Address
                    </label>
                    <AddressAutocomplete
                      onAddressSelect={handleAddressSelect}
                      initialAddress={formData.campaign_address}
                      initialPostalCode={formData.campaign_postal_code}
                      initialCity={formData.campaign_city}
                      className={`mb-2 ${invalidFields.address_validation ? 'border-red-500 rounded-md' : ''}`}
                      placeholder="Search for an address"
                    />
                    {invalidFields.address_validation && (
                      <p className="mt-1 text-xs text-red-500">Please verify the address</p>
                    )}
                  </div>
                  
                  {/* Manual Address Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address
                      </label>
                      <input
                        type="text"
                        name="campaign_address"
                        value={formData.campaign_address}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                          invalidFields.campaign_address ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter street address"
                        required
                      />
                      {invalidFields.campaign_address && (
                        <p className="mt-1 text-xs text-red-500">Street address is required</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        name="campaign_postal_code"
                        value={formData.campaign_postal_code}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                          invalidFields.campaign_postal_code ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter postal code"
                        required
                      />
                      {invalidFields.campaign_postal_code && (
                        <p className="mt-1 text-xs text-red-500">Postal code is required</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        name="campaign_city"
                        value={formData.campaign_city}
                        onChange={handleInputChange}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                          invalidFields.campaign_city ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Enter city"
                        required
                      />
                      {invalidFields.campaign_city && (
                        <p className="mt-1 text-xs text-red-500">City is required</p>
                      )}
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Radius
                        </label>
                        <span className="text-sm text-gray-500">
                          {formData.campaign_radius} meters
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="range"
                          name="campaign_radius"
                          min="500"
                          max="5000"
                          step="100"
                          value={formData.campaign_radius}
                          onChange={handleInputChange}
                          className={`w-2/3 h-10 ${
                            invalidFields.campaign_radius ? 'accent-red-500' : ''
                          }`}
                        />
                        <input
                          type="number"
                          name="campaign_radius" 
                          value={formData.campaign_radius}
                          onChange={handleInputChange}
                          className={`w-1/3 px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                            invalidFields.campaign_radius ? 'border-red-500 bg-red-50' : 'border-gray-300'
                          }`}
                          min="100"
                          max="10000"
                          step="100"
                        />
                      </div>
                      {invalidFields.campaign_radius && (
                        <p className="mt-1 text-xs text-red-500">Radius must be greater than 0</p>
                      )}
                    </div>
                  </div>
                  
                  {/* Geocode Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGeocodeAddress}
                      disabled={loadingGeocode || !formData.campaign_address || !formData.campaign_postal_code || !formData.campaign_city}
                      className={`flex items-center px-4 py-2 rounded-md ${
                        loadingGeocode 
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                          : campaignAddressValid
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {loadingGeocode ? (
                        <>
                          <RefreshCw size={18} className="mr-2 animate-spin" />
                          Geocoding...
                        </>
                      ) : campaignAddressValid ? (
                        <>
                          <Check size={18} className="mr-2" />
                          Address Verified
                        </>
                      ) : (
                        <>
                          <MapPin size={18} className="mr-2" />
                          Verify Address
                        </>
                      )}
                    </button>
                  </div>
                  
                  {/* Map */}
                  {campaignAddressValid && (
                    <div className="mt-4">
                      <div
                        id="campaign-map"
                        ref={mapContainerRef}
                        className="w-full h-64 rounded-lg border border-gray-200"
                      ></div>
                      <p className="mt-1 text-xs text-gray-500 text-center">
                        This map shows the campaign location with a {formData.campaign_radius} meter radius
                      </p>

                      {/* Media Screens Display */}
                      <div className="mt-3 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-gray-700 flex items-center">
                            <MonitorSmartphone size={16} className="mr-1" />
                            Media Screens in Campaign Area: 
                            {screenCount ? (
                              <span className="ml-1 text-blue-600">{screenCount.total}</span>
                            ) : (
                              <span className="ml-1 text-gray-500">None found</span>
                            )}
                          </h4>
                          <button
                            type="button"
                            onClick={fetchScreenCount}
                            disabled={loadingScreenCount}
                            className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded hover:bg-blue-100 flex items-center"
                          >
                            {loadingScreenCount ? (
                              <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3 inline mr-1" />
                            )}
                            Refresh
                          </button>
                        </div>

                        {loadingScreenCount ? (
                          <div className="mt-2 flex items-center text-sm text-gray-600">
                            <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> 
                            Counting screens in radius...
                          </div>
                        ) : screenCount && screenCount.total > 0 ? (
                          <div className="mt-2">
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(screenCount.byType || {})
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([type, count], index) => (
                                  <div 
                                    key={index} 
                                    className="text-xs px-2 py-1 bg-gray-100 rounded-full flex items-center"
                                    style={{ borderLeft: `3px solid ${getMarkerColorByType(type)}` }}
                                  >
                                    {type}: {count}
                                  </div>
                                ))}
                            </div>
                            
                            {screensLoaded && (
                              <button
                                onClick={() => setMapModalOpen(true)}
                                className="mt-2 text-xs text-blue-600 hover:text-blue-800 flex items-center"
                              >
                                <Maximize2 className="w-3 h-3 mr-1" />
                                View all screens in larger map
                              </button>
                            )}
                          </div>
                        ) : (
                          <p className="mt-2 text-sm text-gray-500">
                            No media screens found within the campaign radius. PDOOH channel will be disabled.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Apartments Tab */}
          {selectedTab === 'apartments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Available Apartments */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">
                    Available Apartments
                  </h3>
                </div>

                {/* Filter by Agency Toggle */}
                <div className="flex items-center mb-4">
                  <span className="text-sm text-gray-700 mr-2">Filter by agency</span>
                  <button
                    type="button"
                    onClick={() => setFilterByAgency(prev => !prev)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      filterByAgency ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        filterByAgency ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Search for apartments */}
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search apartments..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    ref={searchInputRef}
                  />
                </div>

                {/* Apartments List */}
                <div className="border rounded-md overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b text-sm font-medium text-gray-500 flex">
                    <div className="w-8"></div>
                    <div className="w-16"></div>
                    <div className="flex-1">Address</div>
                    <div className="w-8"></div>
                  </div>

                  <div className="max-h-[500px] overflow-y-auto">
                    {filteredApartments.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No apartments found
                      </div>
                    ) : (
                      filteredApartments.map((apt) => {
                        const isSelected = selectedApartmentKeys.includes(apt.key);

                        return (
                          <div 
                            key={apt.key}
                            className={`px-4 py-3 flex items-center border-b last:border-b-0 ${
                              isSelected 
                                ? 'bg-purple-50' 
                                : 'bg-white hover:bg-gray-50'
                            } cursor-pointer`}
                            onClick={() => handleSelectApartment(apt.key)}
                          >
                            <div className="w-8">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="w-16">
                              {apt.images?.length > 0 ? (
                                <img 
                                  src={apt.images[0].url}
                                  alt={apt.address}
                                  className="w-12 h-12 object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 ml-2">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {apt.address}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {apt.postcode} {apt.city}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {apt.key}
                              </p>
                            </div>
                            <div className="w-8 text-center">
                              <button
                                onClick={(e) => handleOpenApartmentLink(apt.key, e)}
                                className="text-blue-600 hover:text-blue-800"
                                title="View apartment details"
                              >
                                <ExternalLink size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column - Selected Apartments */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  Selected Apartments ({selectedApartmentKeys.length})
                </h3>

                <div className="border rounded-md overflow-hidden">
                  <div className="max-h-[550px] overflow-y-auto">
                    {selectedApartmentKeys.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        No apartments selected
                      </div>
                    ) : (
                      selectedApartmentKeys.map(key => {
                        const apt = apartments.find(a => a.key === key);

                        if (!apt) {
                          return (
                            <div key={key} className="px-4 py-3 border-b last:border-b-0 bg-red-50">
                              <p className="text-sm font-medium text-red-600">
                                Invalid apartment key: {key}
                              </p>
                              <button
                                onClick={() => handleSelectApartment(key)}
                                className="mt-1 text-xs text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div key={apt.key} className="px-4 py-3 flex items-center border-b last:border-b-0 hover:bg-gray-50">
                            <div className="w-16 mr-2">
                              {apt.images?.length > 0 ? (
                                <img 
                                  src={apt.images[0].url}
                                  alt={apt.address}
                                  className="w-12 h-12 object-cover rounded-md"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded-md flex items-center justify-center">
                                  <span className="text-gray-400 text-xs">No image</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {apt.address}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {apt.postcode} {apt.city}
                              </p>
                              <p className="text-xs text-gray-400 truncate">
                                {apt.key}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={(e) => handleOpenApartmentLink(apt.key, e)}
                                className="mr-2 text-blue-600 hover:text-blue-800"
                                title="View apartment details"
                              >
                                <ExternalLink size={16} />
                              </button>
                              <button
                                onClick={() => handleSelectApartment(apt.key)}
                                className="p-1 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                              >
                                <Trash size={16} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Budget Tab */}
          {selectedTab === 'budget' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Channel Selection */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Channel Selection</h3>
                
                <div className="space-y-6">
                  {/* Meta Channel */}
                  <div className={`border rounded-lg p-4 ${formData.channel_meta ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="channel_meta"
                        checked={formData.channel_meta}
                        onChange={() => handleChannelToggle('meta')}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="channel_meta" className="ml-2 text-lg font-medium text-gray-700">
                        Meta
                      </label>
                      <div className="ml-auto">
                        {formData.channel_meta && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            Enabled
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {formData.channel_meta && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_meta"
                            value={formData.budget_meta}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                              invalidFields.budget_meta ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Enter total budget"
                            min="0"
                            step="50"
                            ref={budgetMetaRef}
                          />
                          {invalidFields.budget_meta && (
                            <p className="mt-1 text-xs text-red-500">Budget is required</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_meta_daily"
                            value={formData.budget_meta_daily}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                            placeholder="Calculated automatically"
                            disabled
                          />
                          <p className="mt-1 text-xs text-gray-500">Daily budget is calculated automatically from total budget</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Display Channel */}
                  <div className={`border rounded-lg p-4 ${formData.channel_display ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="channel_display"
                        checked={formData.channel_display}
                        onChange={() => handleChannelToggle('display')}
                        className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                      />
                      <label htmlFor="channel_display" className="ml-2 text-lg font-medium text-gray-700">
                        Display
                      </label>
                      <div className="ml-auto">
                        {formData.channel_display && (
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            Enabled
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {formData.channel_display && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_display"
                            value={formData.budget_display}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 ${
                              invalidFields.budget_display ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Enter total budget"
                            min="0"
                            step="50"
                            ref={budgetDisplayRef}
                          />
                          {invalidFields.budget_display && (
                            <p className="mt-1 text-xs text-red-500">Budget is required</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_display_daily"
                            value={formData.budget_display_daily}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 bg-gray-100"
                            placeholder="Calculated automatically"
                            disabled
                          />
                          <p className="mt-1 text-xs text-gray-500">Daily budget is calculated automatically from total budget</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* PDOOH Channel */}
                  <div className={`border rounded-lg p-4 ${formData.channel_pdooh ? 'border-purple-300 bg-purple-50' : (!screenCount || screenCount.total === 0) ? 'border-gray-200 bg-gray-50 opacity-70' : 'border-gray-200'}`}>
                    <div className="flex items-center mb-4">
                      <input
                        type="checkbox"
                        id="channel_pdooh"
                        checked={formData.channel_pdooh}
                        onChange={() => handleChannelToggle('pdooh')}
                        disabled={!screenCount || screenCount.total === 0}
                        className={`h-5 w-5 ${!screenCount || screenCount.total === 0 ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600'} focus:ring-purple-500 border-gray-300 rounded`}
                      />
                      <label htmlFor="channel_pdooh" className={`ml-2 text-lg font-medium ${!screenCount || screenCount.total === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                        PDOOH (Programmatic Digital Out-of-Home)
                      </label>
                      <div className="ml-auto flex items-center">
                        {formData.channel_pdooh && (
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                            Enabled
                          </span>
                        )}
                        {(!screenCount || screenCount.total === 0) && (
                          <span className="bg-red-100 text-red-800 ml-2 px-2 py-1 rounded-full text-xs font-medium">
                            No screens available
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {formData.channel_pdooh && (
                      <div className="space-y-4 mt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_pdooh"
                            value={formData.budget_pdooh}
                            onChange={handleInputChange}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 ${
                              invalidFields.budget_pdooh ? 'border-red-500 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="Enter total budget"
                            min="0"
                            step="50"
                            ref={budgetPdoohRef}
                          />
                          {invalidFields.budget_pdooh && (
                            <p className="mt-1 text-xs text-red-500">Budget is required</p>
                          )}
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Daily Budget (€)
                          </label>
                          <input
                            type="number"
                            name="budget_pdooh_daily"
                            value={formData.budget_pdooh_daily}
                            onChange={handleInputChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-purple-500 focus:border-purple-500 bg-gray-100"
                            placeholder="Calculated automatically"
                            disabled
                          />
                          <p className="mt-1 text-xs text-gray-500">Daily budget is calculated automatically from total budget</p>
                        </div>

                        <div className="mt-3 bg-purple-50 p-3 rounded-md border border-purple-100">
                          <h5 className="text-sm font-medium text-purple-800 mb-2 flex items-center">
                            <BarChart3 className="w-4 h-4 mr-1" /> Media Screen Statistics
                          </h5>
                          {screenCount && screenCount.total > 0 ? (
                            <div>
                              <p className="text-sm text-purple-700 mb-1">
                                <span className="font-medium">{screenCount.total}</span> screens available in campaign area
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {Object.entries(screenCount.byType || {})
                                  .sort((a, b) => b[1] - a[1])
                                  .slice(0, 3)
                                  .map(([type, count], index) => (
                                    <div 
                                      key={index} 
                                      className="text-xs px-2 py-1 bg-white rounded-full flex items-center"
                                      style={{ borderLeft: `3px solid ${getMarkerColorByType(type)}` }}
                                    >
                                      {type}: {count}
                                    </div>
                                  ))}
                              </div>
                              <div className="mt-2">
                                <button
                                  onClick={() => setMapModalOpen(true)}
                                  className="text-xs text-purple-700 hover:text-purple-900 flex items-center"
                                >
                                  <Maximize2 className="w-3 h-3 mr-1" />
                                  View all screens in larger map
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-red-500">
                              No media screens found within the campaign radius. PDOOH channel is disabled.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {!formData.channel_pdooh && screenCount && screenCount.total > 0 && (
                      <div className="mt-2 text-sm text-gray-500 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>Enable to use {screenCount.total} media screens in campaign radius</span>
                      </div>
                    )}
                    
                    {(!screenCount || screenCount.total === 0) && (
                      <div className="mt-2 text-sm text-red-500 flex items-center">
                        <AlertCircle size={14} className="mr-1" />
                        <span>No media screens found in campaign radius. This channel is disabled.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right Column - Budget Summary */}
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-4">Budget Summary</h3>
                
                {/* Total Budget Card */}
                <div className="bg-white border rounded-lg shadow-sm p-6 mb-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Total Campaign Budget</h4>
                  
                  <div className="space-y-4">
                    {formData.channel_meta && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Meta</span>
                        <div className="text-right">
                          <div className="text-lg font-medium">€{formData.budget_meta ? Math.ceil(parseFloat(formData.budget_meta.toString())).toFixed(0) : '0'}</div>
                          <div className="text-xs text-gray-500">
                            Media spend: €{formData.budget_meta ? Math.ceil(parseFloat(formData.budget_meta.toString()) * budgetSettings.mediaSpendPercentage / 100).toFixed(0) : '0'} 
                            ({budgetSettings.mediaSpendPercentage}%)
                          </div>
                          <div className="text-xs text-gray-500">
                            Est. impressions: {formData.budget_meta ? Math.round((Math.ceil(parseFloat(formData.budget_meta.toString()) * budgetSettings.mediaSpendPercentage / 100)) / budgetSettings.impressionDivisorMeta * budgetSettings.impressionMultiplier).toLocaleString() : '0'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {formData.channel_display && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Display</span>
                        <div className="text-right">
                          <div className="text-lg font-medium">€{formData.budget_display ? Math.ceil(parseFloat(formData.budget_display.toString())).toFixed(0) : '0'}</div>
                          <div className="text-xs text-gray-500">
                            Media spend: €{formData.budget_display ? Math.ceil(parseFloat(formData.budget_display.toString()) * budgetSettings.mediaSpendPercentage / 100).toFixed(0) : '0'} 
                            ({budgetSettings.mediaSpendPercentage}%)
                          </div>
                          <div className="text-xs text-gray-500">
                            Est. impressions: {formData.budget_display ? Math.round((Math.ceil(parseFloat(formData.budget_display.toString()) * budgetSettings.mediaSpendPercentage / 100)) / budgetSettings.impressionDivisorDisplay * budgetSettings.impressionMultiplier).toLocaleString() : '0'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {formData.channel_pdooh && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">PDOOH</span>
                        <div className="text-right">
                          <div className="text-lg font-medium">€{formData.budget_pdooh ? Math.ceil(parseFloat(formData.budget_pdooh.toString())).toFixed(0) : '0'}</div>
                          <div className="text-xs text-gray-500">
                            Media spend: €{formData.budget_pdooh ? Math.ceil(parseFloat(formData.budget_pdooh.toString()) * budgetSettings.mediaSpendPercentage / 100).toFixed(0) : '0'} 
                            ({budgetSettings.mediaSpendPercentage}%)
                          </div>
                          <div className="text-xs text-gray-500">
                            Est. impressions: {formData.budget_pdooh ? Math.round((Math.ceil(parseFloat(formData.budget_pdooh.toString()) * budgetSettings.mediaSpendPercentage / 100)) / budgetSettings.impressionDivisorPdooh * budgetSettings.impressionMultiplier).toLocaleString() : '0'}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-800 font-medium">Total Budget</span>
                      <div className="text-right">
                        <span className="text-2xl font-bold text-purple-700">
                          €{(
                            (formData.channel_meta ? (formData.budget_meta ? Math.ceil(parseFloat(formData.budget_meta.toString())) : 0) : 0) +
                            (formData.channel_display ? (formData.budget_display ? Math.ceil(parseFloat(formData.budget_display.toString())) : 0) : 0) +
                            (formData.channel_pdooh ? (formData.budget_pdooh ? Math.ceil(parseFloat(formData.budget_pdooh.toString())) : 0) : 0)
                          ).toFixed(0)}
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          Total media spend: €{(
                            (formData.channel_meta ? (formData.budget_meta ? Math.ceil(parseFloat(formData.budget_meta.toString()) * budgetSettings.mediaSpendPercentage / 100) : 0) : 0) +
                            (formData.channel_display ? (formData.budget_display ? Math.ceil(parseFloat(formData.budget_display.toString()) * budgetSettings.mediaSpendPercentage / 100) : 0) : 0) +
                            (formData.channel_pdooh ? (formData.budget_pdooh ? Math.ceil(parseFloat(formData.budget_pdooh.toString()) * budgetSettings.mediaSpendPercentage / 100) : 0) : 0)
                          ).toFixed(0)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Daily Budget Card */}
                <div className="bg-white border rounded-lg shadow-sm p-6">
                  <h4 className="text-xl font-semibold text-gray-800 mb-4">Daily Budget</h4>
                  
                  <div className="space-y-4">
                    {formData.channel_meta && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Meta</span>
                        <span className="text-lg font-medium">€{formData.budget_meta_daily.toFixed(0)}</span>
                      </div>
                    )}
                    
                    {formData.channel_display && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">Display</span>
                        <span className="text-lg font-medium">€{formData.budget_display_daily.toFixed(0)}</span>
                      </div>
                    )}
                    
                    {formData.channel_pdooh && (
                      <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                        <span className="text-gray-600">PDOOH</span>
                        <span className="text-lg font-medium">€{formData.budget_pdooh_daily.toFixed(0)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-gray-800 font-medium">Total Daily Budget</span>
                      <span className="text-2xl font-bold text-purple-700">
                        €{(
                          (formData.channel_meta ? formData.budget_meta_daily : 0) +
                          (formData.channel_display ? formData.budget_display_daily : 0) +
                          (formData.channel_pdooh ? formData.budget_pdooh_daily : 0)
                        ).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* BidTheatre and Creatopy integrations for admins only */}
                {isAdmin && (
                  <div className="mt-6 bg-gray-50 border rounded-lg p-4">
                    <h4 className="font-medium text-gray-700 mb-2">Integration Status</h4>
                    
                    {(formData.channel_display || formData.channel_pdooh) && (
                      <div className="text-sm text-gray-600">
                        <p>
                          BidTheatre integration is {(campaign?.display_bt_id || campaign?.pdooh_bt_id) ? 'active' : 'pending'}.
                          {campaign?.display_bt_id && (
                            <span className="text-green-600 font-medium ml-1">
                              Display Campaign ID: {campaign.display_bt_id}
                            </span>
                          )}
                          {campaign?.pdooh_bt_id && (
                            <span className="text-green-600 font-medium ml-1">
                              PDOOH Campaign ID: {campaign.pdooh_bt_id}
                            </span>
                          )}
                        </p>
                        <p className="mt-1">
                          Creatopy ad tags will be {campaign?.cr_ad_tags ? 'updated' : 'generated'} after saving.
                        </p>
                      </div>
                    )}
                    
                    {!formData.channel_display && !formData.channel_pdooh && (
                      <p className="text-sm text-gray-500">
                        BidTheatre and Creatopy integrations are only available for Display or PDOOH channels.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-between p-6 border-t">
          <div>
            {selectedTab !== 'info' && (
              <button
                onClick={() => handleNavigateTabs('prev')}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft size={18} className="mr-2" />
                Previous
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            
            {selectedTab === 'budget' ? (
              <div className="relative">
                {!saveInProgress ? (
                  <button
                    onClick={handleSaveCampaign}
                    disabled={!isFormValid}
                    className={`px-4 py-2 rounded-md transition-colors ${
                      !isFormValid
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-purple-700 text-white hover:bg-purple-800'
                    }`}
                  >
                    {campaign ? 'Update Campaign' : 'Create Campaign'}
                  </button>
                ) : (
                  <button 
                    className="px-4 py-2 rounded-md bg-gray-400 text-white cursor-not-allowed"
                    disabled={true}
                  >
                    <span className="flex items-center">
                      <RefreshCw size={16} className="animate-spin mr-2" />
                      {campaign ? 'Updating...' : 'Creating...'}
                    </span>
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => handleNavigateTabs('next')}
                className="flex items-center px-4 py-2 bg-purple-700 text-white rounded-md hover:bg-purple-800"
              >
                Next
                <ChevronRight size={18} className="ml-2" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignModal;