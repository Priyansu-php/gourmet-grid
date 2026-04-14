import axios from "axios";

const API_URL = "http://localhost:5000/api/orders";

// place order
export const placeOrder = (orderData) => {
    return axios.post(API_URL, orderData);
};

// get orders of a user
export const getUserOrders = (userId) => {
    return axios.get(`${API_URL}/user/${userId}`);
};

// get restaurant orders
export const getRestaurantOrders = (restaurantId) => {
    return axios.get(`${API_URL}/restaurant/${restaurantId}`);
};

// get all orders
export const getAllOrders = () => {
    return axios.get(API_URL);
};