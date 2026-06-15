import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  FileText, 
  Download, 
  Printer, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar,
  DollarSign,
  PieChart as PieChartIcon,
  Users,
  CreditCard
} from 'lucide-react';

export const Reports: React.FC = () => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  
  // Report states
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Month Names Helper
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/reports?month=${month}&year=${year}`);
      setReportData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 1. Export CSV
  const handleExportCSV = () => {
    if (!reportData || reportData.transactions.length === 0) return;
    
    // Headers
    const headers = ['Date', 'Type', 'Category', 'Description', 'Member', 'Method/Details', 'Amount (INR)'];
    
    // Rows
    const rows = reportData.transactions.map((t: any) => [
      t.date,
      t.type.toUpperCase(),
      t.category,
      `"${t.description.replace(/"/g, '""')}"`, // escape quotes
      t.member,
      t.details || '',
      t.amount
    ]);
    
    // Combined string
    const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Family_Expense_Report_${monthNames[month-1]}_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export PDF / Print Page
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      
      {/* Upper controls (Hidden in print mode) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-gradient-cyan-magenta">Monthly Reports</h2>
          <p className="text-xs text-cmyk-gray-400">Generate statements, export transaction lists, or print summaries.</p>
        </div>
        
        {/* Date Filter & Export Triggers */}
        <div className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 bg-cmyk-gray-900 border border-cmyk-gray-800 px-3 py-1.5 rounded-xl">
            <Calendar size={14} className="text-cmyk-cyan" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none"
            >
              {monthNames.map((name, idx) => (
                <option key={name} value={idx + 1}>{name}</option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none border-l border-cmyk-gray-800 pl-2 ml-1"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleExportCSV}
            disabled={!reportData || reportData.transactions.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cmyk-gray-900 border border-cmyk-gray-800 hover:border-cmyk-cyan text-xs font-bold transition-all disabled:opacity-50"
          >
            <Download size={14} className="text-cmyk-cyan" />
            <span>CSV</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!reportData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cmyk-cyan to-cmyk-magenta hover:shadow-cyan-glow text-white text-xs font-bold transition-all disabled:opacity-50"
          >
            <Printer size={14} />
            <span>Print PDF</span>
          </button>

        </div>
      </div>

      {/* Printing Only Logo & Title Banner */}
      <div className="hidden print:flex items-center justify-between border-b border-cmyk-black pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-cmyk-black">Family Expense Tracker Statement</h1>
          <p className="text-xs text-cmyk-gray-600">Month: {monthNames[month-1]} {year} • Generated on: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-cmyk-cyan">FamTracker</p>
          <p className="text-[10px] text-cmyk-gray-500">Shared Account</p>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center print:hidden">
          <div className="w-10 h-10 border-4 border-cmyk-cyan border-t-transparent rounded-full animate-spin shadow-cyan-glow" />
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          
          {/* 1. AGGREGATE SUMMARY ROW */}
          <div className="grid grid-cols-3 gap-4 print:grid-cols-3 print:gap-2">
            
            {/* Income */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-4 md:p-6 rounded-3xl border border-cmyk-gray-800 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-2xl text-green-500 border border-green-500/20 print:hidden">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-cmyk-gray-400 uppercase tracking-wider print:text-cmyk-gray-600">Total Income</p>
                <h3 className="text-lg md:text-xl font-extrabold text-green-500">₹{reportData.total_income.toLocaleString()}</h3>
              </div>
            </div>

            {/* Expense */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-4 md:p-6 rounded-3xl border border-cmyk-gray-800 flex items-center gap-4">
              <div className="p-3 bg-cmyk-magenta/10 rounded-2xl text-cmyk-magenta border border-cmyk-magenta/20 print:hidden">
                <ArrowDownRight size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-cmyk-gray-400 uppercase tracking-wider print:text-cmyk-gray-600">Total Expenses</p>
                <h3 className="text-lg md:text-xl font-extrabold text-cmyk-magenta">₹{reportData.total_expense.toLocaleString()}</h3>
              </div>
            </div>

            {/* Savings */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-4 md:p-6 rounded-3xl border border-cmyk-gray-800 flex items-center gap-4">
              <div className="p-3 bg-cmyk-cyan/10 rounded-2xl text-cmyk-cyan border border-cmyk-cyan/20 print:hidden">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-cmyk-gray-400 uppercase tracking-wider print:text-cmyk-gray-600">Savings</p>
                <h3 className={`text-lg md:text-xl font-extrabold ${reportData.savings >= 0 ? 'text-cmyk-cyan' : 'text-cmyk-magenta'}`}>
                  ₹{reportData.savings.toLocaleString()}
                </h3>
              </div>
            </div>

          </div>

          {/* 2. ANALYTICS CHARTS (Flex grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-4">
            
            {/* Category spending bar chart */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2 print:text-cmyk-black">
                <PieChartIcon size={16} className="text-cmyk-cyan print:hidden" />
                Expenses by Category
              </h4>
              <div className="h-56 w-full text-xs">
                {reportData.category_breakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-cmyk-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.category_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="category_name" stroke="#71717A" fontSize={8} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={8} tickLine={false} />
                      <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString()}` : ''} />
                      <Bar dataKey="amount" fill="#00C2FF" radius={[4, 4, 0, 0]}>
                        {reportData.category_breakdown.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#00C2FF'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Member spending bar chart */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2 print:text-cmyk-black">
                <Users size={16} className="text-cmyk-magenta print:hidden" />
                Expenses by Family Member
              </h4>
              <div className="h-56 w-full text-xs">
                {reportData.member_breakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-cmyk-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.member_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="member_name" stroke="#71717A" fontSize={8} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={8} tickLine={false} />
                      <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString()}` : ''} />
                      <Bar dataKey="amount" fill="#FF2D95" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Payment Method Chart */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cmyk-gray-400 mb-4 flex items-center gap-2 print:text-cmyk-black">
                <CreditCard size={16} className="text-cmyk-yellow print:hidden" />
                Expenses by Payment Method
              </h4>
              <div className="h-56 w-full text-xs">
                {reportData.payment_breakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-cmyk-gray-500">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData.payment_breakdown} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272A" />
                      <XAxis dataKey="method" stroke="#71717A" fontSize={8} tickLine={false} />
                      <YAxis stroke="#71717A" fontSize={8} tickLine={false} />
                      <Tooltip formatter={(value) => value ? `₹${Number(value).toLocaleString()}` : ''} />
                      <Bar dataKey="amount" fill="#FFD60A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Empty block for symmetry in print or double sizing */}
            <div className="glass-card-dark print:bg-white print:border print:text-black p-6 rounded-3xl border border-cmyk-gray-800 flex flex-col print:hidden">
              <h4 className="font-bold text-xs uppercase tracking-wider text-cmyk-gray-400 mb-4">
                Statement Disclaimers
              </h4>
              <div className="text-xs text-cmyk-gray-500 space-y-2 leading-relaxed flex-1 flex flex-col justify-center">
                <p>• This statement represents transactions logged within the private family server environment.</p>
                <p>• Auto summary logic evaluates data patterns by comparing aggregates with preceding calendar periods.</p>
                <p>• In case of calculation questions, consult with the family account administrators.</p>
              </div>
            </div>

          </div>

          {/* 3. TRANSACTION LIST (Shown in print/PDF statement summary) */}
          <div className="glass-card-dark print:bg-white print:border print:text-black p-6 rounded-3xl border border-cmyk-gray-800">
            <h4 className="font-bold text-sm uppercase tracking-wider text-cmyk-gray-400 mb-4 print:text-cmyk-black">
              Transactions Details ledger ({reportData.transactions.length} items)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs print:text-[10px]">
                <thead>
                  <tr className="border-b border-cmyk-gray-800 print:border-cmyk-black font-bold text-cmyk-gray-400 print:text-cmyk-gray-600">
                    <th className="pb-2 text-left">Date</th>
                    <th className="pb-2 text-left">Type</th>
                    <th className="pb-2 text-left">Category</th>
                    <th className="pb-2 text-left">Description</th>
                    <th className="pb-2 text-left">Paid By</th>
                    <th className="pb-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cmyk-gray-900 print:divide-cmyk-gray-200">
                  {reportData.transactions.map((tx: any, idx: number) => (
                    <tr key={idx} className="py-2.5">
                      <td className="py-2 text-cmyk-gray-400 print:text-cmyk-gray-600">{tx.date}</td>
                      <td className={`py-2 font-semibold capitalize ${tx.type === 'income' ? 'text-green-500' : 'text-cmyk-magenta'}`}>{tx.type}</td>
                      <td className="py-2 font-medium">{tx.category}</td>
                      <td className="py-2 max-w-xs truncate text-cmyk-gray-300 print:text-cmyk-black">{tx.description || '—'}</td>
                      <td className="py-2">{tx.member}</td>
                      <td className={`py-2 text-right font-bold ${tx.type === 'income' ? 'text-green-500' : 'text-cmyk-magenta'}`}>
                        ₹{tx.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      ) : (
        <div className="text-center text-xs text-cmyk-gray-500 py-10">
          No statement data generated for this month.
        </div>
      )}

    </div>
  );
};
export default Reports;
