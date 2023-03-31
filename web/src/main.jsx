import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import App from './App'
import('preline')
import './index.css'
import Admin from "./Admin.jsx";
import Camera from "./Camera.jsx";
import Public from "./Public.jsx";
import { initializeApp } from "firebase/app";
import "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_apiKey,
    authDomain: import.meta.env.VITE_authDomain,
    projectId: import.meta.env.VITE_projectId,
    storageBucket: import.meta.env.VITE_storageBucket,
    messagingSenderId: import.meta.env.VITE_messagingSenderId,
    appId: import.meta.env.VITE_appId,
    measurementId: import.meta.env.VITE_measurementId
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
    },
    {
        path: "/admin",
        element: <Admin firebase={app}/>,
    },
    {
        path: "/camera",
        element: <Camera firebase={app}/>,
    },
    {
        path: "/public",
        element: <Public firebase={app}/>,
    },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
      <RouterProvider router={router} />
  </React.StrictMode>,
)
