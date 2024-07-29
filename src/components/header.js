import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './header.css';

function Header() {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-left">
        <img src="/icons/logo.png" alt="Logo" className="header-logo" />
        <span className="header-title">Professional Dashboard</span>
      </div>
      <nav className="header-menu">
        <Link to="/" className="menu-link">Clients</Link>
        <div className="menu-divider"></div>
        <Link to="/admin" className="menu-link">Admin</Link>
        <div className="menu-divider"></div> 
        <Link to="/allreturns" className="menu-link">All Returns</Link>
      </nav>
      <button className="login-button" onClick={handleLoginClick}>Login</button>
    </header>
  );
}

export default Header;
