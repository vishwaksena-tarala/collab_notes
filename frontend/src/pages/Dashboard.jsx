import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/Navbar';
import NoteCard from '../components/NoteCard';
import { notesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard — lists all notes (mine + shared), with search and tab filtering.
 */
const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('mine');      // 'mine' | 'shared'
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  // Fetch all notes on mount
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const { data } = await notesAPI.getAll();
        setNotes(data.notes);
      } catch {
        toast.error('Failed to load notes');
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  // Create a new blank note and navigate to its editor
  const handleCreateNote = async () => {
    setCreating(true);
    try {
      const { data } = await notesAPI.create({ title: 'Untitled Note', content: '' });
      navigate(`/editor/${data.note._id}`);
    } catch {
      toast.error('Failed to create note');
      setCreating(false);
    }
  };

  // Remove a note from local state after deletion
  const handleDeleteNote = (id) => {
    setNotes((prev) => prev.filter((n) => n._id !== id));
  };

  // Filter notes by tab and search query
  const filteredNotes = useMemo(() => {
    let result = notes;

    if (tab === 'mine') {
      result = result.filter(
        (n) => n.owner?._id === user?.id || n.owner === user?.id
      );
    } else {
      result = result.filter(
        (n) => n.owner?._id !== user?.id && n.owner !== user?.id
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) => n.title?.toLowerCase().includes(q));
    }

    return result;
  }, [notes, tab, search, user]);

  const myCount     = notes.filter((n) => n.owner?._id === user?.id || n.owner === user?.id).length;
  const sharedCount = notes.filter((n) => n.owner?._id !== user?.id && n.owner !== user?.id).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              My Notes
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
              {notes.length} note{notes.length !== 1 ? 's' : ''} total
            </p>
          </div>
          <button
            id="create-note-btn"
            onClick={handleCreateNote}
            disabled={creating}
            className="btn-primary"
          >
            {creating ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
            New Note
          </button>
        </div>

        {/* Search bar */}
        <div className="relative mb-6">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-notes"
            type="text"
            placeholder="Search notes by title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 max-w-lg"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit mb-6">
          <button
            id="tab-mine"
            onClick={() => setTab('mine')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === 'mine'
                ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            My Notes
            <span className="ml-2 text-xs bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
              {myCount}
            </span>
          </button>
          <button
            id="tab-shared"
            onClick={() => setTab('shared')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === 'shared'
                ? 'bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Shared With Me
            <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full">
              {sharedCount}
            </span>
          </button>
        </div>

        {/* Note grid */}
        {loading ? (
          /* Skeleton loader */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass rounded-2xl p-5 h-40">
                <div className="skeleton h-5 w-3/4 rounded-lg mb-3" />
                <div className="skeleton h-3 w-full rounded mb-2" />
                <div className="skeleton h-3 w-5/6 rounded mb-2" />
                <div className="skeleton h-3 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : filteredNotes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => (
              <NoteCard
                key={note._id}
                note={note}
                currentUserId={user?.id}
                onDelete={handleDeleteNote}
              />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">{tab === 'mine' ? '📝' : '🤝'}</div>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {search
                ? `No notes matching "${search}"`
                : tab === 'mine'
                ? 'No notes yet'
                : 'No shared notes'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {!search && tab === 'mine' && 'Create your first note to get started.'}
            </p>
            {!search && tab === 'mine' && (
              <button onClick={handleCreateNote} className="btn-primary">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Note
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
