import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ReactPaginate from 'react-paginate';
import { DateRangePicker } from 'react-date-range';
import { format, parseISO } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';
import Papa from 'papaparse';
import APIController from './clientfetch';
import { useTable, useSortBy, useResizeColumns, useFlexLayout } from 'react-table';
import 'react-date-range/dist/styles.css'; // main style file
import 'react-date-range/dist/theme/default.css'; // theme css file
import './filtertable.css';

const baseURL = '/clientsearch/getclientsdata/';
const userID = '000779638e3141fcb06a56bdc5cc484e';  // Static user ID for now

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  let parsedDate;
  try {
    parsedDate = parseISO(dateStr);
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

const FilterTable = ({ setSelectedTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.selectedTab || 'T1');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedDateRange, setSelectedDateRange] = useState({
    startDate: null,
    endDate: null,
    key: 'selection'
  });
  const [appliedDateRange, setAppliedDateRange] = useState(null);
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

  // New state for month-day selection
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [showDaySelector, setShowDaySelector] = useState(false);
  const [appliedMonth, setAppliedMonth] = useState('');
  const [appliedDay, setAppliedDay] = useState('');

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
    if (appliedDateRange && appliedDateRange.startDate && appliedDateRange.endDate) {
      const fromDate = format(appliedDateRange.startDate, 'yyyy-MM-dd');
      const toDate = format(appliedDateRange.endDate, 'yyyy-MM-dd');
      params.append('FromDate', fromDate);
      params.append('ToDate', toDate);
      let filterType;
      switch (activeTab) {
        case 'T1':
          filterType = 'ClientDOBFromTo';
          break;
        case 'T2':
          filterType = 'ClientT2YearEnd';
          break;
        case 'T3':
          filterType = 'ClientT3YearEnd';
          break;
        default:
          filterType = 'ClientDOBFromTo';
      }
      params.append('FilterType', filterType);
    }
    // New month-day selection params
    if (activeTab === 'T1' && appliedMonth) {
      const fromDate = `2024-${appliedMonth.padStart(2, '0')}-${appliedDay ? String(appliedDay).padStart(2, '0') : '01'}`;
      params.append('FromDate', fromDate);
      params.append('FilterType', appliedDay ? 'ClientDOBDay' : 'ClientDOBMonth');
    }
    params.append('Size', itemsPerPage);
    if (currentPage > 0) {
      params.append('Skip', currentPage * itemsPerPage);
    }
    return params.toString();
  }, [activeTab, debouncedSearchQuery, selectedLocation, appliedCurFilters, appliedPrevFilters, appliedDateRange, currentPage, appliedMonth, appliedDay]);

  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchQuery(searchQuery), 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const applyFilters = () => {
    setCurrentPage(0);
    setAppliedCurFilters(curCheckBoxState);
    setAppliedPrevFilters(prevCheckBoxState);
    setAppliedDateRange(selectedDateRange.startDate && selectedDateRange.endDate ? selectedDateRange : null);
    setAppliedMonth(selectedMonth);
    setAppliedDay(selectedDay);
    setLoading(true);
    setFilteredClients([]);
  };

  useEffect(() => {
    setLoading(true);
    setFilteredClients([]);
    setSelectedDateRange({ startDate: null, endDate: null, key: 'selection' });
    setAppliedDateRange(null);
    setSelectedMonth('');
    setSelectedDay('');
    setAppliedMonth('');
    setAppliedDay('');
  }, [activeTab]);

  const handleClientClick = async (clientId) => {
    setSelectedTab(activeTab); // Store the active tab when navigating to client details
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
    const csvData = filteredClients.map(client => {
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

  const data = useMemo(() => filteredClients, [filteredClients]);

  const columns = useMemo(() => {
    if (activeTab === 'T3') {
      return [
        { Header: 'Estate Name', accessor: 'estateName' },
        { Header: 'Trust Number', accessor: 'SNFull' },
        { Header: 'Last Updated', accessor: 'lastUpdated', Cell: ({ value }) => formatDate(value) },
      ];
    } else if (activeTab === 'T1') {
      return [
        { Header: 'First Name', accessor: 'firstnames' },
        { Header: 'Surname', accessor: 'surname' },
        { Header: 'SIN', accessor: 'sin' },
        { Header: 'Phone', accessor: 'phoneNo' },
        { Header: 'Email', accessor: 'email' },
        { Header: 'Last Updated', accessor: 'lastUpdated', Cell: ({ value }) => formatDate(value) },
      ];
    } else if (activeTab === 'T2') {
      return [
        { Header: 'Company Name', accessor: 'companyName' },
        { Header: 'Business Number', accessor: 'bnFull' },
        { Header: 'Year End', accessor: 'fyEnd' },
        { Header: 'Last Updated', accessor: 'lastUpdated', Cell: ({ value }) => formatDate(value) },
      ];
    } else {
      return [
        { Header: 'Company Name', accessor: 'companyName' },
        { Header: 'Business Number', accessor: 'bnFull' },
        { Header: 'Year End', accessor: 'fyEnd' },
        { Header: 'Last Updated', accessor: 'lastUpdated', Cell: ({ value }) => formatDate(value) },
      ];
    }
  }, [activeTab]);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data,
    },
    useSortBy,
    useFlexLayout,
    useResizeColumns
  );

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

  const handleReset = () => {
    setSelectedDateRange({
      startDate: null,
      endDate: null,
      key: 'selection'
    });
    setAppliedDateRange(null);
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
    setSelectedMonth('');
    setSelectedDay('');
    setAppliedMonth('');
    setAppliedDay('');
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

  const renderCalendarOverlay = () => {
    if (!showCalendar) return null;

    return (
      <div className="calendar-overlay" onClick={() => setShowCalendar(false)}>
        <div className="calendar-container" onClick={(e) => e.stopPropagation()}>
          <button className="close-button" onClick={() => setShowCalendar(false)}>✖</button>
          <DateRangePicker
            ranges={[selectedDateRange]}
            onChange={(item) => setSelectedDateRange(item.selection)}
            showSelectionPreview={true}
            moveRangeOnFirstSelection={false}
            months={1}
            direction="horizontal"
            preventSnapRefocus={true}
            calendarFocus="backwards"
          />
        </div>
      </div>
    );
  };

  const renderMonthDaySelector = () => {
    if (activeTab !== 'T1') return null;

    const handleMonthChange = (e) => {
      setSelectedMonth(e.target.value);
      setSelectedDay(''); // Reset day when month changes
    };

    const handleDaySelect = (day) => {
      setSelectedDay(day);
      setShowDaySelector(false);
    };

    const renderDayOverlay = () => {
      if (!showDaySelector) return null;

      const daysInMonth = new Date(2024, selectedMonth, 0).getDate();
      const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

      return (
        <div className="calendar-overlay" onClick={() => setShowDaySelector(false)}>
          <div className="calendar-container" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowDaySelector(false)}>✖</button>
            <div className="calendar-header">Select Day</div>
            <div className="calendar-grid">
              {daysArray.map(day => (
                <div
                  key={day}
                  className={`calendar-day ${selectedDay === day ? 'selected' : ''}`}
                  onClick={() => handleDaySelect(day)}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="filter-category">
        <h3>By Month-Day</h3>
        <div className="filter-item">
          <label htmlFor="month-select">Month:</label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={handleMonthChange}
            className="custom-select"
          >
            <option value="">Select a month</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div className="filter-item day-selection">
          <label>Day:</label>
          <span className="date-display">
            {selectedDay ? `${selectedMonth}-${selectedDay}` : 'No day selected'}
          </span>
          <button
            className="calendar-button"
            onClick={() => setShowDaySelector(true)}
            disabled={!selectedMonth}
          >
            Select Day
          </button>
        </div>
        {renderDayOverlay()}
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
          <h3>By Date Range</h3>
          <div className={`filter-item ${selectedMonth ? 'inactive' : ''}`}>
            <label htmlFor="date-range">Date Range:</label>
            <span className="date-display">
              {selectedDateRange.startDate && selectedDateRange.endDate
                ? `${format(selectedDateRange.startDate, 'yyyy-MM-dd')} to ${format(selectedDateRange.endDate, 'yyyy-MM-dd')}`
                : 'Select date range'}
            </span>
            <button 
              className="calendar-button" 
              onClick={() => setShowCalendar(true)}
              disabled={!!selectedMonth}
            >
              Select Date Range
            </button>
          </div>
        </div>

        {renderMonthDaySelector()}

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
            <table {...getTableProps()} className="custom-table">
              <thead>
                {headerGroups.map(headerGroup => (
                  <tr {...headerGroup.getHeaderGroupProps()}>
                    {headerGroup.headers.map(column => (
                      <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                        {column.render('Header')}
                        <span>
                          {column.isSorted
                            ? column.isSortedDesc
                              ? ' ▼'
                              : ' ▲'
                            : ''}
                        </span>
                        <div
                          {...column.getResizerProps()}
                          className={`resizer ${column.isResizing ? 'isResizing' : ''}`}
                        />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody {...getTableBodyProps()}>
                {rows.map(row => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()} onClick={() => handleClientClick(row.original.clientId)}>
                      {row.cells.map(cell => (
                        <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                      ))}
                    </tr>
                  );
                })}
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
      {renderCalendarOverlay()}
    </div>
  );
};

export default FilterTable;
