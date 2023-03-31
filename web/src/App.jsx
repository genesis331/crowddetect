import { useNavigate } from "react-router-dom";
import './App.css'
import DemoIndicator from './components/demoindicator';

function App() {
    const navigate = useNavigate();

    return (
        <div className="max-w-2xl h-screen flex flex-col justify-center mx-auto px-8">
            <DemoIndicator />
            <p className="font-sans my-6 text-center">Please click the button below to indicate if you are a public user or an administrator.</p>
            <div className="grid grid-flow-row gap-3 dark:border-gray-700 dark:shadow-slate-700/[.7] dark:divide-gray-600">
                <div className="flex flex-col items-center flex-[1_0_0%] bg-white dark:bg-gray-800 border rounded-xl shadow-sm hover:shadow-lg transition px-8 py-14 cursor-pointer" onClick={() => navigate("/public")}>
                    <span className="m-1 inline-flex justify-center items-center w-[60px] h-[60px] rounded-full bg-blue-500 text-white">
                        <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="50%" fill="currentColor" className="bi bi-person-fill" viewBox="0 0 16 16">
                            <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3Zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
                        </svg>
                    </span>
                    <div className="p-2">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                            Public
                        </h3>
                    </div>
                </div>
                <div className="flex flex-row gap-3">
                    <div className="flex flex-col items-center flex-[1_0_0%] bg-white dark:bg-gray-800 border rounded-xl shadow-sm hover:shadow-lg transition px-8 py-6 cursor-pointer" onClick={() => navigate("/admin")}>
                        <span className="m-1 inline-flex justify-center items-center w-[60px] h-[60px] rounded-full bg-blue-500 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="50%" fill="currentColor" className="bi bi-tools" viewBox="0 0 16 16">
                                <path d="M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3c0-.269-.035-.53-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814L1 0Zm9.646 10.646a.5.5 0 0 1 .708 0l2.914 2.915a.5.5 0 0 1-.707.707l-2.915-2.914a.5.5 0 0 1 0-.708ZM3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026L3 11Z"/>
                            </svg>
                        </span>
                        <div className="p-2">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                Admin
                            </h3>
                        </div>
                    </div>
                    <div className="flex flex-col items-center flex-[1_0_0%] bg-white dark:bg-gray-800 border rounded-xl shadow-sm hover:shadow-lg transition px-8 py-6 cursor-pointer" onClick={() => navigate("/camera")}>
                        <span className="m-1 inline-flex justify-center items-center w-[60px] h-[60px] rounded-full bg-blue-500 text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" width="50%" height="50%" fill="currentColor" className="bi bi-camera-fill" viewBox="0 0 16 16">
                                <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/>
                                <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/>
                            </svg>
                        </span>
                        <div className="p-2">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                Camera
                            </h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default App
