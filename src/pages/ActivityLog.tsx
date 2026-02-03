import { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import { Search, Calendar, Download } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ActivityLogPage = () => {
  // Get data from global store - instant
  const { activityLogs, refreshActivityLogs, user } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Filter logs based on user role
  const filteredLogs = useMemo(() => {
    let result = [...activityLogs];
    
    // If user is manager, exclude admin emails
    if (user?.role === 'manager') {
      result = result.filter(log => 
        !log.user?.email?.includes('@norr3.fi') && 
        !log.user?.email?.includes('@helmies.fi')
      );
    }
    
    // Search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter(log =>
        log.action?.toLowerCase().includes(query) ||
        log.user?.name?.toLowerCase().includes(query) ||
        log.user?.email?.toLowerCase().includes(query) ||
        log.entity_type?.toLowerCase().includes(query)
      );
    }
    
    // Date filter
    if (dateFilter) {
      result = result.filter(log => 
        log.created_at.startsWith(dateFilter)
      );
    }
    
    return result;
  }, [activityLogs, user?.role, searchTerm, dateFilter]);

  const handleExport = () => {
    try {
      // Create CSV content
      const headers = [
        'Date',
        'User',
        'Action',
        'Details',
      ];
      
      const rows = filteredLogs.map(log => [
        format(parseISO(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
        log.user?.email || '',
        log.action,
        JSON.stringify(log.details || ''),
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      import('react-hot-toast').then(({ default: toast }) => toast.success('Export completed'));
    } catch (error) {
      console.error('Error exporting activity logs:', error);
      import('react-hot-toast').then(({ default: toast }) => toast.error('Failed to export'));
    }
  };

  // Check permission
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">You don't have permission to view activity logs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Activity Log</h1>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 md:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <button
            onClick={handleExport}
            className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>
      </div>
      
      
      {/* Activity Log Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(parseISO(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        log.action.includes('create') 
                          ? 'bg-green-100 text-green-800'
                          : log.action.includes('update') || log.action.includes('edit')
                          ? 'bg-blue-100 text-blue-800'
                          : log.action.includes('delete')
                          ? 'bg-red-100 text-red-800'
                          : log.action.includes('login') || log.action.includes('logout')
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogPage;