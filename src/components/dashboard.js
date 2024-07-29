import React from 'react';
import './dashboard.css';

function Dashboard() {
    return (
      <div className="card">
        <div className="dashboard">
          <div className="section info-section">
            <div className="data">
              <span className="number">31</span>
              <span className="label">Clients</span>
            </div>
            <div className="data-separator"></div> {/* Separator line */}
            <div className="data">
              <span className="number">41</span>
              <span className="label">Returns</span>
            </div>
          </div>
          <div className="section chart-section">
            <div className="chart-container">
              <div className="pie-chart"></div>
              <div className="status-info">
                <ul>
                  <li><span className="dot work-in-process"></span>Work In Process</li>
                  <li><span className="dot review-pending"></span>Review Pending</li>
                  <li><span className="dot accepted"></span>Accepted</li>
                  <li><span className="dot paper-filed"></span>Paper Filed</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="section notes-section">
            <h3 className="notes-title">NOTES</h3>
            <ul>
              <li>Lorem ipsum dolor sit amet Consectetur adipiscing elit...</li>
              <li>Lorem ipsum dolor sit amet...</li>
              <li>Consectetur adipiscing elit Lorem ipsum dolor</li>
              <li>Lorem ipsum dolor sit amet...</li>
              <li>Consectetur adipiscing elit...</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

export default Dashboard;
