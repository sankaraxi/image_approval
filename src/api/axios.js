import axios from "axios";

const api = axios.create({
  baseURL: "http://103.118.158.33:5003/api",
});

api.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default api;