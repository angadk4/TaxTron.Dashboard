import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactPaginate from 'react-paginate';
import './AllReturns.css';
import APIController from './clientfetch';
import Papa from 'papaparse';

const baseURL = '/taxreturnsearch/getreturnsdata/';
const userID = '000779638e3141fcb06a56bdc5cc484e';

const filterDisplayNames = {
  selfEmployed: 'Self Employed',
  foreignTaxFilingRequired: 'Foreign Tax Filing Required',
  discountedReturn: 'Discounted Return',
  gstDue: 'GST Due',
  expectedRefund: 'Expected Refund',
  payrollSlipsDue: 'Payroll Slips Due',
  t2TaxableIncome: 'Taxable Income',
  t2CapitalLoss: 'Capital Loss',
  t2NonCapitalLoss: 'Non Capital Loss',
  hstReturnFiled: 'HST',
  t2NonResident: 'Non Resident',
  bNonResidentTrust: 'Residency of Trust',
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (!isNaN(date)) {
    return date.toISOString().split('T')[0];
  }
  return 'N/A';
};

const AllReturns = () => {
  const [activeTab, setActiveTab] = useState('T1');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedBirthMonth, setSelectedBirthMonth] = useState('');
  const [selectedBirthDate, setSelectedBirthDate] = useState('');
  const [appliedCurFilters, setAppliedCurFilters] = useState({});
  const [appliedPrevFilters, setAppliedPrevFilters] = useState({});
  const [appliedT2Filters, setAppliedT2Filters] = useState({});
  const [appliedT3Filters, setAppliedT3Filters] = useState({});
  const [curCheckBoxState, setCurCheckBoxState] = useState({
    selfEmployed: false,
    foreignTaxFilingRequired: false,
    discountedReturn: false,
    gstDue: false,
    expectedRefund: false,
    payrollSlipsDue: false,
  });
  const [prevCheckBoxState, setPrevCheckBoxState] = useState({
    selfEmployed: false,
    foreignTaxFilingRequired: false,
    discountedReturn: false,
    gstDue: false,
    expectedRefund: false,
    payrollSlipsDue: false,
  });
  const [t2CheckBoxState, setT2CheckBoxState] = useState({
    t2TaxableIncome: false,
    t2CapitalLoss: false,
    t2NonCapitalLoss: false,
    hstReturnFiled: false,
    t2NonResident: false,
  });
  const [t3CheckBoxState, setT3CheckBoxState] = useState({
    bNonResidentTrust: false,
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(0);
  const itemsPerPage = 20;

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'long' }))
  , []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('ProductCode', activeTab);
    if (debouncedSearchQuery) {
      params.append('SearchText', debouncedSearchQuery);
    }
    if (selectedLocation) {
      params.append('Location', selectedLocation);
    }
    const filters = [];
    if (activeTab === 'T1') {
      if (Object.values(appliedCurFilters).some(v => v)) {
        const curPrefix = 'b';
        if (appliedCurFilters.selfEmployed) filters.push(`${curPrefix}SelfEmployed eq true`);
        if (appliedCurFilters.foreignTaxFilingRequired) filters.push(`${curPrefix}ForeignTaxFilingRequired eq true`);
        if (appliedCurFilters.discountedReturn) filters.push(`${curPrefix}DiscountedRet eq true`);
        if (appliedCurFilters.gstDue) filters.push(`${curPrefix}GSTDue eq true`);
        if (appliedCurFilters.expectedRefund) filters.push(`${curPrefix}ExpectedRefund eq true`);
        if (appliedCurFilters.payrollSlipsDue) filters.push(`${curPrefix}PayrollSlipsDue eq true`);
      }
      if (Object.values(appliedPrevFilters).some(v => v)) {
        const prevPrefix = 'Pre_b';
        if (appliedPrevFilters.selfEmployed) filters.push(`${prevPrefix}SelfEmployed eq true`);
        if (appliedPrevFilters.foreignTaxFilingRequired) filters.push(`${prevPrefix}ForeignTaxFilingRequired eq true`);
        if (appliedPrevFilters.discountedReturn) filters.push(`${prevPrefix}DiscountedRet eq true`);
        if (appliedPrevFilters.gstDue) filters.push(`${prevPrefix}GSTDue eq true`);
        if (appliedPrevFilters.expectedRefund) filters.push(`${prevPrefix}ExpectedRefund eq true`);
        if (appliedPrevFilters.payrollSlipsDue) filters.push(`${prevPrefix}PayrollSlipsDue eq true`);
      }
    } else if (activeTab === 'T2') {
      if (Object.values(appliedT2Filters).some(v => v)) {
        if (appliedT2Filters.t2TaxableIncome) filters.push('bT2TaxableIncome eq true');
        if (appliedT2Filters.t2CapitalLoss) filters.push('bT2CapitalLoss eq true');
        if (appliedT2Filters.t2NonCapitalLoss) filters.push('bT2NonCapitalLoss eq true');
        if (appliedT2Filters.hstReturnFiled) filters.push('bHSTReturnFiled eq true');
        if (appliedT2Filters.t2NonResident) filters.push('bT2NonResident eq true');
      }
    } else if (activeTab === 'T3') {
      if (appliedT3Filters.bNonResidentTrust) {
        filters.push('bNonResidentTrust eq true');
      }
    }
    if (filters.length > 0) {
      params.append('FilterText', filters.join(' and '));
    }
    params.append('Size', itemsPerPage);
    params.append('Skip', currentPage * itemsPerPage);
    return params.toString();
  }, [activeTab, debouncedSearchQuery, selectedLocation, appliedCurFilters, appliedPrevFilters, appliedT2Filters, appliedT3Filters, currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const applyFilters = () => {
    setCurrentPage(0);
    if (activeTab === 'T1') {
      setAppliedCurFilters(curCheckBoxState);
      setAppliedPrevFilters(prevCheckBoxState);
    } else if (activeTab === 'T2') {
      setAppliedT2Filters(t2CheckBoxState);
    } else if (activeTab === 'T3') {
      setAppliedT3Filters(t3CheckBoxState);
    }
    setLoading(true);
    setFilteredClients([]);
  };

  useEffect(() => {
    setLoading(true);
    setFilteredClients([]);
  }, [activeTab]);

  const sortedClients = useMemo(() => {
    return Array.isArray(filteredClients) ? [...filteredClients] : [];
  }, [filteredClients]);

  const paginatedClients = useMemo(() => {
    return sortedClients;
  }, [sortedClients]);

  const handleCheckboxChange = (event) => {
    const { name } = event.target;
    if (activeTab === 'T1') {
      if (curCheckBoxState.hasOwnProperty(name)) {
        setCurCheckBoxState(prevState => ({
          ...prevState,
          [name]: !prevState[name]
        }));
      } else {
        setPrevCheckBoxState(prevState => ({
          ...prevState,
          [name]: !prevState[name]
        }));
      }
    } else if (activeTab === 'T2') {
      setT2CheckBoxState(prevState => ({
        ...prevState,
        [name]: !prevState[name]
      }));
    } else if (activeTab === 'T3') {
      setT3CheckBoxState(prevState => ({
        ...prevState,
        [name]: !prevState[name]
      }));
    }
  };

  const handleMonthChange = (e) => {
    setSelectedBirthMonth(e.target.value);
    setShowCalendar(false);
    setSelectedBirthDate('');
  };

  const handleDateChange = (date) => {
    setSelectedBirthDate(date);
    setShowCalendar(false);
  };

  const handleReset = () => {
    setSelectedBirthMonth('');
    setSelectedBirthDate('');
    setSearchQuery('');
    setSelectedLocation('');
    setCurCheckBoxState({
      selfEmployed: false,
      foreignTaxFilingRequired: false,
      discountedReturn: false,
      gstDue: false,
      expectedRefund: false,
      payrollSlipsDue: false,
    });
    setPrevCheckBoxState({
      selfEmployed: false,
      foreignTaxFilingRequired: false,
      discountedReturn: false,
      gstDue: false,
      expectedRefund: false,
      payrollSlipsDue: false,
    });
    setT2CheckBoxState({
      t2TaxableIncome: false,
      t2CapitalLoss: false,
      t2NonCapitalLoss: false,
      hstReturnFiled: false,
      t2NonResident: false,
    });
    setT3CheckBoxState({
      bNonResidentTrust: false,
    });
    setAppliedCurFilters({});
    setAppliedPrevFilters({});
    setAppliedT2Filters({});
    setAppliedT3Filters({});
    setCurrentPage(0);
    setFilteredClients([]);
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  const removeFilter = (filterName) => {
    if (activeTab === 'T1') {
      setCurCheckBoxState((prevState) => ({
        ...prevState,
        [filterName]: false,
      }));
      setPrevCheckBoxState((prevState) => ({
        ...prevState,
        [filterName]: false,
      }));
      setAppliedCurFilters((prevState) => {
        const newFilters = { ...prevState };
        delete newFilters[filterName];
        return newFilters;
      });
      setAppliedPrevFilters((prevState) => {
        const newFilters = { ...prevState };
        delete newFilters[filterName];
        return newFilters;
      });
    } else if (activeTab === 'T2') {
      setT2CheckBoxState((prevState) => ({
        ...prevState,
        [filterName]: false,
      }));
      setAppliedT2Filters((prevState) => {
        const newFilters = { ...prevState };
        delete newFilters[filterName];
        return newFilters;
      });
    } else if (activeTab === 'T3') {
      setT3CheckBoxState((prevState) => ({
        ...prevState,
        [filterName]: false,
      }));
      setAppliedT3Filters((prevState) => {
        const newFilters = { ...prevState };
        delete newFilters[filterName];
        return newFilters;
      });
    }
  };

  const exportToCSV = () => {
    const csvData = filteredClients.map(client => {
      const { firstnames, surname, sin, phoneNo, email, lastUpdated, companyName, bnFull, fyEnd, estateName, SNFull, t3retefileFilingStatus } = client;
      const csvRow = activeTab === 'T3' ? {
        'Tags': client.tags,
        'Estate Name': estateName,
        'Trust Number': SNFull,
        'File Status': t3retefileFilingStatus,
        'Last Updated': formatDate(lastUpdated),
      } : activeTab === 'T2' ? {
        'Tags': client.tags,
        'Year End': fyEnd,
        'File Status': client.cifFilingStatus,
        'Last Updated': formatDate(client.lastUpdated),
      } : {
        'First Name': firstnames,
        'Surname': surname,
        'SIN': sin,
        'Phone': phoneNo,
        'Email': email,
        'Last Updated': formatDate(lastUpdated),
      };
      return csvRow;
    });
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'all_returns.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  function renderCheckbox(name, label) {
    const state = activeTab === 'T1' ? curCheckBoxState : activeTab === 'T2' ? t2CheckBoxState : t3CheckBoxState;
    return (
      <div className="filter-item">
        <label htmlFor={name}>{label}</label>
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={state[name]}
          onChange={handleCheckboxChange}
        />
      </div>
    );
  }

  const renderCalendar = () => {
    if (!selectedBirthMonth) return null;
    const monthIndex = months.indexOf(selectedBirthMonth);
    const daysInMonth = new Date(2024, monthIndex + 1, 0).getDate();
    return (
      <div className="calendar-overlay" onClick={() => setShowCalendar(false)}>
        <div className="calendar-container" onClick={(e) => e.stopPropagation()}>
          <div className="calendar-header">
            <h4>{selectedBirthMonth}</h4>
          </div>
          <div className="calendar-grid">
            {[...Array(daysInMonth)].map((_, i) => (
              <button
                key={i + 1}
                className={`calendar-day ${selectedBirthDate === (i + 1) ? 'selected' : ''}`}
                onClick={() => handleDateChange(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const columns = useMemo(() => {
    if (activeTab === 'T3') {
      return [
        { key: 'tags', label: 'Tags', className: 'tags' },
        { key: 'estateName', label: 'Estate Name', className: 'estate-name' },
        { key: 'SNFull', label: 'Trust Number', className: 'trust-number' },
        { key: 't3retefileFilingStatus', label: 'File Status', className: 'file-status' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    } else if (activeTab === 'T2') {
      return [
        { key: 'tags', label: 'Tags', className: 'tags' },
        { key: 'fyEnd', label: 'Year End', className: 'year-end' },
        { key: 'cifFilingStatus', label: 'File Status', className: 'file-status' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    }
    return [
      { key: 'tags', label: 'Tags', className: 'tags' },
      { key: 'Firstnames', label: 'Name', className: 'name' },
      { key: 'spFirstnames', label: 'Spouse', className: 'spouse' },
      { key: 'FileStatus', label: 'File Status', className: 'file-status' },
      { key: 'LastUpdated', label: 'Last Updated', className: 'last-updated' },
    ];
  }, [activeTab]);

  return (
    <div className="main-content">
      <div className="filter-container">
        <div className="tab-wrapper">
          <div className="tab">
            <button className={`tablinks ${activeTab === 'T1' ? 'active' : ''}`} onClick={() => setActiveTab('T1')}>T1</button>
            <button className={`tablinks ${activeTab === 'T2' ? 'active' : ''}`} onClick={() => setActiveTab('T2')}>T2</button>
            <button className={`tablinks ${activeTab === 'T3' ? 'active' : ''}`} onClick={() => setActiveTab('T3')}>T3</button>
          </div>
        </div>
        <div className="filter-category">
          <h3>By Location</h3>
          <div className="filter-item">
            <label htmlFor="location-select">Location:</label>
            <select
              id="location-select"
              value={selectedLocation}
              onChange={handleLocationChange}
              className="custom-select"
            >
              <option value="">Select a location</option>
              <option value="HeadOffice">Main Office</option>
              <option value="SubOffice">Sub Office</option>
            </select>
          </div>
        </div>
        <div className="filter-category">
          <h3>By Birthdate</h3>
          <div className="filter-item">
            <label htmlFor="month-select">Birth Month:</label>
            <select 
              id="month-select"
              value={selectedBirthMonth}
              onChange={handleMonthChange}
              className="custom-select"
            >
              <option value="">Select a month</option>
              {months.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className={`filter-item ${selectedBirthMonth ? '' : 'inactive'}`}>
            <label htmlFor="date-select">Birth Date:</label>
            <span className="date-display">{selectedBirthDate ? `${selectedBirthMonth} ${selectedBirthDate}` : 'Select a date'}</span>
            <button 
              className="calendar-button" 
              onClick={() => setShowCalendar(true)} 
              disabled={!selectedBirthMonth}
            >
              Select Date
            </button>
          </div>
          {showCalendar && renderCalendar()}
        </div>
        <div className="filter-category">
          <h3>Client Filters</h3>
          {activeTab === 'T1' && (
            <>
              {renderCheckbox("selfEmployed", "Self Employed")}
              {renderCheckbox("foreignTaxFilingRequired", "Foreign Tax Filing Required")}
              {renderCheckbox("discountedReturn", "Discounted Return")}
              {renderCheckbox("gstDue", "GST Due")}
              {renderCheckbox("expectedRefund", "Expected Refund")}
              {renderCheckbox("payrollSlipsDue", "Payroll Slips Due")}
            </>
          )}
          {activeTab === 'T2' && (
            <>
              {renderCheckbox("t2TaxableIncome", "Taxable Income")}
              {renderCheckbox("t2CapitalLoss", "Capital Loss")}
              {renderCheckbox("t2NonCapitalLoss", "Non Capital Loss")}
              {renderCheckbox("hstReturnFiled", "HST")}
              {renderCheckbox("t2NonResident", "Non Resident")}
            </>
          )}
          {activeTab === 'T3' && (
            <>
              {renderCheckbox("bNonResidentTrust", "Residency of Trust")}
            </>
          )}
        </div>
        <div className="buttons">
          <button onClick={handleReset} className="reset-button">Reset</button>
          <button className="apply-button" onClick={applyFilters}>Apply</button>
        </div>
      </div>
      <div className="table-container">
        <div className="table-header">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search Fields..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(0);
              }}
            />
          </div>
          <button className="export-button" onClick={exportToCSV}>Export to CSV</button>
        </div>
        {(Object.keys(appliedCurFilters).some(key => appliedCurFilters[key]) || Object.keys(appliedPrevFilters).some(key => appliedPrevFilters[key]) || Object.values(appliedT2Filters).some(v => v) || Object.values(appliedT3Filters).some(v => v)) && (
          <div className="applied-filters">
            {Object.keys(appliedCurFilters).map(filterName => (
              appliedCurFilters[filterName] && (
                <div key={filterName} id={`filter-${filterName}`} className="filter-box">
                  {filterDisplayNames[filterName]} (C) 
                  <button onClick={() => removeFilter(filterName)}>X</button>
                </div>
              )
            ))}
            {Object.keys(appliedPrevFilters).map(filterName => (
              appliedPrevFilters[filterName] && (
                <div key={filterName} id={`filter-${filterName}`} className="filter-box">
                  {filterDisplayNames[filterName]} (P) 
                  <button onClick={() => removeFilter(filterName)}>X</button>
                </div>
              )
            ))}
            {Object.keys(appliedT2Filters).map(filterName => (
              appliedT2Filters[filterName] && (
                <div key={filterName} id={`filter-${filterName}`} className="filter-box">
                  {filterDisplayNames[filterName]} 
                  <button onClick={() => removeFilter(filterName)}>X</button>
                </div>
              )
            ))}
            {Object.keys(appliedT3Filters).map(filterName => (
              appliedT3Filters[filterName] && (
                <div key={filterName} id={`filter-${filterName}`} className="filter-box">
                  {filterDisplayNames[filterName]} 
                  <button onClick={() => removeFilter(filterName)}>X</button>
                </div>
              )
            ))}
          </div>
        )}
        {error && <div className="error-popup">{error}</div>}
        <APIController url={`${baseURL}${userID}/all?${buildParams()}`} setData={setFilteredClients} setLoading={setLoading} setError={setError} setPagination={setPagination} />
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <div className="tabcontent active">
            <table className="custom-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className={column.className}>{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedClients.length > 0 ? paginatedClients.map((client, index) => (
                  <tr key={index}>
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        <div className="scrollable-content">
                          {column.key === 'lastUpdated' ? formatDate(client[column.key]) : client[column.key] || 'N/A'}
                        </div>
                      </td>
                    ))}
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={columns.length} className="no-results">No results found</td>
                  </tr>
                )}
              </tbody>
            </table>
            <ReactPaginate
              previousLabel={'‹'}
              nextLabel={'›'}
              breakLabel={'...'}
              pageCount={Math.ceil(pagination / itemsPerPage)}
              marginPagesDisplayed={1}
              pageRangeDisplayed={5}
              onPageChange={({ selected }) => setCurrentPage(selected)}
              containerClassName={'pagination'}
              activeClassName={'active'}
              disabledClassName={'disabled'}
              pageClassName={'page-item'}
              pageLinkClassName={'page-link'}
              previousClassName={'page-item'}
              previousLinkClassName={'page-link'}
              nextClassName={'page-item'}
              nextLinkClassName={'page-link'}
              breakClassName={'page-item'}
              breakLinkClassName={'page-link'}
              forcePage={currentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default AllReturns;
