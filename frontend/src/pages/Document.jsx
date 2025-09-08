import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import TextEditor from '../components/TextEditor';
import Chat from '../components/Chat';
import axios from 'axios';
import { saveAs } from 'file-saver';

const Document = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const socket = useSocket();

  const [documentData, setDocumentData] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [error, setError] = useState(null);
  const exportMenuRef = useRef(null);

  const handleClickOutside = useCallback((event) => {
    if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
      setShowExportMenu(false);
    }
  }, []);

  useEffect(() => {
    fetchDocument();
  }, [id]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Socket presence updates
  useEffect(() => {
    if (!socket) return;

    const dedupeUsers = (users) => {
      const map = new Map();
      users.forEach(u => map.set(u.userId, u));
      return Array.from(map.values());
    };

    socket.on('users-update', (users) => setActiveUsers(dedupeUsers(users)));
    socket.on('user-joined', ({ userId, username }) => setActiveUsers(prev => dedupeUsers([...prev, { userId, username }])));
    socket.on('user-left', ({ userId }) => setActiveUsers(prev => prev.filter(u => u.userId !== userId)));

    return () => {
      socket.off('users-update');
      socket.off('user-joined');
      socket.off('user-left');
    };
  }, [socket]);

  const fetchDocument = async () => {
    try {
      const res = await axios.get(`/api/documents/${id}`);
      setDocumentData(res.data);
      setTitle(res.data.title);
      setCanEdit(res.data.canEdit);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load document');
      if (err.response?.status === 404) setTimeout(() => navigate('/'), 2000);
    } finally { setLoading(false); }
  };

  const onSaveComplete = async (contentDelta) => {
    try {
      setSaving(true);
      await axios.put(`/api/documents/${id}`, { contentDelta, title });
      setSaving(false);
    } catch (err) { console.error(err); setSaving(false); }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    if (documentData) {
      if (documentData.saveTitleTimeout) clearTimeout(documentData.saveTitleTimeout);
      documentData.saveTitleTimeout = setTimeout(() => {
        axios.put(`/api/documents/${id}`, { title }).catch(console.error);
      }, 1200);
    }
  };

  const exportFile = async (format) => {
    try {
      const res = await axios.get(`/api/documents/${id}/export?format=${format}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const disposition = res.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : `${title || 'document'}.${format === 'pdf' ? 'pdf' : 'docx'}`;
      saveAs(new Blob([res.data], { type: res.headers['content-type'] }), filename);
    } catch (err) { console.error(err); } finally { setShowExportMenu(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading document...</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="text-center p-6 bg-white rounded-xl shadow-md max-w-md">
        <svg className="w-16 h-16 text-red-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-xl font-medium text-gray-900">Error Loading Document</h3>
        <p className="mt-2 text-gray-600">{error}</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="bg-white shadow-sm p-4 flex justify-between items-center border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/')} 
            className="text-gray-600 hover:text-gray-800 p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <input 
            type="text" 
            value={title} 
            onChange={handleTitleChange}
            className="text-xl font-semibold border-none focus:outline-none focus:ring-0 bg-transparent"
            readOnly={!canEdit} 
          />
        </div>

        <div className="flex items-center space-x-4">
          {saving && (
            <div className="flex items-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
              Saving...
            </div>
          )}
          
          <div className="flex items-center space-x-2">
            {activeUsers.map(u => (
              <div key={u.userId} className="flex items-center" title={u.username}>
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-sm font-medium">
                  {u.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setShowChat(!showChat)} 
              className={`p-2 rounded-md transition-colors ${showChat ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              title={showChat ? 'Hide Chat' : 'Show Chat'}
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
            
            <div className="relative" ref={exportMenuRef}>
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)} 
                className="p-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                title="Export Document"
              >
                <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
                  <button 
                    onClick={() => exportFile('pdf')} 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as PDF
                  </button>
                  <button 
                    onClick={() => exportFile('word')} 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Export as Word
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className={`flex-1 overflow-auto p-6 ${showChat ? 'w-3/4' : 'w-full'}`}>
          <TextEditor
            docId={id}
            role={canEdit ? 'Editor' : 'Viewer'}
            initialDelta={documentData?.contentDelta || { ops: [] }}
            onSaveComplete={onSaveComplete}
          />
        </div>

        {showChat && (
          <div className="w-1/4 border-l">
            <Chat documentId={id} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Document;