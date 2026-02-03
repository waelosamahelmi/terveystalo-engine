import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Campaign, CampaignApartment, Apartment } from '../types';
import { Bell, X, AlertTriangle, AlertCircle, Play, Pause, AlertOctagon, Home } from 'lucide-react';
import { format, addDays, parseISO, isBefore, isToday, differenceInDays } from 'date-fns';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'danger' | 'success';
  title: string;
  message: string;
  campaign: Campaign;
  timestamp: Date;
}

interface NotificationCenterProps {
  isAdmin?: boolean;
  campaigns?: Campaign[];
  campaignApartments?: CampaignApartment[];
  apartments?: Apartment[];
}

const NotificationCenter = ({ 
  isAdmin = false, 
  campaigns = [], 
  campaignApartments = [], 
  apartments = [] 
}: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>([]); // Added state for dismissed notifications

  // Fetch dismissed notifications only once on mount
  useEffect(() => {
    fetchDismissedNotifications();
  }, []);

  // Check campaigns when they change
  useEffect(() => {
    if (dismissedNotificationIds.length > 0 || campaigns.length > 0) {
      checkCampaigns();
    }
  }, [campaigns, campaignApartments, apartments, dismissedNotificationIds]);

  // Fetch dismissed notification IDs from Supabase
  const fetchDismissedNotifications = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase
        .from('dismissed_notifications')
        .select('notification_id')
        .eq('user_id', userData.user.id);

      if (error) {
        // Silently ignore if table doesn't exist yet
        if (error.code !== '42P01' && !error.message?.includes('does not exist')) {
          console.warn('Dismissed notifications:', error.message);
        }
        return;
      }

      const dismissedIds = (data || []).map(item => item.notification_id);
      setDismissedNotificationIds(dismissedIds);
    } catch {
      // Silently ignore errors
    }
  };

  const checkCampaigns = async () => {
    const newNotifications: Notification[] = [];
    const now = new Date();
    
    try {
      // Fetch recent activity logs to detect pause/resume actions (if applicable)
      const { data: activityLogs } = await supabase
        .from('activity_logs')
        .select('action, details, user_id, created_at')
        .in('action', ['pause_campaign', 'resume_campaign'])
        .order('created_at', { ascending: false })
        .limit(50);

      campaigns.forEach(campaign => {
        const campaignStart = campaign.campaign_start_date ? parseISO(campaign.campaign_start_date) : null;
        const campaignEnd = campaign.campaign_end_date ? parseISO(campaign.campaign_end_date) : null;

        // 1. Campaign Started (within last 3 days)
        if (campaignStart && campaign.active) {
          const threeDaysAgo = addDays(now, -3);
          const notificationId = `start-${campaign.id}`;
          if (
            isBefore(threeDaysAgo, campaignStart) &&
            isBefore(campaignStart, now) &&
            !dismissedNotificationIds.includes(notificationId)
          ) {
            newNotifications.push({
              id: notificationId,
              type: 'success',
              title: 'Campaign Started',
              message: `Campaign ${campaign.id} started on ${format(campaignStart, 'dd/MM/yyyy')}.`,
              campaign,
              timestamp: now,
            });
          }
        }

        // 2. Campaign Ending Soon (within 7 days)
        if (campaignEnd && campaign.active) {
          const sevenDaysFromNow = addDays(now, 7);
          const notificationId = `end-soon-${campaign.id}`;
          if (
            isBefore(campaignEnd, sevenDaysFromNow) &&
            !isToday(campaignEnd) &&
            !dismissedNotificationIds.includes(notificationId)
          ) {
            newNotifications.push({
              id: notificationId,
              type: 'warning',
              title: 'Campaign Ending Soon',
              message: `Campaign ${campaign.id} will end on ${format(campaignEnd, 'dd/MM/yyyy')}.`,
              campaign,
              timestamp: now,
            });
          }
        }

        // 3. Campaign Ending Today
        if (campaignEnd && campaign.active && isToday(campaignEnd)) {
          const notificationId = `end-today-${campaign.id}`;
          if (!dismissedNotificationIds.includes(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'danger',
              title: 'Campaign Ends Today',
              message: `Campaign ${campaign.id} ends today, ${format(campaignEnd, 'dd/MM/yyyy')}.`,
              campaign,
              timestamp: now,
            });
          }
        }

        // 4. Campaign Paused
        if (!campaign.active) {
          const notificationId = `paused-${campaign.id}`;
          if (!dismissedNotificationIds.includes(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'info',
              title: 'Campaign Paused',
              message: `Campaign ${campaign.id} has been paused.`,
              campaign,
              timestamp: now,
            });
          }
        }

        // 5. Campaign Resumed (based on activity logs, if available)
        if (activityLogs && campaign.active) {
          const resumeLog = activityLogs.find(log => 
            log.action === 'resume_campaign' && 
            log.details.includes(campaign.id) &&
            differenceInDays(now, parseISO(log.created_at)) <= 3
          );
          if (resumeLog) {
            const notificationId = `resumed-${campaign.id}`;
            if (!dismissedNotificationIds.includes(notificationId)) {
              newNotifications.push({
                id: notificationId,
                type: 'success',
                title: 'Campaign Resumed',
                message: `Campaign ${campaign.id} was resumed on ${format(parseISO(resumeLog.created_at), 'dd/MM/yyyy')}.`,
                campaign,
                timestamp: parseISO(resumeLog.created_at),
              });
            }
          }
        }

        // 6. Campaign Budget Exceeded (Estimated)
        if (campaignStart && campaign.active) {
          const campaignDuration = differenceInDays(campaignEnd || now, campaignStart) + 1;
          const dailyBudget = (campaign.budget_meta_daily || 0) + (campaign.budget_display_daily || 0) + (campaign.budget_pdooh_daily || 0);
          const totalBudget = campaign.budget_meta + campaign.budget_display + campaign.budget_pdooh;
          const effectiveDailyBudget = dailyBudget > 0 ? dailyBudget : (totalBudget / campaignDuration);
          
          const activeDays = differenceInDays(now, campaignStart) + 1;
          const estimatedSpend = effectiveDailyBudget * activeDays;
          
          const budgetThreshold = totalBudget * 0.9; // 90% of total budget
          if (estimatedSpend >= budgetThreshold && estimatedSpend <= totalBudget) {
            const notificationId = `budget-near-${campaign.id}`;
            if (!dismissedNotificationIds.includes(notificationId)) {
              newNotifications.push({
                id: notificationId,
                type: 'warning',
                title: 'Budget Approaching Limit',
                message: `Campaign ${campaign.id} estimated spend (€${estimatedSpend.toFixed(2)}) is nearing its budget (€${totalBudget.toFixed(2)}).`,
                campaign,
                timestamp: now,
              });
            }
          } else if (estimatedSpend > totalBudget) {
            const notificationId = `budget-exceeded-${campaign.id}`;
            if (!dismissedNotificationIds.includes(notificationId)) {
              newNotifications.push({
                id: notificationId,
                type: 'danger',
                title: 'Budget Exceeded',
                message: `Campaign ${campaign.id} estimated spend (€${estimatedSpend.toFixed(2)}) has exceeded its budget (€${totalBudget.toFixed(2)}).`,
                campaign,
                timestamp: now,
              });
            }
          }
        }

        // 7. Campaign with No Apartments
        const campaignApts = campaignApartments.filter(ca => ca.campaign_id === campaign.id);
        if (campaignApts.length === 0 && campaign.active) {
          const notificationId = `no-apts-${campaign.id}`;
          if (!dismissedNotificationIds.includes(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'warning',
              title: 'No Apartments Assigned',
              message: `Campaign ${campaign.id} has no associated apartments.`,
              campaign,
              timestamp: now,
            });
          }
        }

        // 8. Sold Apartments (Existing Logic)
        const availableApts = new Set(apartments.map(apt => apt.key));
        const soldApts = campaignApts.filter(ca => !availableApts.has(ca.apartment_key));
        
        if (soldApts.length > 0 && campaign.active) {
          const notificationId = `sold-${campaign.id}`;
          if (!dismissedNotificationIds.includes(notificationId)) {
            newNotifications.push({
              id: notificationId,
              type: 'info',
              title: 'Apartments No Longer Available',
              message: `${soldApts.length} apartment(s) in campaign ${campaign.id} are no longer available.`,
              campaign,
              timestamp: now,
            });
          }
        }
      });

      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newNotifs = newNotifications.filter(n => !existingIds.has(n.id));
        return [...newNotifs, ...prev].slice(0, 50); // Keep last 50 notifications
      });
      
      setUnreadCount(prev => prev + newNotifications.length);
    } catch (error) {
      console.error('Error checking campaigns:', error);
    }
  };

  // Save a dismissed notification to Supabase
  const saveDismissedNotification = async (notificationId: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        console.error('No authenticated user found');
        return;
      }

      // Check if notification is already dismissed
      if (dismissedNotificationIds.includes(notificationId)) {
        // Notification already dismissed, no need to insert
        return;
      }

      const { error } = await supabase
        .from('dismissed_notifications')
        .upsert({
          id: notificationId,
          user_id: userData.user.id,
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error saving dismissed notification:', error);
        toast.error('Failed to dismiss notification');
        return;
      }

      setDismissedNotificationIds(prev => [...prev, notificationId]);
    } catch (error) {
      console.error('Error saving dismissed notification:', error);
      toast.error('Failed to dismiss notification');
    }
  };

  const handleDismiss = (notificationId: string) => {
    saveDismissedNotification(notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleClearAll = () => {
    notifications.forEach(notification => {
      saveDismissedNotification(notification.id);
    });
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors rounded-lg hover:bg-gray-100"
      >
        <Bell size={22} className={unreadCount > 0 ? 'animate-pulse' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-full mt-2 w-[420px] bg-white rounded-xl shadow-xl z-50 max-h-[80vh] overflow-hidden border border-gray-100">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-gray-500" />
                <h3 className="text-base font-semibold text-gray-800">Notifications</h3>
              </div>
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>

          <div className="overflow-y-auto max-h-[calc(80vh-4rem)] divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500 bg-gray-50/50">
                No notifications
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          {notification.type === 'warning' ? (
                            <div className="p-2 bg-amber-50 rounded-lg">
                              <AlertTriangle className="h-5 w-5 text-amber-500" />
                            </div>
                          ) : notification.type === 'danger' ? (
                            <div className="p-2 bg-red-50 rounded-lg">
                              <AlertOctagon className="h-5 w-5 text-red-500" />
                            </div>
                          ) : notification.type === 'success' ? (
                            <div className="p-2 bg-green-50 rounded-lg">
                              <Play className="h-5 w-5 text-green-500" />
                            </div>
                          ) : notification.type === 'info' && notification.title === 'Campaign Paused' ? (
                            <div className="p-2 bg-gray-50 rounded-lg">
                              <Pause className="h-5 w-5 text-gray-500" />
                            </div>
                          ) : notification.type === 'info' && notification.title === 'Apartments No Longer Available' ? (
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <Home className="h-5 w-5 text-blue-500" />
                            </div>
                          ) : (
                            <div className="p-2 bg-blue-50 rounded-lg">
                              <AlertCircle className="h-5 w-5 text-blue-500" />
                            </div>
                          )}
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800">
                            {notification.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-500">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-gray-400 font-medium">
                            {format(notification.timestamp, 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <div className="ml-4 flex-shrink-0 flex">
                        <button
                          onClick={() => handleDismiss(notification.id)}
                          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <span className="sr-only">Close</span>
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;