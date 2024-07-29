import React, { useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from 'react-router-dom';
import './App.css';
import FilterTable from './components/filtertable';
import Returns from './components/returns';
import AllReturns from './components/AllReturns';
import APIController from './components/clientfetch';
import Header from './components/header';
import Login from './components/login'; // Import the new Login component

function NavigationButton() {
  const location = useLocation();

  return (
    <div className="top-section">
      {location.pathname.includes('/returns') && (
        <Link to="/">
          <button className="navigate-button">Back to Clients</button>
        </Link>
      )}
    </div>
  );
}

function App() {
  const [data, setData] = useState(null);

  return (
    <Router>
      <div className="App">
        <Header />
        <NavigationButton />
        <div className="bottom-section">
          <Routes>
            <Route path="/" element={<FilterTable />} />
            <Route path="/returns/:clientId" element={<Returns />} />
            <Route path="/allreturns" element={<AllReturns />} />
            <Route path="/login" element={<Login />} /> {/* Add this line */}
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
