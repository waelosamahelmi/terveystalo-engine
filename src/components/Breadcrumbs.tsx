// ============================================================================
// SUUN TERVEYSTALO - Breadcrumbs Component
// Navigation breadcrumbs with proper hierarchy
// ============================================================================

import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

const routeLabels: Record<string, string> = {
  '': 'Dashboard',
  'dashboard': 'Dashboard',
  'campaigns': 'Kampanjat',
  'create': 'Luo uusi',
  'branches': 'Toimipisteet',
  'analytics': 'Analytiikka',
  'reports': 'Raportit',
  'creatives': 'Luovat',
  'ai-assistant': 'AI Assistentti',
  'users': 'Käyttäjät',
  'settings': 'Asetukset',
  'activity-log': 'Toimintaloki',
  'video-library': 'Videokirjasto',
  'media-screens': 'Mediänäytöt'
};

const Breadcrumbs = ({ items, showHome = true }: BreadcrumbsProps) => {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from path if items not provided
  const breadcrumbs = items || (() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const result: BreadcrumbItem[] = [];
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      result.push({
        label,
        path: index < pathSegments.length - 1 ? currentPath : undefined
      });
    });
    
    return result;
  })();

  if (breadcrumbs.length === 0 && !showHome) return null;

  return (
    <nav className="flex items-center space-x-1 text-sm">
      {showHome && (
        <>
          <Link 
            to="/" 
            className="flex items-center text-gray-500 hover:text-[#00A5B5] transition-colors"
          >
            <Home size={16} />
          </Link>
          {breadcrumbs.length > 0 && (
            <ChevronRight size={14} className="text-gray-400" />
          )}
        </>
      )}
      
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight size={14} className="text-gray-400 mx-1" />
          )}
          {item.path ? (
            <Link 
              to={item.path} 
              className="text-gray-500 hover:text-[#00A5B5] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-gray-900 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
