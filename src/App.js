import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import FilterTable from './components/filtertable';
import Returns from './components/returns';
import AllReturns from './components/AllReturns';
import Header from './components/header';
import Login from './components/login';

function NavigationButton({ onBackClick }) {
  const location = useLocation();

  return (
    <div className="top-section">
      {location.pathname.includes('/returns') && (
        <button className="navigate-button" onClick={onBackClick}>Back to Clients</button>
      )}
    </div>
  );
}

function App() {
  const [selectedTab, setSelectedTab] = useState('T1'); // To store the selected tab
  const navigate = useNavigate();

  const handleBackClick = () => {
    navigate('/', { state: { selectedTab } });
  };

  return (
    <div className="App">
      <Header />
      <NavigationButton onBackClick={handleBackClick} />
      <div className="bottom-section">
        <Routes>
          <Route path="/" element={<FilterTable setSelectedTab={setSelectedTab} />} />
          <Route path="/returns/:clientId" element={<Returns selectedTab={selectedTab} />} />
          <Route path="/allreturns" element={<AllReturns />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </div>
    </div>
  );
}

export default function AppWithRouter() {
  return (
    <Router>
      <App />
    </Router>
  );
}
