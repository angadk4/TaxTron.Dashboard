import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import axios from 'axios';
import ReactPaginate from 'react-paginate';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import './returns.css';

const normalizeString = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();

const Returns = () => {
  const { clientId } = useParams();
  const location = useLocation();
  const [clientInfo, setClientInfo] = useState(location.state?.clientInfo || {});
  const [clientReturnsData, setClientReturnsData] = useState([]);
  const [filteredReturns, setFilteredReturns] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [isStartOpen, setIsStartOpen] = useState(false);
  const [isEndOpen, setIsEndOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formState, setFormState] = useState({
    startDate: null,
    endDate: null,
    selectedLocation: '',
    checkBoxState: {
      selfEmployed: false,
      foreignTaxFilingRequired: false,
      discountedReturn: false,
      gstDue: false,
      expectedRefund: false,
      payrollSlipsDue: false,
    },
    searchQuery: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const itemsPerPage = 15;
  const userID = '000779638e3141fcb06a56bdc5cc484e';
  const baseURL = '/taxreturnsearch/getreturnsdata/';
  const activeTab = location.state?.activeTab || 'T1'; // Get the activeTab from the state or default to T1

  const buildParams = () => {
    const params = new URLSearchParams();
    // Add parameters as needed
    return params.toString();
  };

  useEffect(() => {
    const fetchClientReturnsData = async () => {
      try {
        setLoading(true);
        const url = `${baseURL}${userID}/${clientId}?${buildParams()}`;
        console.log('Fetching URL:', url);
        const response = await axios.get(url);
        console.log('Fetched Data:', response.data);
        const data = Array.isArray(response.data.item2) ? response.data.item2 : [];
        setClientReturnsData(data); // Set the item2 data
        setFilteredReturns(data); // Filter the item2 data
        setError('');
      } catch (error) {
        console.error('Error fetching client returns data:', error);
        setError(error.message);
        setClientReturnsData([]);
        setFilteredReturns([]);
      } finally {
        setLoading(false);
      }
    };
    fetchClientReturnsData();
  }, [clientId]);

  const applyFilters = useCallback(() => {
    let filteredData = clientReturnsData;

    if (formState.startDate) {
      filteredData = filteredData.filter(returnItem => new Date(returnItem.Timestamp) >= formState.startDate);
    }

    if (formState.endDate) {
      filteredData = filteredData.filter(returnItem => new Date(returnItem.Timestamp) <= formState.endDate);
    }

    if (formState.selectedLocation) {
      filteredData = filteredData.filter(returnItem => returnItem.Province === formState.selectedLocation);
    }

    const checkBoxState = formState.checkBoxState || {};

    if (checkBoxState.selfEmployed) {
      filteredData = filteredData.filter(returnItem => returnItem.bSelfEmployed || returnItem.bSpSelfEmployed);
    }

    if (checkBoxState.foreignTaxFilingRequired) {
      filteredData = filteredData.filter(returnItem => returnItem.bForeignTaxFilingRequired || returnItem.bSpForeignTaxFilingRequired);
    }

    if (checkBoxState.discountedReturn) {
      filteredData = filteredData.filter(returnItem => returnItem.bDicountedRet || returnItem.bSpDicountedRet);
    }

    if (checkBoxState.gstDue) {
      filteredData = filteredData.filter(returnItem => returnItem.bGSTDue || returnItem.bSpGSTDue);
    }

    if (checkBoxState.expectedRefund) {
      filteredData = filteredData.filter(returnItem => returnItem.bExpectedRefund);
    }

    if (checkBoxState.payrollSlipsDue) {
      filteredData = filteredData.filter(returnItem => returnItem.bPayRollSlipsDue || returnItem.bSpPayRollSlipsDue);
    }

    const queryParts = formState.searchQuery.toLowerCase().split(' ').filter(Boolean);
    if (queryParts.length > 0) {
      filteredData = filteredData.filter(returnItem => {
        return queryParts.every(queryPart =>
          Object.values(returnItem).some(value => normalizeString(String(value)).includes(queryPart))
        );
      });
    }

    setFilteredReturns(filteredData);
  }, [clientReturnsData, formState]);

  useEffect(() => {
    applyFilters();
  }, [formState, applyFilters]);

  const sortedReturns = useMemo(() => {
    const sorted = [...filteredReturns];
    // Sort logic if needed, e.g., by date or any other field
    return sorted;
  }, [filteredReturns]);

  const paginatedReturns = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    return sortedReturns.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedReturns, currentPage]);

  const handleCheckboxChange = (event) => {
    const { name } = event.target;
    setFormState((prevState) => ({
      ...prevState,
      checkBoxState: {
        ...prevState.checkBoxState,
        [name]: !prevState.checkBoxState[name],
      }
    }));
  };

  const handleLocationChange = (e) => {
    setFormState((prevState) => ({
      ...prevState,
      selectedLocation: e.target.value
    }));
  };

  const handleReset = () => {
    setFormState({
      startDate: null,
      endDate: null,
      selectedLocation: '',
      checkBoxState: {
        selfEmployed: false,
        foreignTaxFilingRequired: false,
        discountedReturn: false,
        gstDue: false,
        expectedRefund: false,
        payrollSlipsDue: false,
      },
      searchQuery: '',
    });
    setCurrentPage(0);
    setFilteredReturns(clientReturnsData);
  };

  const columns = [
    { key: 'tags', label: 'Tags', className: 'tags' },
    { key: 'Firstnames', label: 'Name', className: 'name' },
    { key: 'spFirstnames', label: 'Spouse', className: 'spouse' },
    { key: 'FileStatus', label: 'File Status', className: 'file-status' },
    { key: 'LastUpdated', label: 'Last Updated', className: 'last-updated' },
  ];

  const renderCheckbox = (name, label) => (
    <div className="filter-item">
      <label htmlFor={name}>{label}</label>
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={formState.checkBoxState[name]}
        onChange={handleCheckboxChange}
      />
    </div>
  );

  const pageCount = Math.max(Math.ceil(filteredReturns.length / itemsPerPage), 1);
  const forcePage = Math.min(currentPage, pageCount - 1);

  return (
    <div className="main-container">
      {clientInfo ? (
        <>
          <div className="client-info">
            {activeTab === 'T1' && (
              <>
                <p><strong>Client Name:</strong> <span>{clientInfo.firstnames} {clientInfo.surname}</span></p>
                <p><strong>Client ID:</strong> <span>{clientId}</span></p>
                <p><strong>Phone Number:</strong> <span>{clientInfo.phoneNo}</span></p>
                <p><strong>Email:</strong> <span>{clientInfo.email}</span></p>
              </>
            )}
            {activeTab === 'T2' && (
              <>
                <p><strong>Client ID:</strong> <span>{clientId}</span></p>
                <p><strong>Company Name:</strong> <span>{clientInfo.companyName}</span></p>
                <p><strong>Company Number:</strong> <span>{clientInfo.bnFull}</span></p>
              </>
            )}
            {activeTab === 'T3' && (
              <>
                <p><strong>Client ID:</strong> <span>{clientId}</span></p>
                <p><strong>Estate Name:</strong> <span>{clientInfo.estateName}</span></p>
                <p><strong>Trust Number:</strong> <span>{clientInfo.SNFull}</span></p>
              </>
            )}
          </div>

          <div className="status-container">
            <div className="status-item">All <span className="status-count">{clientReturnsData.length}</span></div>
            <div className="status-item">Work in process <span className="status-count">0</span></div>
            <div className="status-item">Review Pending <span className="status-count">0</span></div>
            <div className="status-item">Accepted <span className="status-count">0</span></div>
            <div className="status-item">Paper Filed <span className="status-count">0</span></div>
          </div>

          <div className="main-content">
            <div className="filter-container">
              <div className="filter-category">
                <h3>Date Range</h3>
                <div className="date-picker-container">
                  <button className="date-button" onClick={() => setIsStartOpen(true)}>Select From Date</button>
                  {isStartOpen && (
                    <DatePicker
                      selected={formState.startDate}
                      onChange={date => setFormState((prevState) => ({ ...prevState, startDate: date }))}
                      onClickOutside={() => setIsStartOpen(false)}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      inline
                    />
                  )}
                </div>
                <div className="date-picker-container">
                  <button className="date-button" onClick={() => setIsEndOpen(true)}>Select To Date</button>
                  {isEndOpen && (
                    <DatePicker
                      selected={formState.endDate}
                      onChange={date => setFormState((prevState) => ({ ...prevState, endDate: date }))}
                      onClickOutside={() => setIsEndOpen(false)}
                      showMonthDropdown
                      showYearDropdown
                      dropdownMode="select"
                      inline
                    />
                  )}
                </div>
                <p className="date-range-display">
                  <span>From: {formState.startDate ? formState.startDate.toLocaleDateString() : 'Select a date'}</span>
                  <span>To: {formState.endDate ? formState.endDate.toLocaleDateString() : 'Select a date'}</span>
                </p>
              </div>

              <div className="filter-category">
                <h3>By Location</h3>
                <div className="filter-item">
                  <label htmlFor="location-select">Location:</label>
                  <select
                    id="location-select"
                    value={formState.selectedLocation}
                    onChange={handleLocationChange}
                    className="custom-select"
                  >
                    <option value="">Select a location</option>
                    <option value="ON">Ontario</option>
                    <option value="QC">Quebec</option>
                    {/* Add more options as needed */}
                  </select>
                </div>
              </div>

              <div className="filter-category">
                <h3>Client Filters</h3>
                {renderCheckbox('selfEmployed', 'Self Employed')}
                {renderCheckbox('foreignTaxFilingRequired', 'Foreign Tax Filing Required')}
                {renderCheckbox('discountedReturn', 'Discounted Return')}
                {renderCheckbox('gstDue', 'GST Due')}
                {renderCheckbox('expectedRefund', 'Expected Refund')}
                {renderCheckbox('payrollSlipsDue', 'Payroll Slips Due')}
              </div>

              <div className="buttons">
                <button onClick={handleReset} className="reset-button">Reset</button>
                <button className="apply-button" onClick={applyFilters}>Apply</button>
              </div>
            </div>

            <div className="table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key} className={column.className}>{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedReturns.length > 0 ? paginatedReturns.map((returnItem, index) => (
                    <tr key={index}>
                      {columns.map((column) => (
                        <td key={column.key} className={column.className}>
                          <div className="scrollable-content">
                            {returnItem[column.key] || 'N/A'}
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
                pageCount={pageCount}
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
                forcePage={forcePage}
              />
            </div>
          </div>
        </>
      ) : (
        <p>Loading client data...</p>
      )}
    </div>
  );
};

export default Returns;
