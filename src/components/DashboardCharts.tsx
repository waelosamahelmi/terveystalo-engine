import { useState, useEffect, useMemo } from 'react';
import { Campaign, User } from '../types';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface DashboardChartsProps {
  campaigns: Campaign[];
  user: User | null; // Add user prop to determine role and agency_id
}

const DashboardCharts = ({ campaigns, user }: DashboardChartsProps) => {
  const [chartView, setChartView] = useState<'monthly' | 'channels' | 'status'>('monthly');
  const [chartData, setChartData] = useState<any>(null);

  // Log campaigns and user for debugging
  useEffect(() => {
    console.log('User in DashboardCharts:', user);
    console.log('Campaigns in DashboardCharts:', campaigns);
    console.log('Active campaigns:', campaigns.filter(c => c.active));
  }, [campaigns, user]);

  const calculateAllChartData = useMemo(() => {
    const calculateMonthlyData = () => {
      const today = new Date();
      const startDate = startOfMonth(today);
      const endDate = endOfMonth(today);
      const days = eachDayOfInterval({ start: startDate, end: endDate });

      // Determine filtered campaigns based on user role
      const filteredCampaigns = user?.role === 'partner'
        ? campaigns.filter(c => c.active && c.agency_id === user.agency_id)
        : campaigns.filter(c => c.active); // Admins and managers see all active campaigns

      const dailyData = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');

        const dailyBudget = filteredCampaigns
          .filter(campaign => {
const start = parseISO(campaign.campaign_start_date.split('/').reverse().join('-')); // Convert dd/MM/yyyy to YYYY-MM-DD
const end = campaign.campaign_end_date ? parseISO(campaign.campaign_end_date.split('/').reverse().join('-')) : today;
            const isActiveOnDay = start <= day && end >= day;

            if (isActiveOnDay) {
              console.log(`Campaign ${campaign.id} active on ${dayStr}:`, {
                start: campaign.campaign_start_date,
                end: campaign.campaign_end_date,
                agency_id: campaign.agency_id,
                budgets: {
                  metaDaily: campaign.budget_meta_daily,
                  displayDaily: campaign.budget_display_daily,
                  pdoohDaily: campaign.budget_pdooh_daily,
                },
              });
            }
            return isActiveOnDay;
          })
          .reduce((sum, campaign) => {
            const dailyTotal =
              (campaign.budget_meta_daily || 0) +
              (campaign.budget_display_daily || 0) +
              (campaign.budget_pdooh_daily || 0);
            return sum + dailyTotal;
          }, 0);

        console.log(`Daily budget for ${dayStr}: ${dailyBudget}`);
        return {
          date: dayStr,
          budget: dailyBudget,
          day: format(day, 'd'),
        };
      });

      return {
        labels: dailyData.map(d => d.day),
        datasets: [
          {
            label: 'Daily Budget (€)',
            data: dailyData.map(d => d.budget),
            backgroundColor: 'rgba(106, 27, 154, 0.5)',
            borderColor: 'rgba(106, 27, 154, 1)',
            borderWidth: 1,
          },
        ],
      };
    };

    const calculateChannelData = () => {
      const channelBudgets = { meta: 0, display: 0, pdooh: 0 };

      const filteredCampaigns = user?.role === 'partner'
        ? campaigns.filter(c => c.active && c.agency_id === user.agency_id)
        : campaigns.filter(c => c.active);

      filteredCampaigns.forEach(campaign => {
        channelBudgets.meta += campaign.budget_meta_daily || 0;
        channelBudgets.display += campaign.budget_display_daily || 0;
        channelBudgets.pdooh += campaign.budget_pdooh_daily || 0;
      });

      return {
        labels: ['Meta', 'Display', 'PDOOH'],
        datasets: [
          {
            data: [channelBudgets.meta, channelBudgets.display, channelBudgets.pdooh],
            backgroundColor: [
              'rgba(54, 162, 235, 0.6)',
              'rgba(75, 192, 192, 0.6)',
              'rgba(153, 102, 255, 0.6)',
            ],
            borderColor: [
              'rgba(54, 162, 235, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)',
            ],
            borderWidth: 1,
          },
        ],
      };
    };

    const calculateStatusData = () => {
      const filteredCampaigns = user?.role === 'partner'
        ? campaigns.filter(c => c.agency_id === user.agency_id)
        : campaigns; // Admins and managers see all campaigns

      const active = filteredCampaigns.filter(c => c.active).length;
      const paused = filteredCampaigns.filter(c => !c.active).length;

      return {
        labels: ['Active', 'Paused'],
        datasets: [
          {
            data: [active, paused],
            backgroundColor: [
              'rgba(75, 192, 192, 0.6)',
              'rgba(255, 99, 132, 0.6)',
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
            ],
            borderWidth: 1,
          },
        ],
      };
    };

    return {
      monthly: calculateMonthlyData(),
      channels: calculateChannelData(),
      status: calculateStatusData(),
    };
  }, [campaigns, user]);

  useEffect(() => {
    setChartData(calculateAllChartData[chartView]);
  }, [chartView, calculateAllChartData]);

  if (!chartData) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4 flex items-center justify-center h-72">
        <div className="text-gray-400">Loading chart data...</div>
      </div>
    );
  }

  const getChartOptions = () => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const },
      },
    };

    if (chartView === 'monthly') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: { display: true, text: `Daily Budget for ${format(new Date(), 'MMMM yyyy')}` },
        },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Budget (€)' } },
          x: { title: { display: true, text: 'Day of Month' } },
        },
      };
    }

    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: true,
          text: chartView === 'channels' ? 'Daily Budget Distribution by Channel' : 'Campaigns by Status',
        },
      },
    };
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Campaign Analytics</h2>
        
        <div className="flex space-x-2 mt-2 sm:mt-0">
          <button
            onClick={() => setChartView('monthly')}
            className={`px-3 py-1 text-sm rounded-md ${
              chartView === 'monthly'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Monthly Budget
          </button>
          
          <button
            onClick={() => setChartView('channels')}
            className={`px-3 py-1 text-sm rounded-md ${
              chartView === 'channels'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Channels
          </button>
          
          <button
            onClick={() => setChartView('status')}
            className={`px-3 py-1 text-sm rounded-md ${
              chartView === 'status'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Status
          </button>
        </div>
      </div>
      
      <div className="h-64">
        {chartView === 'monthly' && (
          <Line data={chartData} options={getChartOptions()} />
        )}
        
        {chartView === 'channels' && (
          <div className="flex items-center justify-center h-full">
            <div className="w-64">
              <Pie data={chartData} options={getChartOptions()} />
            </div>
          </div>
        )}
        
        {chartView === 'status' && (
          <div className="flex items-center justify-center h-full">
            <div className="w-64">
              <Pie data={chartData} options={getChartOptions()} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;