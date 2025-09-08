import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Document from './pages/Document';
import DocumentSettings from './pages/DocumentSettings';
import './index.css';

function App() {
  return (
   
      <Router>
        <AuthProvider>
          <SocketProvider>
            <div className="min-h-screen bg-gray-50">
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/document/:id" element={
                  <ProtectedRoute>
                    <Document />
                  </ProtectedRoute>
                } />
                <Route path="/document/:id/settings" element={
                  <ProtectedRoute>
                    <DocumentSettings />
                  </ProtectedRoute>
                } />
              </Routes>
            </div>
          </SocketProvider>
        </AuthProvider>
      </Router>
 
  );
}

export default App;