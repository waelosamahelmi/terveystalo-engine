// ============================================================================
// SUUN TERVEYSTALO - Activity Feed Component
// Real-time activity feed showing team actions
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { format, formatDistanceToNow } from 'date-fns';
import { fi } from 'date-fns/locale';
import {
  Activity,
  User,
  Megaphone,
  MapPin,
  Settings,
  LogIn,
  LogOut,
  Edit,
  Trash2,
  Plus,
  Eye,
  Play,
  Pause,
  MessageSquare,
  Bell,
  Filter,
  RefreshCw,
  ChevronDown,
  ExternalLink
} from 'lucide-react';

interface ActivityItem {
  id: string;
  user_id: string;
  user_email?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: Record<string, any>;
  created_at: string;
  user?: {
    name: string;
    email: string;
    image_url?: string;
  };
}

interface ActivityFeedProps {
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
  entityType?: string;
  entityId?: string;
}

const ActivityFeed = ({ 
  limit = 20, 
  showFilters = true, 
  compact = false,
  entityType,
  entityId
}: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const { user } = useStore();

  const filterOptions = [
    { value: 'all', label: 'Kaikki', icon: Activity },
    { value: 'campaign', label: 'Kampanjat', icon: Megaphone },
    { value: 'branch', label: 'Toimipisteet', icon: MapPin },
    { value: 'user', label: 'Käyttäjät', icon: User },
    { value: 'settings', label: 'Asetukset', icon: Settings }
  ];

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs'
        },
        (payload) => {
          setActivities(prev => [payload.new as ActivityItem, ...prev].slice(0, limit));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter, entityType, entityId, limit]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('activity_logs')
        .select(`
          *,
          user:users(name, email, image_url)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (filter !== 'all') {
        query = query.eq('entity_type', filter);
      }

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }

      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string, entityType?: string) => {
    const actionMap: Record<string, React.ElementType> = {
      'create': Plus,
      'update': Edit,
      'delete': Trash2,
      'view': Eye,
      'login': LogIn,
      'logout': LogOut,
      'pause': Pause,
      'resume': Play,
      'comment': MessageSquare
    };

    const entityMap: Record<string, React.ElementType> = {
      'campaign': Megaphone,
      'branch': MapPin,
      'user': User,
      'settings': Settings
    };

    return actionMap[action] || entityMap[entityType || ''] || Activity;
  };

  const getActionColor = (action: string) => {
    const colorMap: Record<string, string> = {
      'create': 'bg-green-100 text-green-600',
      'update': 'bg-blue-100 text-blue-600',
      'delete': 'bg-red-100 text-red-600',
      'view': 'bg-gray-100 text-gray-600',
      'login': 'bg-emerald-100 text-emerald-600',
      'logout': 'bg-orange-100 text-orange-600',
      'pause': 'bg-yellow-100 text-yellow-600',
      'resume': 'bg-teal-100 text-teal-600',
      'comment': 'bg-purple-100 text-purple-600'
    };

    return colorMap[action] || 'bg-gray-100 text-gray-600';
  };

  const formatAction = (activity: ActivityItem) => {
    const actionTexts: Record<string, string> = {
      'create': 'loi',
      'update': 'päivitti',
      'delete': 'poisti',
      'view': 'katsoi',
      'login': 'kirjautui sisään',
      'logout': 'kirjautui ulos',
      'pause': 'keskeytti',
      'resume': 'jatkoi',
      'comment': 'kommentoi'
    };

    const entityTexts: Record<string, string> = {
      'campaign': 'kampanjan',
      'branch': 'toimipisteen',
      'user': 'käyttäjän',
      'settings': 'asetukset'
    };

    const actionText = actionTexts[activity.action] || activity.action;
    const entityText = activity.entity_type ? entityTexts[activity.entity_type] || activity.entity_type : '';

    return { actionText, entityText };
  };

  const getEntityLink = (activity: ActivityItem): string | null => {
    if (!activity.entity_type || !activity.entity_id) return null;

    const linkMap: Record<string, string> = {
      'campaign': `/campaigns/${activity.entity_id}`,
      'branch': `/branches?id=${activity.entity_id}`,
      'user': `/users?id=${activity.entity_id}`
    };

    return linkMap[activity.entity_type] || null;
  };

  if (compact) {
    return (
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-2 bg-gray-100 rounded w-1/2 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          activities.slice(0, 5).map((activity) => {
            const Icon = getActionIcon(activity.action, activity.entity_type);
            const { actionText, entityText } = formatAction(activity);
            const link = getEntityLink(activity);

            return (
              <div key={activity.id} className="flex items-start space-x-3 group">
                <div className={`p-1.5 rounded-lg ${getActionColor(activity.action)}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user?.name || 'Käyttäjä'}</span>
                    {' '}{actionText} {entityText}
                    {activity.details?.name && (
                      <>
                        {' '}
                        {link ? (
                          <Link to={link} className="font-medium text-[#00A5B5] hover:underline">
                            {activity.details.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{activity.details.name}</span>
                        )}
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fi })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    );
  }

  return (
    <div className="card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-[#00A5B5]/10 to-[#1B365D]/10">
            <Activity size={18} className="text-[#00A5B5]" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Aktiviteetti</h3>
            <p className="text-xs text-gray-500">Viimeisimmät toiminnot</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {showFilters && (
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="btn-ghost btn-sm"
              >
                <Filter size={16} className="mr-1" />
                {filterOptions.find(f => f.value === filter)?.label}
                <ChevronDown size={14} className="ml-1" />
              </button>

              {showFilterMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowFilterMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setFilter(option.value);
                          setShowFilterMenu(false);
                        }}
                        className={`w-full flex items-center px-4 py-2 text-sm hover:bg-gray-50 ${
                          filter === option.value ? 'text-[#00A5B5] bg-[#00A5B5]/5' : 'text-gray-700'
                        }`}
                      >
                        <option.icon size={16} className="mr-3" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={fetchActivities}
            className="btn-ghost btn-sm"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse flex items-start space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Ei aktiviteetteja</p>
          </div>
        ) : (
          activities.map((activity) => {
            const Icon = getActionIcon(activity.action, activity.entity_type);
            const { actionText, entityText } = formatAction(activity);
            const link = getEntityLink(activity);

            return (
              <div 
                key={activity.id} 
                className="px-6 py-4 hover:bg-gray-50 transition-colors group animate-fade-in"
              >
                <div className="flex items-start space-x-4">
                  {/* User Avatar */}
                  <div className="relative">
                    {activity.user?.image_url ? (
                      <img 
                        src={activity.user.image_url} 
                        alt={activity.user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00A5B5] to-[#1B365D] flex items-center justify-center text-white font-medium">
                        {(activity.user?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${getActionColor(activity.action)}`}>
                      <Icon size={10} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">
                      <span className="font-medium text-gray-900">
                        {activity.user?.name || 'Käyttäjä'}
                      </span>
                      {' '}{actionText}
                      {entityText && ` ${entityText}`}
                      {activity.details?.name && (
                        <>
                          {' '}
                          {link ? (
                            <Link 
                              to={link} 
                              className="font-medium text-[#00A5B5] hover:underline inline-flex items-center"
                            >
                              {activity.details.name}
                              <ExternalLink size={12} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Link>
                          ) : (
                            <span className="font-medium">{activity.details.name}</span>
                          )}
                        </>
                      )}
                    </p>

                    {/* Additional Details */}
                    {activity.details?.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        "{activity.details.description}"
                      </p>
                    )}

                    <p className="text-xs text-gray-400 mt-1">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: fi })}
                      {' • '}
                      {format(new Date(activity.created_at), 'HH:mm', { locale: fi })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {activities.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <Link 
            to="/activity-log" 
            className="text-sm text-[#00A5B5] hover:underline font-medium"
          >
            Näytä kaikki aktiviteetit →
          </Link>
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
