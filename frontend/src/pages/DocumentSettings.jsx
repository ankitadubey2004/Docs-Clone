import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const DocumentSettings = () => {
  const [document, setDocument] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [newCollaboratorId, setNewCollaboratorId] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState('viewer');
  const [users, setUsers] = useState([]);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDocument();
  }, [id]);

  const fetchDocument = async () => {
    try {
      const response = await axios.get(`/api/documents/${id}`);
      setDocument(response.data);
      setCollaborators(response.data.collaborators || []);

      if (response.data.canEdit) fetchUsersForDocument();
    } catch (error) {
      console.error('Error fetching document:', error);
    }
  };

  const fetchUsersForDocument = async () => {
    try {
      const response = await axios.get(`/api/users/for-document/${id}`);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users for document:', error);
    }
  };

  const addCollaborator = async () => {
    if (!newCollaboratorId) return alert('Select a user');
    try {
      await axios.post(`/api/documents/${id}/collaborators`, {
        userId: newCollaboratorId,
        role: newCollaboratorRole
      });
      setNewCollaboratorId('');
      fetchDocument();
    } catch (error) {
      console.error('Error adding collaborator:', error);
    }
  };

  const removeCollaborator = async (userId) => {
    try {
      await axios.delete(`/api/documents/${id}/collaborators/${userId}`);
      fetchDocument();
    } catch (error) {
      console.error('Error removing collaborator:', error);
    }
  };

  const updateCollaboratorRole = async (userId, role) => {
    try {
      await axios.post(`/api/documents/${id}/collaborators`, { userId, role });
      fetchDocument();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };

  if (!document) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading document settings...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{document.title} Settings</h1>
            <p className="mt-1 text-sm text-gray-500">Manage collaborators and visibility settings</p>
          </div>
          <button
            onClick={() => navigate(`/document/${id}`)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Document
          </button>
        </div>

        {/* Collaborators Section */}
        {document.canEdit && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Collaborators</h2>

            {/* Add Collaborator */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6 p-4 bg-gray-50 rounded-lg">
              <select
                value={newCollaboratorId}
                onChange={(e) => setNewCollaboratorId(e.target.value)}
                className="border border-gray-300 rounded-md p-2 flex-1 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Select user to add</option>
                {users
                  .filter(u => !collaborators.some(c => c.user?._id === u._id))
                  .map(u => (
                    <option key={u._id} value={u._id}>{u.username} ({u.email})</option>
                  ))}
              </select>

              <select
                value={newCollaboratorRole}
                onChange={(e) => setNewCollaboratorRole(e.target.value)}
                className="border border-gray-300 rounded-md p-2 w-full sm:w-32 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>

              <button
                onClick={addCollaborator}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors w-full sm:w-auto"
              >
                Add Collaborator
              </button>
            </div>

            {/* Existing Collaborators */}
            <div className="space-y-3">
              {collaborators.map((c, index) => (
                <div
                  key={c.user?._id || index}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-3"
                >
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                      <span className="font-medium text-indigo-800">{c.user?.username?.charAt(0).toUpperCase() || 'U'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-800">{c.user?.username || 'Unknown User'}</span>
                      <p className="text-sm text-gray-500">{c.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <select
                      value={c.role}
                      onChange={(e) => updateCollaboratorRole(c.user?._id, e.target.value)}
                      className="border border-gray-300 rounded-md p-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      disabled={!c.user?._id}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="editor">Editor</option>
                    </select>
                    <button
                      onClick={() => c.user?._id && removeCollaborator(c.user._id)}
                      className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 transition-colors text-sm"
                      disabled={!c.user?._id}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visibility Section */}
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Document Visibility</h2>
          <label className="flex items-start space-x-3">
            <div className="flex items-center h-5 mt-1">
              <input
                type="checkbox"
                checked={document.isPublic}
                onChange={async (e) => {
                  try {
                    await axios.put(`/api/documents/${id}`, { isPublic: e.target.checked });
                    fetchDocument();
                  } catch (error) {
                    console.error('Error updating visibility:', error);
                  }
                }}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-700 font-medium">Make document public</span>
              <p className="text-sm text-gray-500 mt-1">
                Public documents can be viewed by anyone with the link, even without an account.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default DocumentSettings;