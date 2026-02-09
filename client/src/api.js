import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
});

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const login = async (password) => {
    const response = await api.post('/login', { password });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const getMenu = async () => {
    const response = await api.get('/menu');
    return response.data;
};

export const getSections = async () => {
    const response = await api.get('/sections');
    return response.data;
};

export const addSection = async (name) => {
    const response = await api.post('/sections', { name }, { headers: getAuthHeader() });
    return response.data;
};

export const updateSection = async (id, name) => {
    const response = await api.put(`/sections/${id}`, { name }, { headers: getAuthHeader() });
    return response.data;
};

export const deleteSection = async (id) => {
    const response = await api.delete(`/sections/${id}`, { headers: getAuthHeader() });
    return response.data;
};

export const addItem = async (item) => {
    const headers = getAuthHeader();
    // If item is FormData, axios lets browser set Content-Type
    const response = await api.post('/items', item, { headers });
    return response.data;
};

export const updateItem = async (id, itemData) => {
    const headers = getAuthHeader();
    // itemData is FormData
    const response = await api.put(`/items/${id}`, itemData, { headers });
    return response.data;
};

// Standard Names
export const getNames = async () => {
    const response = await api.get('/names');
    return response.data;
};

export const addName = async (name) => {
    const headers = getAuthHeader();
    const response = await api.post('/names', { name }, { headers });
    return response.data;
};

export const updateName = async (id, name) => {
    const headers = getAuthHeader();
    const response = await api.put(`/names/${id}`, { name }, { headers });
    return response.data;
};

export const deleteName = async (id) => {
    const headers = getAuthHeader();
    const response = await api.delete(`/names/${id}`, { headers });
    return response.data;
};

export const deleteItem = async (id) => {
    const response = await api.delete(`/items/${id}`, { headers: getAuthHeader() });
    return response.data;
};
