// ============================================================================
// SUUN TERVEYSTALO - Meta Template Variable Builder
// Shared logic for building the full set of template variables
// Used by both the preview (CampaignCreate) and video generation dispatch
// ============================================================================

// Finnish city name conjugation (genitive form)
const CITY_CONJUGATION: Record<string, string> = {
  'Lahti': 'Lahden',
  'Oulu': 'Oulun',
  'Turku': 'Turun',
  'Tampere': 'Tampereen',
  'Jyväskylä': 'Jyväskylän',
  'Kuopio': 'Kuopion',
  'Joensuu': 'Joensuun',
  'Lappeenranta': 'Lappeenrannan',
  'Rovaniemi': 'Rovaniemen',
  'Hämeenlinna': 'Hämeenlinnan',
  'Seinäjoki': 'Seinäjoen',
  'Kokkola': 'Kokkolan',
  'Iisalmi': 'Iisalmen',
  'Leppävaara': 'Leppävaaran',
  'Iso Omena': 'Iso Omenan',
  'Lippulaiva': 'Lippulaivan',
  'Ogeli': 'Ogelin',
  'Itäkeskus': 'Itäkeskuksen',
  'Redi': 'Redin',
  'Kamppi': 'Kampin',
  'Kirkkonummi': 'Kirkkonummen',
  'Masala': 'Masalan',
  'Veikkola': 'Veikkolan',
  'Lohja': 'Lohjan',
  'Helsinki': 'Helsingin',
  'Espoo': 'Espoon',
  'Vantaa': 'Vantaan',
  'Oulunkylä': 'Oulunkylän',
};

export function getConjugatedCity(city: string): string {
  return CITY_CONJUGATION[city] || `${city}n`;
}

// Bundle groups: when all (and only) these locations are selected, use the bundle text
const LOCATION_BUNDLES: Array<{
  locations: string[];
  bundleCopy: string;
  bundleAddress: string;
}> = [
  {
    locations: ['Masala', 'Veikkola', 'Lohja'],
    bundleCopy: 'Sujuvampaa suunterveyttä Kirkkonummen Suun Terveystaloissa',
    bundleAddress: 'Masala \u2022 Veikkola \u2022 Lohja',
  },
  {
    locations: ['Itäkeskus', 'Oulunkylä', 'Kamppi', 'Redi'],
    bundleCopy: 'Sujuvampaa suunterveyttä Helsingin Suun Terveystaloissa',
    bundleAddress: 'Kamppi \u2022 Itäkeskus \u2022 Ogeli \u2022 Redi',
  },
  {
    locations: ['Leppävaara', 'Iso Omena', 'Lippulaiva'],
    bundleCopy: 'Sujuvampaa suunterveyttä Espoon Suun Terveystaloissa',
    bundleAddress: 'Leppävaara \u2022 Iso Omena \u2022 Lippulaiva',
  },
  {
    locations: ['Tikkurila', 'Myyrmäki'],
    bundleCopy: 'Sujuvampaa suunterveyttä Vantaan Suun Terveystaloissa',
    bundleAddress: 'Tikkurila \u2022 Myyrmäki',
  },
];

export function findMatchingBundle(branchNames: string[]): typeof LOCATION_BUNDLES[number] | null {
  const normalizedNames = branchNames.map(n => n.replace('Terveystalo ', '').trim()).sort();
  for (const bundle of LOCATION_BUNDLES) {
    const bundleSorted = [...bundle.locations].sort();
    if (normalizedNames.length === bundleSorted.length &&
        normalizedNames.every((n, i) => n === bundleSorted[i])) {
      return bundle;
    }
  }
  return null;
}

export interface MetaVariableBuildParams {
  branch: { name: string; short_name?: string; address: string; city: string };
  service: { name: string; name_fi?: string; code?: string; default_price?: string; default_offer_fi?: string };
  allBranches: Array<{ name: string; short_name?: string; city: string }>;
  allServices: Array<{ name: string; name_fi?: string }>;
  formData: {
    headline?: string;
    subheadline?: string;
    offer_text?: string;
    cta_text?: string;
    general_brand_message?: string;
    creative_type: string;
    campaign_address?: string;
    background_image_url?: string;
    landing_url?: string;
    meta_audio_url?: string;
    meta_video_url?: string;
  };
  baseUrl: string;
  isMetaTemplate: boolean;
  isSplitTemplate: boolean;
}

/**
 * Build the full set of template variables for a Meta video ad.
 * This mirrors the logic from CampaignCreate.tsx buildTemplateVariables.
 */
export function buildMetaTemplateVariables(params: MetaVariableBuildParams): Record<string, string> {
  const { branch, service, allServices, formData, baseUrl, isMetaTemplate, isSplitTemplate } = params;

  const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti';
  const isMultiService = allServices.length > 1;
  const showAddress = formData.creative_type === 'local' || formData.creative_type === 'both';

  // Service name and elative form
  const serviceName = service.name_fi || service.name;
  let serviceNameElative = serviceName.toLowerCase();
  if (serviceNameElative.endsWith('äynti')) {
    serviceNameElative = serviceNameElative.slice(0, -5) + 'äynnistä';
  } else if (serviceNameElative.endsWith('nti')) {
    serviceNameElative = serviceNameElative.slice(0, -3) + 'nnistä';
  } else {
    serviceNameElative = serviceNameElative + 'sta';
  }

  // Location text for address — always use the specific branch's address
  // (each creative file is rendered for one branch, so it must be branch-specific)
  const city = branch.city || '';
  const address = branch.address || '';
  const locationText = address ? `${address}, ${city}` : city;

  // Subheadline / message — always branch-specific
  let messageText = formData.subheadline || '';
  if (!messageText) {
    if (isGeneralBrandMessage) {
      const cityConj = branch.city ? getConjugatedCity(branch.city) : '';
      messageText = `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`;
    } else if (isMultiService) {
      messageText = `Sujuvampaa suunterveyttä ${serviceNameElative} erikoisosaamisesta vaativiin hoitoihin`;
    } else {
      const cityConj = branch.city ? getConjugatedCity(branch.city) : '';
      messageText = `Sujuvampaa suunterveyttä ${cityConj} Suun Terveystalossa.`;
    }
  }

  // Headline
  const headlineText = formData.headline || 'Hymyile.|Olet hyvissä käsissä.';
  let headlineValue: string;
  let headlineLine2Value: string | undefined;

  if (isMetaTemplate) {
    // Meta templates: headline is scene 2 animation, subheadline becomes second line
    // Split on both | and <br> to handle all headline formats
    const parts = headlineText.split(/\||<br\s*\/?>/).map(p => p.trim()).filter(Boolean);
    headlineValue = parts[0] || 'Hymyile.';
    headlineLine2Value = undefined;
    // For meta scene 2: never use "Sujuvampaa" fallback — that belongs in scene 3 only
    messageText = parts.length > 1 ? parts.slice(1).join(' ').trim() : 'Olet hyvissä käsissä.';
  } else if (isSplitTemplate) {
    const parts = headlineText.split('|');
    headlineValue = parts[0]?.trim() || headlineText;
    headlineLine2Value = parts.length > 1 ? parts.slice(1).join(' ').trim() : '';
  } else {
    headlineValue = headlineText;
    headlineLine2Value = undefined;
  }

  // Offer title with hyphenation
  let offerTitle = '';
  if (!isGeneralBrandMessage) {
    offerTitle = service.default_offer_fi || serviceName;
    const hyphenationMap: Record<string, string> = {
      'Suuhygienistikäynti': 'Suuhygienisti-|käynti',
      'Hammastarkastus': 'Hammas-|tarkastus',
    };
    const cleanName = offerTitle.replace(/-/g, '');
    if (hyphenationMap[cleanName]) {
      offerTitle = hyphenationMap[cleanName];
    } else if (hyphenationMap[offerTitle]) {
      offerTitle = hyphenationMap[offerTitle];
    }
  }

  const servicePrice = (service.default_price || '').replace(/€/g, '').trim();
  const finalPrice = isGeneralBrandMessage ? '' : (servicePrice || formData.offer_text || '49');
  const finalAddress = showAddress ? locationText : '';

  const vars: Record<string, string> = {
    // Text content
    title: 'Suun Terveystalo',
    headline: headlineValue,
    subheadline: messageText,
    offer_title: offerTitle,
    offer_subtitle: isGeneralBrandMessage ? '' : 'uusille asiakkaille',
    price: finalPrice,
    currency: '€',
    cta_text: formData.cta_text || 'Varaa aika',
    branch_address: finalAddress,

    // Scene 3 text lines — always use the specific branch city
    ...(isMetaTemplate ? {
      scene3_line1: 'Sujuvampaa',
      scene3_line2: 'terveyttä',
      scene3_line3: branch.city || '',
      scene3_line4: 'Suun Terveystalossa.',
    } : {
      scene3_line1: 'Sujuvampaa',
      scene3_line2: 'suun',
      scene3_line3: 'terveyttä',
      scene3_line4: branch.city ? getConjugatedCity(branch.city) : 'Oulun',
      scene3_line5: 'Suun Terveystalossa.',
    }),

    city_name: branch.city || 'Oulu',

    // Audio & video
    audio_track: encodeURI(formData.meta_audio_url || '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav'),
    background_video: encodeURI(formData.meta_video_url || '/meta/vids/nainen.mp4'),

    // Images
    scene1_image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop&crop=faces',
    scene2_image: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop&crop=faces',
    logo_url: `${baseUrl}/refs/assets/SuunTerveystalo_logo.png`,
    artwork_url: `${baseUrl}/refs/assets/terveystalo-artwork.png`,
    image_url: formData.background_image_url || `${baseUrl}/refs/assets/nainen.jpg`,
    image_url_1: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop',
    image_url_2: 'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop',

    // Styling
    font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap',
    font_family: 'Inter',
    bg_color: '#0a1e5c',
    text_color: '#fff',
    wipe_color: '#0a3d91',
    badge_color: '#0a3d91',
    scene3_text_dim: '#6b82b8',
    scene3_text_bright_color: '#ffffff',
    scene4_addr_color: 'rgba(255,255,255,0.6)',

    // SVG badge path
    badge_svg_path: 'M 145,10 C 175,8   205,15  230,35 Q 258,55  270,90 C 280,120  282,155  272,185 Q 260,220  235,248 C 210,272  175,285  140,284 C 105,283  70,270   45,245 Q 20,218   10,180 C 2,148    5,112   18,82 Q 32,48    65,28 C 90,14   118,10  145,10 Z',

    // Animation timing
    animation_duration: '15',
    scene1_end: '44',
    scene1_fade: '48',
    scene1_zoom_duration: '8',
    scene1_zoom_scale: '1.08',
    scene2_start: '42',
    scene2_fade: '47',
    logo_end: '54',
    logo_hide: '57',
    badge_show: '27',
    badge_pop: '30',
    badge_pop_scale: '1.05',
    badge_hold: '32',
    badge_end: '55',
    badge_hide: '57',
    headline_show: '27',
    headline_pop: '30',
    headline_hold: '35',
    headline_move: '38',
    headline_end: '55',
    headline_hide: '57',
    subline_show: '36',
    subline_pop: '40',
    subline_end: '55',
    subline_hide: '57',
    cw1_show: '48',
    cw1_pop: '50',
    cw1_hold: '54',
    cw1_wipe: '57',
    cw2_show: '49',
    cw2_pop: '51',
    cw2_hold: '54',
    cw2_wipe: '57',
    cw3_show: '49',
    cw3_pop: '51.5',
    cw3_hold: '54',
    cw3_wipe: '57',
    cw4_show: '49.5',
    cw4_pop: '52',
    cw4_hold: '54',
    cw4_wipe: '57',
    cw5_show: '50',
    cw5_pop: '52',
    cw5_hold: '54',
    cw5_wipe: '57',
    cw6_show: '50',
    cw6_pop: '52.5',
    cw6_hold: '54',
    cw6_wipe: '57',
    cw7_show: '50.5',
    cw7_pop: '53',
    cw7_hold: '54',
    cw7_wipe: '57',
    cw_big_show: '55',
    cw_big_pop: '56',
    cw_big_hold: '59',
    cw_big_wipe: '8',
    scene3_start: '58',
    scene3_show: '60',
    scene3_end: '82',
    scene3_hide: '85',
    scene3_text_dim_start: '60',
    scene3_text_bright: '67',
    scene3_arc: '72',
    scene3_logo_show: '61',
    scene3_logo_pop: '64',
    scene3_logo_end: '82',
    scene3_logo_hide: '85',
    scene4_start: '83',
    scene4_show: '86',
    scene4_logo_show: '84',
    scene4_logo_pop: '87',
    scene4_addr_show: '89',
    scene4_addr_pop: '94',

    // Sizes
    logo_bottom: '65',
    logo_height: '52',
    badge_top: '20',
    badge_left: '15',
    badge_size: '290',
    badge_pad_bottom: '5',
    badge_pad_right: '10',
    badge_label_size: '26',
    badge_label_weight: '700',
    badge_price_size: '82',
    badge_price_weight: '900',
    badge_price_lineheight: '0.85',
    badge_euro_size: '52',
    badge_euro_weight: '700',
    badge_euro_top: '6',
    badge_euro_left: '2',
    headline_top: '50',
    headline_size: '70',
    headline_weight: '800',
    headline_start_y: '30',
    headline_end_y: '90',
    subline_top: '50',
    subline_size: '62',
    subline_weight: '800',
    subline_start_y: '10',
    subline_end_y: '10',
    subline_lineheight: '1.15',
    text_shadow: '2',

    // Circle wipe sizes
    cw1_size: '140', cw1_bottom: '-20', cw1_left: '-30', cw1_scale: '15',
    cw2_size: '100', cw2_bottom: '90', cw2_left: '60', cw2_scale: '15',
    cw3_size: '70', cw3_bottom: '50', cw3_left: '150', cw3_scale: '18',
    cw4_size: '55', cw4_bottom: '160', cw4_left: '20', cw4_scale: '22',
    cw5_size: '90', cw5_bottom: '130', cw5_left: '130', cw5_scale: '15',
    cw6_size: '120', cw6_bottom: '30', cw6_left: '200', cw6_scale: '12',
    cw7_size: '45', cw7_bottom: '190', cw7_left: '100', cw7_scale: '28',
    cw_big_size: '400', cw_big_bottom: '-200', cw_big_left: '-200', cw_big_scale: '8',

    // Scene 3 styling
    scene3_text_size: '78',
    scene3_text_weight: '800',
    scene3_text_lineheight: '1.15',
    scene3_text_pad: '60',
    scene3_text_style: 'italic',
    scene3_arc_angle: '-18',
    scene3_arc_scale: '0.82',
    scene3_logo_bottom: '95',
    scene3_logo_height: '46',

    // Scene 4 styling
    scene4_margin_top: '60',
    scene4_logo_height: '54',
    scene4_addr_top: '18',
    scene4_addr_size: '40',
    scene4_addr_weight: '300',
    scene4_addr_spacing: '0.5',
    scene4_addr_slide: '8',

    // Other
    offer_date: isGeneralBrandMessage ? '' : '',
    click_url: formData.landing_url || 'https://terveystalo.com/suunterveystalo',
    disclaimer_text: '',
  };

  // Always include headline_line2 to override DB defaults (prevents recombination in renderTemplateHtml)
  vars.headline_line2 = headlineLine2Value || '';

  return vars;
}
