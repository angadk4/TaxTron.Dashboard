// login.js
import React from 'react';
import { FaUser, FaKey } from 'react-icons/fa'; // Importing icons
import './login.css';

function Login() {
  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Welcome</h1>
        <div className="login-logo">
          <img src="/icons/logo.png" alt="Logo" />
        </div>
        <form className="login-form">
          <div className="input-container">
            <FaUser className="icon" />
            <input type="text" placeholder="ID" className="login-input" />
          </div>
          <div className="input-container">
            <FaKey className="icon" />
            <input type="password" placeholder="Password" className="login-input" />
          </div>
          <button type="submit" className="unique-login-btn">Login</button>
        </form>
        <p className="signup-text">
          Don't have an account? <a href="/signup">Sign Up</a>
        </p>
      </div>
    </div>
  );
}

export default Login;
