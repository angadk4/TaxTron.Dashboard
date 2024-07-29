import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactPaginate from 'react-paginate';
import './filtertable.css';
import { parseISO, format, parse } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import APIController from './clientfetch';

const baseURL = '/clientsearch/getclientsdata/';
const userID = '000779638e3141fcb06a56bdc5cc484e';  // Static user ID for now

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  let parsedDate;
  try {
    parsedDate = parseISO(dateStr);
    if (!isNaN(parsedDate)) return format(parsedDate, 'yyyy/MM/dd HH:mm:ss');
  } catch (error) {}
  try {
    parsedDate = parse(dateStr, 'MM/dd/yyyy hh:mm:ss a', new Date());
    if (!isNaN(parsedDate)) return format(parsedDate, 'yyyy/MM/dd HH:mm:ss');
  } catch (error) {}
  return 'N/A';
};

const filterDisplayNames = {
  selfEmployed: 'Self Employed',
  foreignTaxFilingRequired: 'Foreign Tax Filing Required',
  discountedReturn: 'Discounted Return',
  gstDue: 'GST Due',
  expectedRefund: 'Expected Refund',
  payrollSlipsDue: 'Payroll Slips Due',
};

const YearSelector = ({ selectedYear, onChange }) => {
  return (
    <div className="year-selector">
      <button
        className={`year-button ${selectedYear === 'Cur Yr' ? 'active' : ''}`}
        onClick={() => onChange('Cur Yr')}
      >
        Current Year
      </button>
      <button
        className={`year-button ${selectedYear === 'Prev Yr' ? 'active' : ''}`}
        onClick={() => onChange('Prev Yr')}
      >
        Previous Year
      </button>
    </div>
  );
};

const FilterTable = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('T1');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedBirthMonth, setSelectedBirthMonth] = useState('');
  const [selectedBirthDate, setSelectedBirthDate] = useState('');
  const [appliedCurFilters, setAppliedCurFilters] = useState({});
  const [appliedPrevFilters, setAppliedPrevFilters] = useState({});
  const [checkBoxState, setCheckBoxState] = useState({
    selfEmployed: false,
    foreignTaxFilingRequired: false,
    discountedReturn: false,
    gstDue: false,
    expectedRefund: false,
    payrollSlipsDue: false,
  });
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
  const [currentPage, setCurrentPage] = useState(0);
  const [filteredClients, setFilteredClients] = useState([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedYear, setSelectedYear] = useState('Cur Yr');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(0); // For storing the item1 value
  const itemsPerPage = 20;

  const months = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('en-US', { month: 'long' }))
  , []);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.append('Prod', activeTab);
    if (debouncedSearchQuery) {
      params.append('SearchText', debouncedSearchQuery);
    }
    if (selectedLocation) {
      params.append('Location', selectedLocation);
    }
    const filters = [];
    if (Object.values(appliedCurFilters).some(v => v)) {
      const curPrefix = 'b';
      if (appliedCurFilters.selfEmployed) filters.push(`${curPrefix}SelfEmployed eq true`);
      if (appliedCurFilters.foreignTaxFilingRequired) filters.push(`${curPrefix}ForeignTaxFilingRequired eq true`);
      if (appliedCurFilters.discountedReturn) filters.push(`${curPrefix}DicountedRet eq true`);
      if (appliedCurFilters.gstDue) filters.push(`${curPrefix}GSTDue eq true`);
      if (appliedCurFilters.expectedRefund) filters.push(`${curPrefix}ExpectedRefund eq true`);
      if (appliedCurFilters.payrollSlipsDue) filters.push(`${curPrefix}PayRollSlipsDue eq true`);
    }
    if (Object.values(appliedPrevFilters).some(v => v)) {
      const prevPrefix = 'Pre_b';
      if (appliedPrevFilters.selfEmployed) filters.push(`${prevPrefix}SelfEmployed eq true`);
      if (appliedPrevFilters.foreignTaxFilingRequired) filters.push(`${prevPrefix}ForeignTaxFilingRequired eq true`);
      if (appliedPrevFilters.discountedReturn) filters.push(`${prevPrefix}DicountedRet eq true`);
      if (appliedPrevFilters.gstDue) filters.push(`${prevPrefix}GSTDue eq true`);
      if (appliedPrevFilters.expectedRefund) filters.push(`${prevPrefix}ExpectedRefund eq true`);
      if (appliedPrevFilters.payrollSlipsDue) filters.push(`${prevPrefix}PayRollSlipsDue eq true`);
    }
    if (filters.length > 0) {
      params.append('FilterText', filters.join(' and '));
    }
    params.append('Size', itemsPerPage);
    if (currentPage > 0) {
      params.append('Skip', currentPage * itemsPerPage);
    }
    return params.toString();
  }, [activeTab, debouncedSearchQuery, selectedLocation, appliedCurFilters, appliedPrevFilters, currentPage]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const applyFilters = () => {
    setCurrentPage(0);
    setAppliedCurFilters(curCheckBoxState);
    setAppliedPrevFilters(prevCheckBoxState);
    setLoading(true);
    setFilteredClients([]);
  };

  useEffect(() => {
    setLoading(true);
    setFilteredClients([]);
  }, [activeTab]);

  const sortedClients = useMemo(() => {
    const sorted = Array.isArray(filteredClients) ? [...filteredClients] : [];
    if (sortConfig.key) {
      sorted.sort((a, b) => {
        if (sortConfig.key === 'lastUpdated') {
          return (new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])) * (sortConfig.direction === 'asc' ? 1 : -1);
        }
        return (a[sortConfig.key] || '').localeCompare(b[sortConfig.key] || '') * (sortConfig.direction === 'asc' ? 1 : -1);
      });
    }
    return sorted;
  }, [filteredClients, sortConfig]);

  const paginatedClients = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return sortedClients.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedClients, currentPage, itemsPerPage]);

  const requestSort = (key) => {
    setSortConfig((prevState) => ({
      key,
      direction: prevState.key === key && prevState.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleClientClick = async (clientId) => {
    const selectedClient = filteredClients.find(client => client.clientId === clientId);
    const clientInfo = {
      clientId: selectedClient.clientId,
      firstnames: selectedClient.firstnames,
      surname: selectedClient.surname,
      phoneNo: selectedClient.phoneNo,
      email: selectedClient.email,
      companyName: selectedClient.companyName,
      bnFull: selectedClient.bnFull,
      estateName: selectedClient.estateName,
      SNFull: selectedClient.SNFull
    };
    navigate(`/returns/${clientId}`, { state: { clientInfo, activeTab } });
  };

  const exportToCSV = () => {
    const csvData = sortedClients.map(client => {
      const { clientId, firstnames, surname, sin, phoneNo, email, lastUpdated, companyName, bnFull, fyEnd, estateName, SNFull } = client;
      const csvRow = activeTab === 'T3' ? {
        'Estate Name': estateName,
        'Trust Number': SNFull,
        'Last Updated': formatDate(lastUpdated),
      } : activeTab === 'T2' ? {
        'Company Name': companyName,
        'Business Number': bnFull,
        'Year End': fyEnd,
        'Last Updated': formatDate(lastUpdated),
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
    link.setAttribute('download', 'filtered_clients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(() => {
    if (activeTab === 'T3') {
      return [
        { key: 'estateName', label: 'Estate Name', className: 'estate-name' },
        { key: 'SNFull', label: 'Trust Number', className: 'trust-number' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    } else if (activeTab === 'T1') {
      return [
        { key: 'firstnames', label: 'First Name', className: 'first-name' },
        { key: 'surname', label: 'Surname', className: 'surname' },
        { key: 'sin', label: 'SIN', className: 'sin' },
        { key: 'phoneNo', label: 'Phone', className: 'phone' },
        { key: 'email', label: 'Email', className: 'email' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    } else if (activeTab === 'T2') {
      return [
        { key: 'companyName', label: 'Company Name', className: 'company-name' },
        { key: 'bnFull', label: 'Business Number', className: 'business-number' },
        { key: 'fyEnd', label: 'Year End', className: 'year-end' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    } else {
      return [
        { key: 'companyName', label: 'Company Name', className: 'company-name' },
        { key: 'bnFull', label: 'Business Number', className: 'business-number' },
        { key: 'fyEnd', label: 'Year End', className: 'year-end' },
        { key: 'lastUpdated', label: 'Last Updated', className: 'last-updated' },
      ];
    }
  }, [activeTab]);

  useEffect(() => {
    const fadeIn = (selector) => {
      const element = document.querySelector(selector);
      element.classList.add('fade-in');
      const timer = setTimeout(() => element.classList.remove('fade-in'), 300);
      return () => clearTimeout(timer);
    };

    fadeIn('.tabcontent.active');
    fadeIn('.custom-table tbody');
  }, [activeTab, sortConfig]);

  const handleCheckboxChange = (event) => {
    const { name } = event.target;
    if (selectedYear === 'Cur Yr') {
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
    setAppliedCurFilters({});
    setAppliedPrevFilters({});
    setCurrentPage(0);
    setFilteredClients([]); // Reset to empty array
    setSelectedYear('Cur Yr');
  };

  const handleYearChange = (year) => {
    if (year === 'Cur Yr') {
      setCheckBoxState(curCheckBoxState);
    } else {
      setCheckBoxState(prevCheckBoxState);
    }
    setSelectedYear(year);
  };

  const handleLocationChange = (e) => {
    setSelectedLocation(e.target.value);
  };

  const removeFilter = (filterName) => {
    const filterElement = document.getElementById(`filter-${filterName}`);
    if (filterElement) {
      filterElement.classList.add('removing');
      setTimeout(() => {
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
      }, 125);
    }
  };

  function renderCheckbox(name, label) {
    return (
      <div className="filter-item">
        <label htmlFor={name}>{label}</label>
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={selectedYear === 'Cur Yr' ? curCheckBoxState[name] : prevCheckBoxState[name]}
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
          <div className="filter-year-toggle">
            <YearSelector selectedYear={selectedYear} onChange={handleYearChange} />
          </div>
          {renderCheckbox("selfEmployed", "Self Employed")}
          {renderCheckbox("foreignTaxFilingRequired", "Foreign Tax Filing Required")}
          {renderCheckbox("discountedReturn", "Discounted Return")}
          {renderCheckbox("gstDue", "GST Due")}
          {renderCheckbox("expectedRefund", "Expected Refund")}
          {renderCheckbox("payrollSlipsDue", "Payroll Slips Due")}
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
        {(Object.keys(appliedCurFilters).some(key => appliedCurFilters[key]) || Object.keys(appliedPrevFilters).some(key => appliedPrevFilters[key])) && (
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
          </div>
        )}
        {error && <div className="error-popup">{error}</div>}
        <APIController url={`${baseURL}${userID}?${buildParams()}`} setData={setFilteredClients} setLoading={setLoading} setError={setError} setPagination={setPagination} />
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : (
          <div className="tabcontent active">
            <table className="custom-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className={`${column.className} sortable`}
                      onClick={() => requestSort(column.key)}
                    >
                      {column.label} {sortConfig.key === column.key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredClients.length > 0 ? filteredClients.map((client, index) => (
                  <tr
                    key={index}
                    onClick={() => handleClientClick(client.clientId)}
                    className="highlighted"
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={column.className}>
                        {column.key === 'lastUpdated'
                          ? formatDate(client[column.key])
                          : client[column.key] || 'N/A'}
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

export default FilterTable;
