import { getBidTheatreToken, getBidTheatreCredentials } from './bidTheatre';
import { supabase } from './supabase';
import axios from 'axios';

export interface MediaScreen {
  id: number;
  site_url: string;
  rtb_supplier_name: string;
  site_type: string;
  daily_request: number;
  floor_cpm: number | null;
  avg_cpm: number | null;
  dimensions: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  network_id: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/**
 * Enhanced extraction of coordinates from site URL
 * Uses multiple patterns and techniques to find coordinates in text
 */
export function extractCoordinatesFromSiteURL(siteURL: string): { latitude: number | null; longitude: number | null } {
  try {
    // First pattern: direct coordinate patterns like "60.123456, 24.123456"
    const coordPattern = /(\d+\.\d+)[,\s]+(\d+\.\d+)/;
    const match = siteURL.match(coordPattern);
    
    if (match && match.length >= 3) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (!isNaN(lat) && !isNaN(lng) && isValidCoordinate(lat, lng)) {
        return { latitude: lat, longitude: lng };
      }
    }
    
    // Second attempt: Try to find location-specific patterns
    // Map of all Finnish cities with their approximate coordinates
    const locationMap: Record<string, [number, number]> = {
      'Akaa': [61.1684, 23.8681],
      'Alajärvi': [63.0000, 23.8167],
      'Alavieska': [64.1667, 24.3000],
      'Alavus': [62.5833, 23.6167],
      'Asikkala': [61.1667, 25.5000],
      'Askola': [60.5318, 25.5969],
      'Aura': [60.6500, 22.5833],
      'Brändö': [60.4124, 21.0401],
      'Eckerö': [60.2227, 19.5828],
      'Enonkoski': [62.0833, 28.9333],
      'Enontekiö': [68.3833, 23.6333],
      'Espoo': [60.2055, 24.6559],
      'Eura': [61.1333, 22.1333],
      'Eurajoki': [61.2000, 21.7333],
      'Evijärvi': [63.3667, 23.4833],
      'Finström': [60.2333, 19.9833],
      'Forssa': [60.8153, 23.6219],
      'Föglö': [60.0283, 20.3866],
      'Geta': [60.3750, 19.8472],
      'Haapajärvi': [63.7500, 25.3167],
      'Haapavesi': [64.1375, 25.3662],
      'Hailuoto': [65.0167, 24.7167],
      'Halsua': [63.4667, 24.1667],
      'Hamina': [60.5697, 27.1941],
      'Hammarland': [60.2239, 19.7447],
      'Hankasalmi': [62.3894, 26.4439],
      'Hanko': [59.8236, 22.9728],
      'Harjavalta': [61.3131, 22.1436],
      'Hartola': [61.5833, 26.0167],
      'Hattula': [61.0556, 24.3694],
      'Hausjärvi': [60.7833, 25.0167],
      'Heinola': [61.2056, 26.0306],
      'Heinävesi': [62.4250, 28.6333],
      'Helsinki': [60.1699, 24.9384],
      'Hirvensalmi': [61.6403, 26.7781],
      'Hollola': [61.0500, 25.5000],
      'Huittinen': [61.1778, 22.7000],
      'Humppila': [60.9333, 23.3667],
      'Hyrynsalmi': [64.6773, 28.4904],
      'Hyvinkää': [60.6296, 24.8584],
      'Hämeenkyrö': [61.6333, 23.2000],
      'Hämeenlinna': [60.9957, 24.4644],
      'Ii': [65.3167, 25.3667],
      'Iisalmi': [63.5592, 27.1911],
      'Iitti': [60.8927, 26.3385],
      'Ikaalinen': [61.7694, 23.0722],
      'Ilmajoki': [62.7333, 22.5667],
      'Ilomantsi': [62.6672, 30.9347],
      'Imatra': [61.1722, 28.7722],
      'Inari': [68.9061, 27.0278],
      'Inkoo': [60.0434, 24.0049],
      'Isojoki': [62.1136, 21.9572],
      'Isokyrö': [62.9992, 22.3178],
      'Janakkala': [60.9167, 24.6500],
      'Joensuu': [62.6010, 29.7636],
      'Jokioinen': [60.8038, 23.4871],
      'Jomala': [60.1553, 19.9449],
      'Joroinen': [62.1778, 27.8306],
      'Joutsa': [61.7417, 26.1139],
      'Juuka': [63.2439, 29.2544],
      'Juupajoki': [61.8000, 24.3667],
      'Juva': [61.8978, 27.8564],
      'Jyväskylä': [62.2426, 25.7473],
      'Jämijärvi': [61.8239, 22.6926],
      'Jämsä': [61.8639, 25.1904],
      'Järvenpää': [60.4733, 25.0891],
      'Kaarina': [60.4072, 22.3736],
      'Kaavi': [62.9745, 28.4983],
      'Kajaani': [64.2275, 27.7285],
      'Kalajoki': [64.2614, 23.9481],
      'Kangasala': [61.4639, 24.0694],
      'Kangasniemi': [61.9903, 26.6461],
      'Kankaanpää': [61.8000, 22.4148],
      'Kannonkoski': [62.9774, 25.2624],
      'Kannus': [63.9000, 23.9000],
      'Karijoki': [62.3094, 21.7084],
      'Karkkila': [60.5348, 24.2095],
      'Karstula': [62.8783, 24.8011],
      'Karvia': [62.1345, 22.5660],
      'Kaskinen': [62.3833, 21.2167],
      'Kauhajoki': [62.4333, 22.1833],
      'Kauhava': [63.1333, 23.0667],
      'Kauniainen': [60.2121, 24.7285],
      'Kaustinen': [63.5486, 23.6995],
      'Keitele': [63.1786, 26.3378],
      'Kemi': [65.7356, 24.5657],
      'Kemijärvi': [66.7139, 27.4294],
      'Keminmaa': [65.8000, 24.8167],
      'Kemiönsaari': [60.1694, 22.7292],
      'Kempele': [64.9131, 25.5034],
      'Kerava': [60.4028, 25.1046],
      'Keuruu': [62.2667, 24.7000],
      'Kihniö': [62.2089, 23.1764],
      'Kinnula': [63.3667, 24.9667],
      'Kirkkonummi': [60.1233, 24.4417],
      'Kitee': [62.0992, 30.1417],
      'Kittilä': [67.6535, 24.9114],
      'Kiuruvesi': [63.6482, 26.6129],
      'Kivijärvi': [63.1204, 25.0763],
      'Kokemäki': [61.2567, 22.3564],
      'Kokkola': [63.8376, 23.1321],
      'Kolari': [67.3314, 23.7808],
      'Konnevesi': [62.6253, 26.2938],
      'Kontiolahti': [62.7667, 29.8500],
      'Korsnäs': [62.7833, 21.1833],
      'Koski Tl': [60.6564, 23.1426],
      'Kotka': [60.4665, 26.9459],
      'Kouvola': [60.8699, 26.7042],
      'Kristiinankaupunki': [62.2724, 21.3749],
      'Kruunupyy': [63.7290, 23.0420],
      'Kuhmo': [64.1264, 29.5170],
      'Kuhmoinen': [61.5636, 25.1824],
      'Kumlinge': [60.2604, 20.7519],
      'Kuopio': [62.8924, 27.6782],
      'Kuortane': [62.8000, 23.5167],
      'Kurikka': [62.6167, 22.4000],
      'Kustavi': [60.5453, 21.3594],
      'Kuusamo': [65.9667, 29.1667],
      'Kyyjärvi': [63.0404, 24.5450],
      'Kärkölä': [60.9667, 25.2667],
      'Kärsämäki': [63.9811, 25.7598],
      'Kökar': [59.9204, 20.9075],
      'Lahti': [60.9827, 25.6612],
      'Laihia': [62.9764, 22.0114],
      'Laitila': [60.8778, 21.6972],
      'Lapinjärvi': [60.6244, 26.2225],
      'Lapinlahti': [63.3667, 27.4000],
      'Lappajärvi': [63.2167, 23.6333],
      'Lappeenranta': [61.0587, 28.1872],
      'Lapua': [62.9719, 23.0094],
      'Laukaa': [62.4141, 25.9520],
      'Lemi': [61.0619, 27.8033],
      'Lemland': [60.0752, 20.0991],
      'Lempäälä': [61.3139, 23.7522],
      'Leppävirta': [62.4904, 27.7878],
      'Lestijärvi': [63.5209, 24.6734],
      'Lieksa': [63.3167, 30.0167],
      'Lieto': [60.5083, 22.4611],
      'Liminka': [64.8097, 25.4153],
      'Liperi': [62.5310, 29.3694],
      'Lohja': [60.2481, 24.0684],
      'Loimaa': [60.8514, 23.0533],
      'Loppi': [60.7167, 24.4500],
      'Loviisa': [60.4570, 26.2256],
      'Luhanka': [61.7964, 25.6997],
      'Lumijoki': [64.8375, 25.1867],
      'Lumparland': [60.1168, 20.2564],
      'Luoto': [63.7097, 22.7567],
      'Luumäki': [60.9214, 27.5758],
      'Maalahti': [62.9465, 21.5500],
      'Maarianhamina': [60.0972, 19.9386],
      'Marttila': [60.5833, 22.9000],
      'Masku': [60.5713, 22.0965],
      'Merijärvi': [64.2967, 24.4467],
      'Merikarvia': [61.8589, 21.5000],
      'Miehikkälä': [60.6667, 27.7000],
      'Mikkeli': [61.6885, 27.2721],
      'Muhos': [64.8081, 25.9939],
      'Multia': [62.4105, 24.7951],
      'Muonio': [67.9611, 23.6819],
      'Mustasaari': [63.1225, 21.6846],
      'Muurame': [62.1306, 25.6708],
      'Mynämäki': [60.6778, 22.1736],
      'Myrskylä': [60.6667, 25.8500],
      'Mäntsälä': [60.6347, 25.3192],
      'Mänttä-Vilppula': [62.0310, 24.6237],
      'Mäntyharju': [61.4167, 26.8833],
      'Naantali': [60.4681, 22.0261],
      'Nakkila': [61.3667, 22.0000],
      'Nivala': [63.9167, 24.9667],
      'Nokia': [61.4667, 23.5000],
      'Nousiainen': [60.5967, 22.0817],
      'Nurmes': [63.5417, 29.1333],
      'Nurmijärvi': [60.4639, 24.8069],
      'Närpiö': [62.4737, 21.3367],
      'Orimattila': [60.8042, 25.7297],
      'Oripää': [60.8573, 22.6867],
      'Orivesi': [61.6778, 24.3578],
      'Oulainen': [64.2675, 24.8204],
      'Oulu': [65.0124, 25.4682],
      'Outokumpu': [62.7269, 28.9929],
      'Padasjoki': [61.3500, 25.2833],
      'Paimio': [60.4572, 22.6875],
      'Paltamo': [64.4053, 27.8400],
      'Parainen': [60.3014, 22.3014],
      'Parikkala': [61.5500, 29.5000],
      'Parkano': [62.0105, 23.0192],
      'Pedersöre': [63.6000, 22.8000],
      'Pelkosenniemi': [67.1092, 27.5120],
      'Pello': [66.7756, 23.9569],
      'Perho': [63.2167, 24.4167],
      'Pertunmaa': [61.5077, 26.4733],
      'Petäjävesi': [62.2500, 25.1833],
      'Pieksämäki': [62.3000, 27.1667],
      'Pielavesi': [63.2331, 26.7597],
      'Pietarsaari': [63.6748, 22.7142],
      'Pihtipudas': [63.3669, 25.5743],
      'Pirkkala': [61.4640, 23.6394],
      'Polvijärvi': [62.8504, 29.3698],
      'Pomarkku': [61.6946, 22.0061],
      'Pori': [61.4851, 21.7974],
      'Pornainen': [60.4757, 25.3739],
      'Porvoo': [60.3975, 25.6646],
      'Posio': [66.1092, 28.1719],
      'Pudasjärvi': [65.3792, 26.9904],
      'Pukkila': [60.6453, 25.5839],
      'Punkalaidun': [61.1130, 23.1040],
      'Puolanka': [64.8680, 27.6766],
      'Puumala': [61.5248, 28.1739],
      'Pyhtää': [60.4887, 26.5434],
      'Pyhäjoki': [64.4667, 24.2606],
      'Pyhäjärvi': [63.6685, 25.8307],
      'Pyhäntä': [64.1000, 26.3167],
      'Pyhäranta': [60.9497, 21.4457],
      'Pälkäne': [61.3394, 24.2717],
      'Pöytyä': [60.7203, 22.6542],
      'Raahe': [64.6828, 24.4783],
      'Raasepori': [59.9747, 23.6354],
      'Raisio': [60.4860, 22.1696],
      'Rantasalmi': [62.0667, 28.3036],
      'Ranua': [65.9292, 26.5150],
      'Rauma': [61.1274, 21.5059],
      'Rautalampi': [62.6225, 26.8306],
      'Rautavaara': [63.4945, 28.2982],
      'Rautjärvi': [61.4288, 29.3494],
      'Reisjärvi': [63.6044, 24.9386],
      'Riihimäki': [60.7385, 24.7753],
      'Ristijärvi': [64.5046, 28.2141],
      'Rovaniemi': [66.5039, 25.7294],
      'Ruokolahti': [61.2881, 28.8252],
      'Ruovesi': [61.9846, 24.0669],
      'Rusko': [60.5428, 22.2231],
      'Rääkkylä': [62.3139, 29.6244],
      'Saarijärvi': [62.7092, 25.2567],
      'Salla': [66.8325, 28.6692],
      'Salo': [60.3833, 23.1333],
      'Saltvik': [60.2741, 20.0614],
      'Sastamala': [61.3492, 22.9141],
      'Sauvo': [60.3428, 22.6944],
      'Savitaipale': [61.1958, 27.6932],
      'Savonlinna': [61.8713, 28.8809],
      'Savukoski': [67.2919, 28.1672],
      'Seinäjoki': [62.7876, 22.8400],
      'Sievi': [63.9069, 24.5153],
      'Siikainen': [61.8763, 21.8166],
      'Siikajoki': [64.8150, 24.7633],
      'Siikalatva': [64.2667, 25.8667],
      'Siilinjärvi': [63.0772, 27.6586],
      'Simo': [65.6600, 25.0600],
      'Sipoo': [60.3764, 25.2610],
      'Siuntio': [60.1389, 24.2250],
      'Sodankylä': [67.4167, 26.6000],
      'Soini': [62.8713, 24.2077],
      'Somero': [60.6156, 23.5314],
      'Sonkajärvi': [63.6711, 27.5227],
      'Sotkamo': [64.1333, 28.4167],
      'Sottunga': [60.1208, 20.6781],
      'Sulkava': [61.7858, 28.3733],
      'Sund': [60.1975, 20.1884],
      'Suomussalmi': [64.8861, 28.9069],
      'Suonenjoki': [62.6167, 27.1333],
      'Sysmä': [61.5022, 25.6856],
      'Säkylä': [61.0464, 22.3458],
      'Taipalsaari': [61.1500, 28.0667],
      'Taivalkoski': [65.5752, 28.2463],
      'Taivassalo': [60.5603, 21.6128],
      'Tammela': [60.8103, 23.7669],
      'Tampere': [61.4978, 23.7610],
      'Tervo': [62.9560, 26.7558],
      'Tervola': [66.0844, 24.8120],
      'Teuva': [62.4856, 21.7417],
      'Tohmajärvi': [62.2236, 30.3320],
      'Toholampi': [63.7661, 24.2507],
      'Toivakka': [62.1000, 26.0833],
      'Tornio': [65.8481, 24.1467],
      'Turku': [60.4518, 22.2666],
      'Tuusniemi': [62.8111, 28.4889],
      'Tuusula': [60.4042, 25.0206],
      'Tyrnävä': [64.7653, 25.6531],
      'Ulvila': [61.4283, 21.8706],
      'Urjala': [61.0833, 23.5500],
      'Utajärvi': [64.7500, 26.4167],
      'Utsjoki': [69.9083, 27.0294],
      'Uurainen': [62.5000, 25.4500],
      'Uusikaarlepyy': [63.5209, 22.5308],
      'Uusikaupunki': [60.8000, 21.4167],
      'Vaala': [64.5594, 26.8219],
      'Vaasa': [63.0957, 21.6261],
      'Valkeakoski': [61.2639, 24.0311],
      'Vantaa': [60.3018, 25.0401],
      'Varkaus': [62.3167, 27.9167],
      'Vehmaa': [60.6833, 21.6667],
      'Vesanto': [62.9303, 26.4093],
      'Vesilahti': [61.3069, 23.6158],
      'Veteli': [63.4784, 23.7917],
      'Vieremä': [63.7433, 27.0035],
      'Vihti': [60.4167, 24.3333],
      'Viitasaari': [63.0731, 25.8565],
      'Vimpeli': [63.1608, 23.8266],
      'Virolahti': [60.5933, 27.7003],
      'Virrat': [62.2485, 23.7683],
      'Vårdö': [60.2431, 20.3742],
      'Vöyri': [63.1333, 22.2500],
      'Ylitornio': [66.3120, 23.6674],
      'Ylivieska': [64.0800, 24.5400],
      'Ylöjärvi': [61.5500, 23.5981],
      'Ypäjä': [60.8058, 23.2911],
      'Ähtäri': [62.5539, 24.0626],
      'Äänekoski': [62.5994, 25.7249],
      'Kamppi': [60.1690, 24.9324] // Added Kamppi as it's a frequent location in Helsinki
    };
    
    // Try to match known locations
    for (const [location, coords] of Object.entries(locationMap)) {
      if (siteURL.includes(location)) {
        // Add slight randomization for visual dispersion
        const jitter = 0.01; // About 1km
        const randomLat = coords[0] + (Math.random() - 0.5) * jitter;
        const randomLng = coords[1] + (Math.random() - 0.5) * jitter;
        return { latitude: randomLat, longitude: randomLng };
      }
    }
    
    // Default to central Helsinki area if we can't find coordinates
    const defaultLat = 60.1699 + (Math.random() - 0.5) * 0.03; // ~1.5km radius jitter
    const defaultLng = 24.9384 + (Math.random() - 0.5) * 0.03;
    return { latitude: defaultLat, longitude: defaultLng };
  } catch (error) {
    console.error('Error extracting coordinates:', error);
    // Default to Helsinki with some randomness
    return { 
      latitude: 60.1699 + (Math.random() - 0.5) * 0.02,
      longitude: 24.9384 + (Math.random() - 0.5) * 0.02
    };
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // in meters
}

/**
 * Count screens within a specified radius from a location
 * @param lat Center point latitude
 * @param lng Center point longitude
 * @param radius Radius in meters
 * @returns Promise with count and breakdown by screen type
 */
export async function countScreensInRadius(lat: number, lng: number, radius: number): Promise<{
  total: number;
  byType: Record<string, number>;
  screensInRadius: MediaScreen[];
}> {
  try {
    // Get all screens
    const { data, error } = await supabase
      .from('media_screens')
      .select('*')
      .eq('status', 'active');
      
    if (error) throw error;
    
    if (!data) {
      return { 
        total: 0, 
        byType: {}, 
        screensInRadius: [] 
      };
    }

    // Filter screens that are within the radius
    const screensInRadius = data.filter(screen => {
      // Skip screens without coordinates
      if (!screen.latitude || !screen.longitude) return false;
      
      // Calculate distance
      const distance = calculateDistance(
        lat, 
        lng, 
        screen.latitude, 
        screen.longitude
      );
      
      // Check if within radius
      return distance <= radius;
    });
    
    // Count screens by type
    const byType: Record<string, number> = {};
    
    screensInRadius.forEach(screen => {
      const type = screen.site_type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;
    });
    
    return {
      total: screensInRadius.length,
      byType,
      screensInRadius
    };
  } catch (error) {
    console.error('Error counting screens in radius:', error);
    return { 
      total: 0, 
      byType: {}, 
      screensInRadius: [] 
    };
  }
}

/**
 * Check if the coordinates are valid (in Finland)
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  // Finland's approximate bounding box
  const minLat = 59.5;
  const maxLat = 70.0;
  const minLng = 19.0;
  const maxLng = 32.0;
  
  return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
}

/**
 * Extract location name from a site URL
 */
export function extractLocationFromSiteURL(siteURL: string): string | null {
  try {
    // Format is typically "Location - Address, City (additional info)"
    const parts = siteURL.split(' - ');
    if (parts.length > 0) {
      return parts[0] || null;
    }
    return null;
  } catch (error) {
    console.error('Error extracting location:', error);
    return null;
  }
}

/**
 * Extract city from a site URL by checking for all Finnish city names
 */
export function extractCityFromSiteURL(siteURL: string): string | null {
  try {
    // List of all Finnish cities to check against
    const finnishCities = [
      'Akaa', 'Alajärvi', 'Alavieska', 'Alavus', 'Asikkala', 'Askola', 'Aura',
      'Brändö', 'Eckerö', 'Enonkoski', 'Enontekiö', 'Espoo', 'Eura', 'Eurajoki',
      'Evijärvi', 'Finström', 'Forssa', 'Föglö', 'Geta', 'Haapajärvi', 'Haapavesi',
      'Hailuoto', 'Halsua', 'Hamina', 'Hammarland', 'Hankasalmi', 'Hanko',
      'Harjavalta', 'Hartola', 'Hattula', 'Hausjärvi', 'Heinola', 'Heinävesi',
      'Helsinki', 'Hirvensalmi', 'Hollola', 'Huittinen', 'Humppila', 'Hyrynsalmi',
      'Hyvinkää', 'Hämeenkyrö', 'Hämeenlinna', 'Ii', 'Iisalmi', 'Iitti', 'Ikaalinen',
      'Ilmajoki', 'Ilomantsi', 'Imatra', 'Inari', 'Inkoo', 'Isojoki', 'Isokyrö',
      'Janakkala', 'Joensuu', 'Jokioinen', 'Jomala', 'Joroinen', 'Joutsa', 'Juuka',
      'Juupajoki', 'Juva', 'Jyväskylä', 'Jämijärvi', 'Jämsä', 'Järvenpää', 'Kaarina',
      'Kaavi', 'Kajaani', 'Kalajoki', 'Kangasala', 'Kangasniemi', 'Kankaanpää',
      'Kannonkoski', 'Kannus', 'Karijoki', 'Karkkila', 'Karstula', 'Karvia', 'Kaskinen',
      'Kauhajoki', 'Kauhava', 'Kauniainen', 'Kaustinen', 'Keitele', 'Kemi', 'Kemijärvi',
      'Keminmaa', 'Kemiönsaari', 'Kempele', 'Kerava', 'Keuruu', 'Kihniö', 'Kinnula',
      'Kirkkonummi', 'Kitee', 'Kittilä', 'Kiuruvesi', 'Kivijärvi', 'Kokemäki', 'Kokkola',
      'Kolari', 'Konnevesi', 'Kontiolahti', 'Korsnäs', 'Koski Tl', 'Kotka', 'Kouvola',
      'Kristiinankaupunki', 'Kruunupyy', 'Kuhmo', 'Kuhmoinen', 'Kumlinge', 'Kuopio',
      'Kuortane', 'Kurikka', 'Kustavi', 'Kuusamo', 'Kyyjärvi', 'Kärkölä', 'Kärsämäki',
      'Kökar', 'Lahti', 'Laihia', 'Laitila', 'Lapinjärvi', 'Lapinlahti', 'Lappajärvi',
      'Lappeenranta', 'Lapua', 'Laukaa', 'Lemi', 'Lemland', 'Lempäälä', 'Leppävirta',
      'Lestijärvi', 'Lieksa', 'Lieto', 'Liminka', 'Liperi', 'Lohja', 'Loimaa', 'Loppi',
      'Loviisa', 'Luhanka', 'Lumijoki', 'Lumparland', 'Luoto', 'Luumäki', 'Maalahti',
      'Maarianhamina', 'Mariehamn', 'Marttila', 'Masku', 'Merijärvi', 'Merikarvia',
      'Miehikkälä', 'Mikkeli', 'Muhos', 'Multia', 'Muonio', 'Mustasaari', 'Muurame',
      'Mynämäki', 'Myrskylä', 'Mäntsälä', 'Mänttä-Vilppula', 'Mäntyharju', 'Naantali',
      'Nakkila', 'Nivala', 'Nokia', 'Nousiainen', 'Nurmes', 'Nurmijärvi', 'Närpiö',
      'Orimattila', 'Oripää', 'Orivesi', 'Oulainen', 'Oulu', 'Outokumpu', 'Padasjoki',
      'Paimio', 'Paltamo', 'Parainen', 'Parikkala', 'Parkano', 'Pedersöre', 'Pelkosenniemi',
      'Pello', 'Perho', 'Pertunmaa', 'Petäjävesi', 'Pieksämäki', 'Pielavesi', 'Pietarsaari',
      'Pihtipudas', 'Pirkkala', 'Polvijärvi', 'Pomarkku', 'Pori', 'Pornainen', 'Porvoo',
      'Posio', 'Pudasjärvi', 'Pukkila', 'Punkalaidun', 'Puolanka', 'Puumala', 'Pyhtää',
      'Pyhäjoki', 'Pyhäjärvi', 'Pyhäntä', 'Pyhäranta', 'Pälkäne', 'Pöytyä', 'Raahe',
      'Raasepori', 'Raisio', 'Rantasalmi', 'Ranua', 'Rauma', 'Rautalampi', 'Rautavaara',
      'Rautjärvi', 'Reisjärvi', 'Riihimäki', 'Ristijärvi', 'Rovaniemi', 'Ruokolahti',
      'Ruovesi', 'Rusko', 'Rääkkylä', 'Saarijärvi', 'Salla', 'Salo', 'Saltvik', 'Sastamala',
      'Sauvo', 'Savitaipale', 'Savonlinna', 'Savukoski', 'Seinäjoki', 'Sievi', 'Siikainen',
      'Siikajoki', 'Siikalatva', 'Siilinjärvi', 'Simo', 'Sipoo', 'Siuntio', 'Sodankylä',
      'Soini', 'Somero', 'Sonkajärvi', 'Sotkamo', 'Sottunga', 'Sulkava', 'Sund', 'Suomussalmi',
      'Suonenjoki', 'Sysmä', 'Säkylä', 'Taipalsaari', 'Taivalkoski', 'Taivassalo', 'Tammela',
      'Tampere', 'Tervo', 'Tervola', 'Teuva', 'Tohmajärvi', 'Toholampi', 'Toivakka', 'Tornio',
      'Turku', 'Tuusniemi', 'Tuusula', 'Tyrnävä', 'Ulvila', 'Urjala', 'Utajärvi', 'Utsjoki',
      'Uurainen', 'Uusikaarlepyy', 'Uusikaupunki', 'Vaala', 'Vaasa', 'Valkeakoski', 'Vantaa',
      'Varkaus', 'Vehmaa', 'Vesanto', 'Vesilahti', 'Veteli', 'Vieremä', 'Vihti', 'Viitasaari',
      'Vimpeli', 'Virolahti', 'Virrat', 'Vårdö', 'Vöyri', 'Ylitornio', 'Ylivieska', 'Ylöjärvi',
      'Ypäjä', 'Ähtäri', 'Äänekoski', 'Kamppi'
    ];
    
    // Normalize the site URL for comparison
    const normalizedSiteURL = siteURL.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // First check for exact city names
    for (const city of finnishCities) {
      // Create a case-insensitive regex pattern with word boundary
      const pattern = new RegExp(`\\b${city}\\b`, 'i');
      
      if (pattern.test(normalizedSiteURL)) {
        return city;
      }
      
      // Also check for normalized version (without diacritics)
      const normalizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normalizedPattern = new RegExp(`\\b${normalizedCity}\\b`, 'i');
      
      if (normalizedPattern.test(normalizedSiteURL)) {
        return city;
      }
    }
    
    // If no city was found and there's a parenthesized part, try to extract city from there
    const parenthesesMatch = siteURL.match(/\((.*?)\)/);
    if (parenthesesMatch && parenthesesMatch[1]) {
      const innerText = parenthesesMatch[1];
      
      for (const city of finnishCities) {
        if (innerText.includes(city)) {
          return city;
        }
      }
      
      // If no direct match in parentheses, check for comma-separated address
      const parts = innerText.split(',');
      if (parts.length > 1) {
        const potentialCity = parts[1].trim();
        
        // See if any city name is close to the potential city
        for (const city of finnishCities) {
          if (potentialCity.includes(city) || city.includes(potentialCity)) {
            return city;
          }
        }
      }
    }
    
    // If we still haven't found a city, try extracting from address format (part after hyphen)
    const parts = siteURL.split(' - ');
    if (parts.length > 1) {
      const addressPart = parts[1];
      const addressParts = addressPart.split(',');
      
      if (addressParts.length > 1) {
        const potentialCity = addressParts[1].trim();
        
        // Check if this part matches any city
        for (const city of finnishCities) {
          if (potentialCity.includes(city) || city.includes(potentialCity)) {
            return city;
          }
        }
      }
    }
    
    // Return null if no city was found
    return null;
  } catch (error) {
    console.error('Error extracting city:', error);
    return null;
  }
}

/**
 * Extract dimensions from a site URL
 */
export function extractDimensionsFromSiteURL(siteURL: string): string | null {
  try {
    // Look for dimensions in parentheses, typically last part after " - "
    const parenthesesMatch = siteURL.match(/\((.*?)\)/);
    if (parenthesesMatch && parenthesesMatch[1]) {
      const parts = parenthesesMatch[1].split(' - ');
      if (parts.length >= 3) {
        return parts[2] || null;
      }
    }
    
    // Look for common dimension patterns like 1080x1920
    const dimensionPattern = /(\d+)x(\d+)/;
    const match = siteURL.match(dimensionPattern);
    if (match && match[0]) {
      return match[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error extracting dimensions:', error);
    return null;
  }
}

/**
 * Fetch media screens from BidTheatre API with pagination support
 */
export async function fetchMediaScreensByCity(city: string = ''): Promise<MediaScreen[]> {
  try {
    const token = await getBidTheatreToken();
    if (!token) {
      throw new Error('Failed to obtain BidTheatre authentication token');
    }
    
    const credentials = await getBidTheatreCredentials();
    const networkId = credentials.network_id;
    
    // Prepare for pagination
    let allSites: any[] = [];
    let offset = 0;
    const limit = 100;
    let hasMorePages = true;
    
    // Fetch all pages
    while (hasMorePages) {
      console.log(`Fetching screens page with offset ${offset}...`);
      
      // If city is empty, fetch all DOOH sites in Finland without city filter
      // If city is specified, use it as a filter
      const url = city 
        ? `https://asx-api.bidtheatre.com/v2.0/api/${networkId}/rtb-site?siteType=dooh&siteURL=${encodeURIComponent(city)}&limit=${limit}&offset=${offset}`
        : `https://asx-api.bidtheatre.com/v2.0/api/${networkId}/rtb-site?siteType=dooh&limit=${limit}&offset=${offset}`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        withCredentials: true
      });
      
      if (!response.data) {
        break;
      }
      
      let currentPageSites: any[] = [];
      let totalCount = 0;
      
      // Extract sites and pagination info
      if (response.data.rtbSites && Array.isArray(response.data.rtbSites)) {
        currentPageSites = response.data.rtbSites;
        if (response.data.pagination?.totalRowCount) {
          totalCount = response.data.pagination.totalRowCount;
        }
      } else if (Array.isArray(response.data)) {
        currentPageSites = response.data;
      } else if (response.data.id) {
        // Single site response
        currentPageSites = [response.data];
      }
      
      // Filter out pagination metadata objects
      currentPageSites = currentPageSites.filter(site => {
        return site && typeof site === 'object' && !site.rtbSites && !site.apiVersion;
      });
      
      console.log(`Found ${currentPageSites.length} sites on this page`);
      allSites = [...allSites, ...currentPageSites];
      
      // Check if we've reached the end
      offset += limit;
      if (currentPageSites.length < limit || (totalCount > 0 && offset >= totalCount)) {
        hasMorePages = false;
      }
      
      // Safety limit to prevent infinite loops (fetch max 2000 sites)
      if (offset >= 2000) {
        hasMorePages = false;
      }
    }
    
    console.log(`Total sites fetched: ${allSites.length}`);
    
    return allSites.map(site => {
      // Ensure the site has a valid ID
      if (!site.id) {
        site.id = generateFallbackId(site);
      }
      
      const coordinates = extractCoordinatesFromSiteURL(site.siteURL || '');
      const location = extractLocationFromSiteURL(site.siteURL || '');
      const dimensions = extractDimensionsFromSiteURL(site.siteURL || '');
      const city = extractCityFromSiteURL(site.siteURL || '');
      
      return {
        id: site.id,
        site_url: site.siteURL || '',
        rtb_supplier_name: site.rtbSupplierName || '',
        site_type: site.siteType || '',
        daily_request: site.dailyRequest || 0,
        floor_cpm: site.floorCPM || null,
        avg_cpm: site.avgCPM || null,
        dimensions: dimensions,
        location: location,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        city: city,
        network_id: networkId,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }).filter(screen => screen.id > 0);
  } catch (error) {
    console.error('Error fetching media screens from BidTheatre:', error);
    throw error;
  }
}

/**
 * Generate a fallback ID for a site based on its properties
 * This is used when the API doesn't return an ID
 */
function generateFallbackId(site: any): number {
  try {
    // Use site URL or supplier name to create a deterministic hash
    const str = `${site.siteURL || ''}${site.rtbSupplierName || ''}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Make sure the hash is positive and not too large for a bigint
    return Math.abs(hash) % 2147483647; // Max PostgreSQL integer
  } catch (error) {
    console.error('Error generating fallback ID:', error);
    // Return a random large number as last resort
    return Math.floor(Math.random() * 1000000) + 1000000;
  }
}

/**
 * Sync all media screens from BidTheatre API for a specific city
 * If city is 'ALL_FINLAND', will fetch all media screens in Finland
 */
export async function syncMediaScreens(city: string = 'Helsinki'): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    // If city is ALL_FINLAND, fetch all screens without city filter
    const screens = city === 'ALL_FINLAND' 
      ? await fetchMediaScreensByCity('') 
      : await fetchMediaScreensByCity(city);
    
    if (!screens || screens.length === 0) {
      return { success: false, count: 0, error: 'No media screens found' };
    }
    
    console.log(`Syncing ${screens.length} media screens...`);
    
    // Check for missing IDs
    const screensWithValidIds = screens.filter(screen => screen.id != null && screen.id !== undefined);
    
    if (screensWithValidIds.length < screens.length) {
      console.warn(`Found ${screens.length - screensWithValidIds.length} screens with missing IDs`);
    }
    
    if (screensWithValidIds.length === 0) {
      return { success: false, count: 0, error: 'All screens are missing IDs' };
    }
    
    // We'll perform an upsert operation to insert or update records
    const { error } = await supabase
      .from('media_screens')
      .upsert(screensWithValidIds, { onConflict: 'id' });
    
    if (error) {
      throw error;
    }
    
    return { success: true, count: screensWithValidIds.length };
  } catch (error: any) {
    console.error('Error syncing media screens:', error);
    return { success: false, count: 0, error: error.message || 'Unknown error' };
  }
}

/**
 * Get all media screens from the database
 */
export async function getMediaScreens(): Promise<{ data: MediaScreen[] | null; error: any }> {
  return await supabase
    .from('media_screens')
    .select('*')
    .order('site_url', { ascending: true });
}

/**
 * Get media screens by city
 */
export async function getMediaScreensByCity(city: string): Promise<{ data: MediaScreen[] | null; error: any }> {
  return await supabase
    .from('media_screens')
    .select('*')
    .eq('city', city)
    .order('site_url', { ascending: true });
}

/**
 * Get media screen by ID
 */
export async function getMediaScreenById(id: number): Promise<{ data: MediaScreen | null; error: any }> {
  const { data, error } = await supabase
    .from('media_screens')
    .select('*')
    .eq('id', id)
    .single();
    
  return { data, error };
}

/**
 * Search media screens by text query
 */
export async function searchMediaScreens(query: string): Promise<{ data: MediaScreen[] | null; error: any }> {
  return await supabase
    .from('media_screens')
    .select('*')
    .or(`site_url.ilike.%${query}%,location.ilike.%${query}%,rtb_supplier_name.ilike.%${query}%`)
    .order('site_url', { ascending: true });
}