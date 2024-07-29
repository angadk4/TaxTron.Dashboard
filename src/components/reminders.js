import React from 'react';
import './reminders.css';


function Reminders() {
    const data = [
        { client: "Client 1", date: "2024/05/07", daysRemaining: "1 day" },
        { client: "Client 2", date: "2024/05/08", daysRemaining: "2 days" },
        { client: "Client 3", date: "2024/05/09", daysRemaining: "3 days" },
        { client: "Client 4", date: "2024/05/10", daysRemaining: "4 days" },
    ];

    return (
        <div className="card">
            <div className="reminders">
                {['Upcoming T1', 'Upcoming T2', 'Upcoming T3'].map((title, index) => (
                    <div key={index} className="section">
                        <h2 className="section-title">{title}</h2>
                        <hr className="section-divider" />
                        {data.map((item, idx) => (
                            <p key={idx} className="info-text">
                                {`${item.client} - ${item.date} (${item.daysRemaining})`}
                            </p>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Reminders;
