import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { Mountain, ShoppingBag, Activity, Plus, Trash2, Calendar, CheckCircle, Navigation, Star, Wand2, MapPin, Check, CheckSquare, X, Map as MapIcon, Search, ExternalLink, Filter, ChevronDown, Pencil } from 'lucide-react';
import StatsChart from './components/StatsChart';
import ShareButton from './components/ShareButton';
import ClimbMap from './components/ClimbMap';
import { ClimbEntry, GearReview, ClimbType } from './types';
import { analyzeProgression, suggestGearReview, findPlaces, PlaceResult } from './services/geminiService';
import { gradeToValue } from './utils';

// --- Components defined in App for simplicity/single-file delivery where possible, or imported ---

// --- Helper Data ---
const MOCK_CLIMBS: ClimbEntry[] = [
  { id: '1', name: 'The Nose (Simulated)', date: '2023-10-15', grade: '5.9', type: 'Outdoor Trad', location: { lat: 37.726, lng: -119.63, name: 'Yosemite' }, notes: 'Classic route, amazing exposure.', sent: true, favorite: true },
  { id: '2', name: 'Midnight Lightning', date: '2023-11-02', grade: 'V8', type: 'Outdoor Bouldering', location: { lat: 37.745, lng: -119.58, name: 'Camp 4' }, notes: 'Hard mantle problem.', sent: false },
  { id: '3', name: 'Gym Project #4', date: '2023-11-10', grade: '5.11a', type: 'Indoor Lead', location: { lat: 34.052, lng: -118.243, name: 'Sender One' }, notes: 'Fell at the crux.', sent: false },
  { id: '4', name: 'Red River Classic', date: '2023-12-05', grade: '5.10c', type: 'Outdoor Sport', location: { lat: 37.78, lng: -83.68, name: 'Red River Gorge' }, notes: 'Pump fest!', sent: true, favorite: true },
];

const MOCK_GEAR: GearReview[] = [
  { id: '1', itemName: 'La Sportiva Solution', category: 'Shoes', rating: 5, reviewText: 'Aggressive downturn, perfect for steep bouldering. Heel hook is legendary.', price: 180 },
  { id: '2', itemName: 'Black Diamond Momentum', category: 'Harness', rating: 4, reviewText: 'Solid beginner harness. Comfortable enough for gym sessions, great value.', price: 60 },
];

// --- Sub-Components ---

const NavLink = ({ to, icon: Icon, label, active }: { to: string, icon: any, label: string, active: boolean }) => (
  <Link to={to} className={`flex items-center space-x-2 px-4 py-3 rounded-xl transition-all duration-200 ${active ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`}>
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </Link>
);

const ClimbCard = ({ 
  climb, 
  onDelete,
  onEdit,
  onToggleFavorite,
  selectionMode, 
  isSelected, 
  onToggleSelect 
}: { 
  climb: ClimbEntry, 
  onDelete: (id: string) => void,
  onEdit: (climb: ClimbEntry) => void,
  onToggleFavorite: (id: string) => void,
  selectionMode?: boolean,
  isSelected?: boolean,
  onToggleSelect?: (id: string) => void
}) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div 
      onClick={() => selectionMode && onToggleSelect?.(climb.id)}
      className={`bg-white p-5 rounded-2xl shadow-sm border transition-all duration-200 group relative overflow-hidden ${
        selectionMode ? 'cursor-pointer select-none' : 'hover:shadow-md'
      } ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10' : 'border-slate-100'}`}
    >
      {/* Confirmation Overlay */}
      {showConfirm && !selectionMode && (
         <div 
            className="absolute inset-0 bg-white/95 backdrop-blur-[1px] z-30 flex flex-col items-center justify-center p-4 text-center animate-in fade-in duration-200"
            onClick={(e) => e.stopPropagation()} 
         >
             <p className="text-sm font-bold text-slate-800 mb-3">Delete this climb?</p>
             <div className="flex space-x-3 w-full max-w-[200px]">
                <button 
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => onDelete(climb.id)}
                  className="flex-1 py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                >
                  Delete
                </button>
             </div>
         </div>
      )}

      {/* Action Buttons (Share/Edit/Delete) */}
      {!selectionMode && !showConfirm && (
        <div className="absolute top-3 right-11 flex items-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm rounded-l-lg p-0.5 z-10 border border-slate-100 shadow-sm">
          <ShareButton 
            title={`Climb: ${climb.name}`} 
            text={`I just checked out ${climb.name} (${climb.grade}) at ${climb.location.name}!`} 
          />
          <button 
             onClick={(e) => { e.stopPropagation(); onEdit(climb); }} 
             className="p-2 text-slate-400 hover:text-blue-500 transition-colors" 
             title="Edit Climb"
          >
            <Pencil size={18} />
          </button>
          <button 
             onClick={(e) => { e.stopPropagation(); setShowConfirm(true); }} 
             className="p-2 text-slate-400 hover:text-red-500 transition-colors" 
             title="Delete Climb"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )}

      {/* Favorite Button (Always visible unless selecting) */}
      {!selectionMode && (
         <button 
           onClick={(e) => { e.stopPropagation(); onToggleFavorite(climb.id); }}
           className={`absolute top-3 right-3 p-1.5 rounded-full z-20 transition-all duration-200 ${
             climb.favorite 
               ? 'text-yellow-400 bg-yellow-50 hover:bg-yellow-100 scale-100' 
               : 'text-slate-200 hover:text-yellow-400 hover:bg-slate-50'
           }`}
           title="Toggle Favorite"
         >
           <Star size={20} fill={climb.favorite ? "currentColor" : "none"} strokeWidth={climb.favorite ? 1 : 2} />
         </button>
      )}

      {/* Selection Checkbox */}
      {selectionMode && (
        <div className="absolute top-4 right-4 z-20">
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600 scale-110' : 'bg-white border-slate-200'}`}>
            {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 text-xs font-bold rounded-md uppercase tracking-wide ${climb.sent ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {climb.sent ? 'Sent' : 'Project'}
          </span>
          <span className="text-xs text-slate-400 font-medium flex items-center">
             <Calendar size={12} className="mr-1" /> {new Date(climb.date).toLocaleDateString()}
          </span>
        </div>
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-1 pr-16">{climb.name}</h3>
      <div className="flex items-center text-sm text-slate-600 mb-3 space-x-4">
        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold">{climb.grade}</span>
        <span>{climb.type}</span>
      </div>
      {climb.location.name && (
        <div className="flex items-center text-xs text-slate-400 mb-2">
          <Navigation size={12} className="mr-1" /> {climb.location.name}
        </div>
      )}
      <p className="text-sm text-slate-500 line-clamp-2">{climb.notes}</p>
    </div>
  );
};

// --- Pages ---

const Dashboard = ({ climbs }: { climbs: ClimbEntry[] }) => {
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const stats = {
    total: climbs.length,
    sent: climbs.filter(c => c.sent).length,
    topGrade: climbs.reduce((acc, curr) => curr.grade > acc ? curr.grade : acc, 'N/A'), // Simple string compare, ideally numeric
    recent: climbs.slice(-3).reverse()
  };

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeProgression(climbs);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">Welcome back! Here is your climbing overview.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Climbs', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Routes Sent', value: stats.sent, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Top Grade', value: stats.topGrade, icon: Mountain, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Latest Session', value: stats.recent[0]?.date || '-', icon: Calendar, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center space-x-4">
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-slate-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Grade Progression</h2>
            <div className="flex items-center gap-2">
              <ShareButton 
                title="My Grade Progression" 
                text={`Top Grade: ${stats.topGrade}. Total Ascents: ${stats.total}. Check out my stats on SummitLog!`} 
              />
              <button 
                onClick={handleAiAnalysis}
                disabled={loadingAi}
                className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Wand2 size={16} />
                <span>{loadingAi ? 'Analyzing...' : 'AI Analyze'}</span>
              </button>
            </div>
          </div>
          
          <StatsChart climbs={climbs} />

          {aiAnalysis && (
            <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              <h3 className="font-bold text-indigo-900 mb-2 flex items-center"><Wand2 size={16} className="mr-2"/> Coach's Insights</h3>
              {aiAnalysis}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Recent Climbs</h2>
          <div className="space-y-4">
            {stats.recent.length === 0 ? <p className="text-slate-400 text-sm">No recent activity.</p> : stats.recent.map(c => (
               <div key={c.id} className="flex items-start space-x-3 pb-4 border-b border-slate-50 last:border-0 last:pb-0">
                 <div className={`w-2 h-2 mt-2 rounded-full ${c.sent ? 'bg-green-500' : 'bg-amber-400'}`} />
                 <div>
                   <h4 className="font-semibold text-slate-800 text-sm">{c.name}</h4>
                   <p className="text-xs text-slate-500">{c.grade} • {c.location.name || 'Unknown'}</p>
                 </div>
               </div>
            ))}
          </div>
          <Link to="/log" className="mt-6 block text-center text-sm font-medium text-blue-600 hover:text-blue-700">
            View Full Log &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};

const ClimbingLog = ({ 
  climbs, 
  addClimb, 
  updateClimb, 
  deleteClimb, 
  deleteClimbs, 
  toggleFavorite
}: { 
  climbs: ClimbEntry[], 
  addClimb: (c: ClimbEntry) => void, 
  updateClimb: (c: ClimbEntry) => void,
  deleteClimb: (id: string) => void, 
  deleteClimbs: (ids: string[]) => void,
  toggleFavorite: (id: string) => void
}) => {
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<string>('All');
  const [minGrade, setMinGrade] = useState('');
  const [maxGrade, setMaxGrade] = useState('');
  
  // Selection State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newType, setNewType] = useState<ClimbType>('Indoor Bouldering');
  const [newSent, setNewSent] = useState(false);
  const [newNotes, setNewNotes] = useState('');
  
  // Location State
  const [locationName, setLocationName] = useState('');
  const [newLat, setNewLat] = useState<number>(0);
  const [newLng, setNewLng] = useState<number>(0);

  // AI Location Search State
  const [locQuery, setLocQuery] = useState('');
  const [isSearchingLoc, setIsSearchingLoc] = useState(false);
  const [mapCenter, setMapCenter] = useState<{lat: number, lng: number} | undefined>(undefined);
  const [attributionUrl, setAttributionUrl] = useState<string>('');

  const filteredClimbs = climbs.filter(c => {
    // 1. Type Filter
    let matchesType = true;
    if (filter === 'All') matchesType = true;
    else if (filter === 'Favorites') matchesType = c.favorite || false;
    else if (filter === 'Indoor') matchesType = c.type.includes('Indoor');
    else if (filter === 'Outdoor') matchesType = c.type.includes('Outdoor');
    else matchesType = c.type === filter;

    if (!matchesType) return false;

    // 2. Grade Range Filter
    if (minGrade || maxGrade) {
       // We use the same 'type' context logic as StatsChart, defaulting to empty string if generic
       // but strictly speaking gradeToValue uses the 'type' to distinguish Font vs Sport.
       // We'll pass the climb's type to accurately value the climb.
       const climbVal = gradeToValue(c.grade, c.type);
       
       // For the filter inputs, we guess context based on the current filter selection or climb type
       // If user is filtering "Indoor Bouldering", we treat inputs as boulder grades.
       const isBoulderingContext = filter.toLowerCase().includes('bouldering');
       const contextType = isBoulderingContext ? 'bouldering' : '';

       if (minGrade) {
         const minVal = gradeToValue(minGrade, contextType);
         if (climbVal < minVal) return false;
       }
       if (maxGrade) {
         const maxVal = gradeToValue(maxGrade, contextType);
         if (climbVal > maxVal) return false;
       }
    }

    return true;
  });

  // Reset form helper
  const resetForm = () => {
    setEditingId(null);
    setNewName(''); 
    setNewGrade(''); 
    setNewType('Indoor Bouldering');
    setNewSent(false);
    setNewNotes(''); 
    setLocationName(''); 
    setNewLat(0); 
    setNewLng(0); 
    setLocQuery(''); 
    setAttributionUrl('');
    setMapCenter(undefined);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (climb: ClimbEntry) => {
    setEditingId(climb.id);
    setNewName(climb.name);
    setNewGrade(climb.grade);
    setNewType(climb.type);
    setNewSent(climb.sent);
    setNewNotes(climb.notes);
    setLocationName(climb.location.name);
    setNewLat(climb.location.lat);
    setNewLng(climb.location.lng);
    
    if (climb.location.lat !== 0 || climb.location.lng !== 0) {
      setMapCenter({ lat: climb.location.lat, lng: climb.location.lng });
    }
    
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const climbData: ClimbEntry = {
      id: editingId || Date.now().toString(),
      name: newName,
      grade: newGrade,
      type: newType,
      sent: newSent,
      notes: newNotes,
      date: editingId ? (climbs.find(c => c.id === editingId)?.date || new Date().toISOString()) : new Date().toISOString(),
      location: {
        lat: newLat,
        lng: newLng,
        name: locationName
      },
      favorite: editingId ? (climbs.find(c => c.id === editingId)?.favorite) : false
    };

    if (editingId) {
      updateClimb(climbData);
    } else {
      addClimb(climbData);
    }
    
    setShowModal(false);
    resetForm();
  };

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    deleteClimbs(Array.from(selectedIds));
    setSelectedIds(new Set());
    setSelectionMode(false);
    setShowDeleteConfirm(false);
  };

  const handleLocationSearch = async () => {
    if (!locQuery) return;
    setIsSearchingLoc(true);
    const { places, sourceUrl } = await findPlaces(locQuery);
    setIsSearchingLoc(false);

    if (places && places.length > 0) {
      const best = places[0];
      setLocationName(best.name);
      setNewLat(best.lat);
      setNewLng(best.lng);
      setMapCenter({ lat: best.lat, lng: best.lng });
      setAttributionUrl(sourceUrl || '');
    }
  };

  return (
    <div className="animate-fade-in relative h-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Climbing Log</h1>
           <p className="text-slate-500">Track every ascent, project, and session.</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectionMode ? (
             <div className="flex items-center space-x-2 animate-in slide-in-from-right fade-in duration-200">
               <button 
                 onClick={() => {
                   setSelectionMode(false);
                   setSelectedIds(new Set());
                 }}
                 className="flex items-center space-x-1 px-4 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
               >
                 <X size={18} />
                 <span>Cancel</span>
               </button>
               <button 
                 onClick={() => setShowDeleteConfirm(true)}
                 disabled={selectedIds.size === 0}
                 className="flex items-center space-x-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 px-4 py-2 rounded-xl transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 <Trash2 size={18} />
                 <span>Delete ({selectedIds.size})</span>
               </button>
             </div>
          ) : (
             <>
                <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all">
                    <input 
                      placeholder="Min" 
                      value={minGrade} 
                      onChange={e => setMinGrade(e.target.value)} 
                      className="w-10 text-sm outline-none bg-transparent placeholder:text-slate-400 text-slate-700 font-medium" 
                      title="Minimum Grade (e.g. 5.10a or V3)"
                    />
                    <span className="text-slate-300">-</span>
                    <input 
                      placeholder="Max" 
                      value={maxGrade} 
                      onChange={e => setMaxGrade(e.target.value)} 
                      className="w-10 text-sm outline-none bg-transparent placeholder:text-slate-400 text-slate-700 font-medium" 
                      title="Maximum Grade (e.g. 5.12 or V8)"
                    />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Filter size={16} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="appearance-none pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer shadow-sm"
                  >
                    <option value="All">All Climbs</option>
                    <option value="Favorites">★ Favorites</option>
                    <optgroup label="Broad Categories">
                      <option value="Indoor">Indoor (All)</option>
                      <option value="Outdoor">Outdoor (All)</option>
                    </optgroup>
                    <optgroup label="Specific Disciplines">
                      <option value="Indoor Bouldering">Indoor Bouldering</option>
                      <option value="Indoor Top Rope">Indoor Top Rope</option>
                      <option value="Indoor Lead">Indoor Lead</option>
                      <option value="Outdoor Bouldering">Outdoor Bouldering</option>
                      <option value="Outdoor Sport">Outdoor Sport</option>
                      <option value="Outdoor Trad">Outdoor Trad</option>
                    </optgroup>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <ChevronDown size={16} className="text-slate-400" />
                  </div>
                </div>

                <button 
                   onClick={() => setSelectionMode(true)}
                   className="p-2.5 text-slate-500 hover:text-slate-900 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 hover:shadow-sm transition-all"
                   title="Select Climbs"
                >
                   <CheckSquare size={20} />
                </button>
                <button 
                  onClick={handleOpenAdd}
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition-all transform hover:scale-105 active:scale-95"
                >
                  <Plus size={18} />
                  <span className="font-semibold">Log Climb</span>
                </button>
             </>
          )}
        </div>
      </div>

      {filteredClimbs.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center group relative overflow-hidden transition-all duration-300 hover:border-blue-200 hover:shadow-sm">
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-12px); }
            }
            .animate-float {
              animation: float 4s ease-in-out infinite;
            }
          `}</style>
          
          <div className="relative mb-6 p-4">
            <div className="absolute inset-0 bg-blue-100 rounded-full filter blur-2xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 scale-150"></div>
            <Mountain className="relative h-24 w-24 text-slate-300 animate-float group-hover:text-blue-500 transition-colors duration-500" strokeWidth={1} />
          </div>
          
          <h3 className="text-xl font-bold text-slate-900 mb-2 relative z-10">No climbs found</h3>
          <p className="text-slate-500 max-w-xs mx-auto relative z-10 transition-transform duration-300 group-hover:-translate-y-1">
            {filter === 'Favorites' ? "You haven't favorited any climbs yet. Click the star icon on a climb to add it here!" : (filter === 'All' && !minGrade && !maxGrade ? 'The wall is waiting. Log your first ascent and start your journey!' : `No climbs match your filters. Try adjusting the grade range or type!`)}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClimbs.map(climb => (
            <ClimbCard 
              key={climb.id} 
              climb={climb} 
              onDelete={deleteClimb}
              onEdit={handleEdit}
              onToggleFavorite={toggleFavorite}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(climb.id)}
              onToggleSelect={toggleSelection}
            />
          ))}
        </div>
      )}

      {/* Bulk Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95 duration-200">
             <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <Trash2 size={24} />
             </div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">Delete {selectedIds.size} Climbs?</h3>
             <p className="text-slate-500 mb-6 text-sm">This action cannot be undone. Are you sure you want to permanently remove these entries?</p>
             <div className="flex space-x-3">
               <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
               <button onClick={handleBulkDelete} className="flex-1 px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 shadow-md transition-colors">Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{editingId ? 'Edit Climb' : 'Log New Climb'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <Plus size={24} className="transform rotate-45" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <form id="climbForm" onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Route Name</label>
                    <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="e.g. The Nose" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade</label>
                    <input required type="text" value={newGrade} onChange={e => setNewGrade(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="e.g. 5.10c or V4" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={newType} onChange={e => setNewType(e.target.value as ClimbType)} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                      <option>Indoor Bouldering</option>
                      <option>Indoor Lead</option>
                      <option>Indoor Top Rope</option>
                      <option>Outdoor Bouldering</option>
                      <option>Outdoor Sport</option>
                      <option>Outdoor Trad</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <div className="flex items-center space-x-4 mt-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={newSent} onChange={() => setNewSent(true)} className="text-blue-600 focus:ring-blue-500" />
                        <span className="text-slate-700">Sent (Clean)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" checked={!newSent} onChange={() => setNewSent(false)} className="text-amber-600 focus:ring-amber-500" />
                        <span className="text-slate-700">Project / Attempt</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Location Search Section */}
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                   <div className="flex space-x-2 mb-3">
                     <div className="relative flex-1">
                       <input 
                         type="text" 
                         value={locQuery} 
                         onChange={e => setLocQuery(e.target.value)}
                         onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLocationSearch())}
                         placeholder="Search place with AI (e.g. 'Camp 4 Yosemite')" 
                         className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500" 
                       />
                       <Search size={18} className="absolute left-3 top-2.5 text-slate-400" />
                     </div>
                     <button 
                       type="button" 
                       onClick={handleLocationSearch}
                       disabled={isSearchingLoc || !locQuery}
                       className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center"
                     >
                       {isSearchingLoc ? <Wand2 className="animate-spin" size={16} /> : <Wand2 size={16} className="mr-1" />}
                       AI Search
                     </button>
                   </div>

                   <input type="text" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="Location Name" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:border-blue-500 mb-3" />
                   
                   <div className="h-64 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative">
                      <ClimbMap 
                        climbs={climbs} 
                        isSelecting={true}
                        center={mapCenter}
                        zoom={mapCenter ? 14 : undefined}
                        onLocationSelect={(loc) => {
                          setNewLat(loc.lat);
                          setNewLng(loc.lng);
                        }}
                      />
                   </div>
                   <div className="flex justify-between items-start mt-1">
                      <p className="text-xs text-slate-400">
                        {newLat !== 0 
                          ? `Coordinates: ${newLat.toFixed(5)}, ${newLng.toFixed(5)}` 
                          : 'Tap map to set.'}
                      </p>
                      {attributionUrl && (
                        <a href={attributionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 flex items-center hover:underline">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Google_Maps_icon_%282020%29.svg/1200px-Google_Maps_icon_%282020%29.svg.png" className="w-3 h-3 mr-1" alt="Google Maps" />
                          View on Google Maps
                        </a>
                      )}
                   </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                  <textarea 
                    value={newNotes} 
                    onChange={e => setNewNotes(e.target.value)} 
                    rows={5} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-y" 
                    placeholder="Record details about the climb (beta, conditions, personal reflections)..." 
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancel</button>
              <button type="submit" form="climbForm" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 shadow-md transition-all">{editingId ? 'Update Climb' : 'Save Climb'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MapPage = ({ climbs }: { climbs: ClimbEntry[] }) => {
  return (
    <div className="h-full flex flex-col animate-fade-in">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">World Map</h1>
          <p className="text-slate-500">Visualize your journey across the globe.</p>
        </div>
        <ShareButton title="My Climbing Map" text={`I've climbed in ${climbs.length} locations around the world!`} />
      </header>
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
        <ClimbMap climbs={climbs} />
      </div>
    </div>
  );
};

const GearLocker = ({ gear, addReview }: { gear: GearReview[], addReview: (r: GearReview) => void }) => {
  const [showForm, setShowForm] = useState(false);
  // Form state
  const [itemName, setItemName] = useState('');
  const [category, setCategory] = useState<GearReview['category']>('Shoes');
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isAiWriting, setIsAiWriting] = useState(false);

  const handleAiAssist = async () => {
    if (!itemName || !reviewText) return;
    setIsAiWriting(true);
    const suggestion = await suggestGearReview(itemName, category, reviewText);
    if (suggestion) setReviewText(suggestion);
    setIsAiWriting(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addReview({
      id: Date.now().toString(),
      itemName,
      category,
      rating,
      reviewText,
    });
    setShowForm(false);
    setItemName(''); setReviewText('');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <div>
           <h1 className="text-3xl font-bold text-slate-900">Gear Locker</h1>
           <p className="text-slate-500">Reviews of the kit that keeps you safe.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl shadow-lg hover:bg-slate-800 transition-all flex items-center space-x-2"
        >
          {showForm ? <span className="transform rotate-45"><Plus/></span> : <><Plus size={18} /><span>Add Review</span></>}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 mb-8 animate-slide-down">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input required value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Item Name (e.g. Solution Comp)" className="w-full px-4 py-2 border rounded-lg outline-none focus:border-blue-500" />
              <select value={category} onChange={e => setCategory(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg outline-none focus:border-blue-500">
                <option>Shoes</option>
                <option>Harness</option>
                <option>Chalk</option>
                <option>Hardware</option>
                <option>Apparel</option>
                <option>Other</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-700 text-sm font-medium">Rating:</span>
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button" onClick={() => setRating(r)} className={`p-1 transition-transform hover:scale-110 ${rating >= r ? 'text-yellow-400' : 'text-slate-300'}`}>
                  <Star fill={rating >= r ? "currentColor" : "none"} size={24} />
                </button>
              ))}
            </div>
            <div className="relative">
              <textarea 
                value={reviewText} 
                onChange={e => setReviewText(e.target.value)} 
                placeholder="Write your review here (or type a few keywords and click AI Assist)..." 
                rows={4} 
                className="w-full px-4 py-2 border rounded-lg outline-none focus:border-blue-500" 
              />
              <button 
                type="button" 
                onClick={handleAiAssist}
                disabled={isAiWriting || !itemName}
                className="absolute bottom-3 right-3 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md border border-indigo-100 flex items-center hover:bg-indigo-100 transition-colors"
              >
                <Wand2 size={12} className="mr-1" />
                {isAiWriting ? 'Generating...' : 'AI Enhance'}
              </button>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Post Review</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gear.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col relative group">
             <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <ShareButton 
                   title={`Gear Review: ${item.itemName}`}
                   text={`My review of ${item.itemName} (${item.category}): ${item.rating}/5 stars. "${item.reviewText}"`}
                />
             </div>
            <div className="flex justify-between items-start mb-2 pr-10">
              <div>
                <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">{item.category}</span>
                <h3 className="text-lg font-bold text-slate-800">{item.itemName}</h3>
              </div>
              <div className="flex text-yellow-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill={i < item.rating ? "currentColor" : "none"} className={i < item.rating ? "" : "text-slate-200"} />
                ))}
              </div>
            </div>
            <p className="text-slate-600 text-sm leading-relaxed flex-1 italic">"{item.reviewText}"</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Layout ---

const App: React.FC = () => {
  const [climbs, setClimbs] = useState<ClimbEntry[]>(() => {
    const saved = localStorage.getItem('climbs');
    return saved ? JSON.parse(saved) : MOCK_CLIMBS;
  });

  const [gear, setGear] = useState<GearReview[]>(() => {
    const saved = localStorage.getItem('gear');
    return saved ? JSON.parse(saved) : MOCK_GEAR;
  });

  useEffect(() => {
    localStorage.setItem('climbs', JSON.stringify(climbs));
  }, [climbs]);

  useEffect(() => {
    localStorage.setItem('gear', JSON.stringify(gear));
  }, [gear]);

  const addClimb = (climb: ClimbEntry) => setClimbs([...climbs, climb]);
  const updateClimb = (updatedClimb: ClimbEntry) => setClimbs(climbs.map(c => c.id === updatedClimb.id ? updatedClimb : c));
  const deleteClimb = (id: string) => setClimbs(climbs.filter(c => c.id !== id));
  const deleteClimbs = (ids: string[]) => setClimbs(climbs.filter(c => !ids.includes(c.id)));
  const toggleFavorite = (id: string) => setClimbs(climbs.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c));
  const addReview = (review: GearReview) => setGear([...gear, review]);

  const LocationHandler = () => {
    const location = useLocation();
    return (
      <nav className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white h-screen fixed left-0 top-0 p-6 z-10">
        <div className="flex items-center space-x-3 mb-10 px-2">
          <div className="bg-slate-900 p-2 rounded-lg">
            <Mountain className="text-white h-6 w-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">SummitLog</span>
        </div>
        
        <div className="space-y-2 flex-1">
          <NavLink to="/" icon={Activity} label="Dashboard" active={location.pathname === '/'} />
          <NavLink to="/log" icon={Navigation} label="Climb Log" active={location.pathname === '/log'} />
          <NavLink to="/map" icon={MapIcon} label="Map View" active={location.pathname === '/map'} />
          <NavLink to="/gear" icon={ShoppingBag} label="Gear Locker" active={location.pathname === '/gear'} />
        </div>

        <div className="mt-auto pt-6 border-t border-slate-100">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
            <p className="text-xs font-medium opacity-80 mb-1">Total Ascents</p>
            <p className="text-2xl font-bold">{climbs.length}</p>
          </div>
        </div>
      </nav>
    );
  };

  const MobileNav = () => {
    const location = useLocation();
    return (
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 z-50 flex justify-around shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link to="/" className={`p-2 rounded-lg ${location.pathname === '/' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><Activity size={24}/></Link>
        <Link to="/log" className={`p-2 rounded-lg ${location.pathname === '/log' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><Navigation size={24}/></Link>
        <Link to="/map" className={`p-2 rounded-lg ${location.pathname === '/map' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><MapIcon size={24}/></Link>
        <Link to="/gear" className={`p-2 rounded-lg ${location.pathname === '/gear' ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}><ShoppingBag size={24}/></Link>
      </nav>
    );
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
        <LocationHandler />
        
        <main className="flex-1 md:ml-64 p-4 md:p-8 lg:p-12 pb-24 md:pb-12 max-w-7xl mx-auto w-full">
          <Routes>
            <Route path="/" element={<Dashboard climbs={climbs} />} />
            <Route path="/log" element={<ClimbingLog climbs={climbs} addClimb={addClimb} updateClimb={updateClimb} deleteClimb={deleteClimb} deleteClimbs={deleteClimbs} toggleFavorite={toggleFavorite} />} />
            <Route path="/map" element={<MapPage climbs={climbs} />} />
            <Route path="/gear" element={<GearLocker gear={gear} addReview={addReview} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <MobileNav />
      </div>
    </Router>
  );
};

export default App;