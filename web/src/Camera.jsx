import {useEffect, useState, useRef} from "react";
import {collection, doc, getDoc, getFirestore, onSnapshot, query} from "firebase/firestore";
import {getStorage, ref, uploadString} from "firebase/storage";

function Camera(props) {
    const db = getFirestore(props.firebase);
    const storage = getStorage();
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const testRef = useRef(null);
    const [isTopModalOpen, setIsTopModalOpen] = useState(true);
    const [allStationsData, setAllStationsData] = useState([]);
    const [stationsData, setStationsData] = useState([]);
    const [linesData, setLinesData] = useState([]);
    const [selectedStation, setSelectedStation] = useState(null);
    const [selectedLine, setSelectedLine] = useState(null);
    const [selectedPlatform, setSelectedPlatform] = useState(null);
    const [deviceId, setDeviceId] = useState(null);
    const [deviceLabel, setDeviceLabel] = useState(null);
    const [selectedStationId, setSelectedStationId] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "stations"));
        let temp = [];
        const unsubscribe = onSnapshot(q, async (querySnapshot) => {
            temp = [];
            setAllStationsData([]);
            setStationsData([]);
            await querySnapshot.forEach((docObj) => {
                temp.push(docObj.data())
            });
            for (let i = 0; i < temp.length; i++) {
                let tempObj = temp[i];
                const docRef = doc(db, tempObj.line.path);
                const docSnap = await getDoc(docRef);
                tempObj.line = docSnap.data();
            }
            setAllStationsData(temp);
            setStationsData(temp);
        });
        if (navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices
                .getUserMedia({
                    video: {
                        facingMode: 'environment',
                        width: {
                            min: 1024,
                            ideal: 1024,
                        },
                        height: {
                            min: 768,
                            ideal: 768,
                        },
                        aspectRatio: 3/4
                    },
                    audio: false,
                })
                .then(stream => {
                    window.stream = stream;
                    setDeviceLabel(stream.getVideoTracks()[0].label)
                    setDeviceId(stream.getVideoTracks()[0].getSettings().deviceId)
                    videoRef.current.srcObject = stream;
                    return new Promise(resolve => {
                        videoRef.current.onloadedmetadata = () => {
                            resolve();
                        };
                    });
                }, (error) => {
                    console.log("Couldn't start the webcam");
                    console.error(error);
                });

            setInterval(() => {
                if (selectedStationId !== null) {
                    canvasRef.current.getContext("2d").drawImage(videoRef.current, 0, 0, 1024, 768);
                    const imgData = canvasRef.current.toDataURL('image/png');
                    let base64Image = imgData.split(';base64,').pop();
                    testRef.current.src = imgData;
                    let formData = new FormData();
                    formData.append('station_id', selectedStationId);
                    formData.append('platform_number', (selectedPlatform + 1));
                    formData.append('platform_image', base64Image);
                    fetch('https://crowddetectml-v1-u5jzu7mwfq-nn.a.run.app/predict', {
                        method: 'POST',
                        body: formData
                    }).then(
                        response => response.text() // if the response is a JSON object
                    ).then(
                        success => console.log(success) // Handle the success response object
                    ).catch(
                        error => console.log(error) // Handle the error response object
                    );
                    const storageRef = ref(storage, selectedStationId + '/platform' + (selectedPlatform + 1) + '/captures/upload.png');
                    uploadString(storageRef,imgData.split(';base64,')[1], 'base64').then((snapshot) => {});
                }
            }, 10000);
        }

        const q2 = query(collection(db, "lines"));
        let temp2 = [];
        const unsubscribe2 = onSnapshot(q2, async (querySnapshot) => {
            temp2 = [];
            setLinesData([]);
            await querySnapshot.forEach((docObj) => {
                temp2.push(docObj.data());
            });
            setLinesData(temp2);
        });

        return () => {
            unsubscribe()
            unsubscribe2()
        }
    }, [selectedStationId]);

    useEffect(() => {
        if (selectedLine !== null) {
            setStationsData(allStationsData.filter((station) => station.line.id === linesData[selectedLine].id));
        } else {
            setStationsData(allStationsData);
        }
    }, [selectedLine]);

    return (
        <div className="h-screen">
            <div id="hs-overlay-top" className={`hs-overlay ${isTopModalOpen ? "translate-y-0" : "-translate-y-full"} fixed top-0 inset-x-0 transition-all duration-300 transform w-full z-[60] bg-white border-b dark:bg-gray-800 dark:border-gray-700`} tabIndex="-1">
                <div className="h-full p-8">
                    <div>
                        <div className="text-3xl font-bold text-center">
                            Pick a Station
                        </div>
                        {
                            stationsData.length ? <>
                                <div className="py-6 flex items-center flex-col gap-4">
                                    <div>
                                        <div className="hs-dropdown relative inline-flex items-center justify-center space-x-3 z-40">
                                            <label className="block text-md font-medium dark:text-white">Line</label>
                                            <button id="hs-dropdown-custom-trigger" type="button" className="hs-dropdown-toggle py-1 pl-1 pr-3 inline-flex justify-center items-center gap-2 rounded-full border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                        <span className={`inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase ${selectedLine === null ? "opacity-0" : ""}`} style={{backgroundColor: `#${selectedLine !== null ? linesData[selectedLine].color : "FFFFFF"}`}}>
                                            {
                                                selectedLine === null ? "" : linesData[selectedLine].id
                                            }
                                        </span>
                                                <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">
                                            {
                                                selectedLine === null ? "Select a Line" : linesData[selectedLine].name
                                            }
                                        </span>
                                                <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                            <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden mt-2 min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 dark:bg-gray-800 dark:border dark:border-gray-700" aria-labelledby="hs-dropdown-custom-trigger">
                                                {
                                                    linesData.map((line, index) => {
                                                        return (
                                                            <a key={index} className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedLine(index)}>
                                                                <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + line.color}}>{line.id}</span>
                                                                <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">{line.name}</span>
                                                            </a>
                                                        )
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="hs-dropdown relative inline-flex items-center justify-center space-x-3 z-30">
                                            <label className="block text-md font-medium dark:text-white">Station</label>
                                            <button id="hs-dropdown-custom-trigger" type="button" className="hs-dropdown-toggle py-1 pl-1 pr-3 inline-flex justify-center items-center gap-2 rounded-full border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                        <span className={`inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase ${selectedStation === null ? "opacity-0" : ""}`} style={{backgroundColor: `#${selectedStation !== null ? stationsData[selectedStation].line.color : "FFFFFF"}`}}>
                                            {
                                                selectedStation === null ? "" : stationsData[selectedStation].id
                                            }
                                        </span>
                                                <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">
                                            {
                                                selectedStation === null ? "Select a Station" : stationsData[selectedStation].name
                                            }
                                        </span>
                                                <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                            <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden mt-2 min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 dark:bg-gray-800 dark:border dark:border-gray-700" aria-labelledby="hs-dropdown-custom-trigger">
                                                {
                                                    stationsData.map((station, index) => {
                                                        return (
                                                            <a key={index} className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => {
                                                                setSelectedStation(index)
                                                                setSelectedStationId(station.id)
                                                            }}>
                                                                <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + station.line.color}}>{station.id}</span>
                                                                <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">{station.name}</span>
                                                            </a>
                                                        )
                                                    })
                                                }
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="hs-dropdown relative inline-flex items-center justify-center space-x-3 z-20">
                                            <label className="block text-md font-medium dark:text-white">Platform</label>
                                            <button id="hs-dropdown-custom-trigger" type="button" className="hs-dropdown-toggle py-1 pl-1 pr-3 inline-flex justify-center items-center gap-2 rounded-full border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                                <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase opacity-0"></span>
                                                <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">
                                            {
                                                selectedPlatform === null ? "Select a Platform" : "Platform " + (selectedPlatform + 1)
                                            }
                                        </span>
                                                <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                                </svg>
                                            </button>
                                            <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden mt-2 min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 dark:bg-gray-800 dark:border dark:border-gray-700" aria-labelledby="hs-dropdown-custom-trigger">
                                                <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedPlatform(0)}>
                                                    <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">Platform 1</span>
                                                </a>
                                                <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedPlatform(1)}>
                                                    <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">Platform 2</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </> : <div className="text-center py-5">
                                <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                                    <span className="sr-only">Loading...</span>
                                </div>
                            </div>
                        }
                        <div className="flex my-2 justify-center">
                            <button type="button" className="py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" onClick={() => setIsTopModalOpen(!isTopModalOpen)} disabled={!(selectedStation !== null && selectedPlatform !== null)}>
                                Confirm
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-down" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`h-full p-4 flex flex-col ${isTopModalOpen ? "blur-sm" : "blur-none"} transition-all duration-300`}>
                <div className="pb-3 text-center">
                    <button type="button" className="py-3 px-4 py-3 px-4 inline-flex justify-center items-center gap-2 rounded-full border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800" onClick={() => setIsTopModalOpen(!isTopModalOpen)}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-chevron-compact-down" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M1.553 6.776a.5.5 0 0 1 .67-.223L8 9.44l5.776-2.888a.5.5 0 1 1 .448.894l-6 3a.5.5 0 0 1-.448 0l-6-3a.5.5 0 0 1-.223-.67z"/>
                        </svg>
                    </button>
                </div>
                <div id="cameraBox" className="w-full">
                    <video autoPlay muted playsInline ref={videoRef} className="aspect-[4/3] w-full"></video>
                    <div className="h-full relative opacity-0">
                        <canvas ref={canvasRef} className="w-full absolute" height="768" width="1024"></canvas>
                    </div>
                </div>
                <div className="text-center py-4">
                    <div className="inline-block max-w-xs bg-white border rounded-md shadow-lg dark:bg-gray-800 dark:border-gray-700" role="alert">
                        <div className="flex items-center p-4">
                            {
                                isTopModalOpen ? <div className="aspect-square inline-block w-4 h-4"></div> : <div className="aspect-square animate-spin inline-block w-4 h-4 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                                    <span className="sr-only">Loading...</span>
                                </div>
                            }
                            <p className="ml-3 text-sm text-gray-700 dark:text-gray-400">
                                {
                                    isTopModalOpen ? "Pick a station to start capturing" : "Capture in progress, happening automatically every 30 seconds."
                                }
                            </p>
                        </div>
                    </div>
                </div>
                <div className="py-4">
                    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                        <div className="bg-gray-100 border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:bg-gray-800 dark:border-gray-700">
                            <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                Last Captured Image
                            </p>
                        </div>
                        <img ref={testRef} className="w-full h-auto rounded-b-xl" alt="" />
                    </div>
                </div>
                <div className="pt-4 pb-10">
                    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                        <div className="bg-gray-100 border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:bg-gray-800 dark:border-gray-700">
                            <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                Device information
                            </p>
                        </div>
                        <div className="p-4 md:p-5">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                {deviceLabel ? deviceLabel : "No device selected"}
                            </h3>
                            <p className="mt-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-500 text-ellipsis overflow-hidden">
                                {deviceId ? deviceId : "No device selected"}
                            </p>
                            <a className="mt-3 inline-flex items-center gap-2 mt-5 text-sm font-medium text-blue-500 hover:text-blue-700" href="https://developer.mozilla.org/en-US/docs/Web/API/MediaDeviceInfo" target="_blank" referrerPolicy="no-referrer">
                                Learn more
                                <svg className="w-2.5 h-auto" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 1L10.6869 7.16086C10.8637 7.35239 10.8637 7.64761 10.6869 7.83914L5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div className={`h-screen w-screen top-0 bg-black ${isTopModalOpen ? "pointer-events-auto opacity-20" : "pointer-events-none opacity-0"} transition-all duration-300 fixed`}></div>
        </div>
    )
}

export default Camera;