import React, { useEffect } from 'react';
import axios from 'axios';

const APIController = ({ url, params, setData, setLoading, setError, setPagination }) => {
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        console.log('Fetching URL:', url, 'with params:', params);
        const response = await axios({
          method: 'get',
          url: url,
          params: params,
        });
        console.log('Fetched Data:', response.data);
        setPagination(response.data.item1); // Store item1 in pagination
        setData(Array.isArray(response.data.item2) ? response.data.item2 : []); // Ensure item2 is an array
        setError(null);
      } catch (error) {
        setError(error.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      fetchData();
    }
  }, [url, params, setData, setLoading, setError, setPagination]);

  return null;
};

export default APIController;
