import {useState, useEffect} from "react";
import { getFirestore, doc, collection, query, onSnapshot, getDoc, getDocs, addDoc, updateDoc, arrayUnion } from "firebase/firestore";
import congestionPic from "./assets/rail_congestion.png"
import mapPic from "./assets/map.svg"
import StationCardAdmin from "./components/stationcardadmin.jsx";
import AnnouncementCard from "./components/announcementcard.jsx";
import {getDownloadURL, getStorage, listAll, ref} from "firebase/storage";
import AttentionCard from "./components/attentioncard.jsx";

function Admin(props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [allStationsData, setAllStationsData] = useState([]);
    const [stationsData, setStationsData] = useState([]);
    const [warningStationsData, setWarningStationsData] = useState([]);
    const [linesData, setLinesData] = useState([]);
    const [selectedStation, setSelectedStation] = useState(0);
    const [selectedLine, setSelectedLine] = useState(null);
    const [selectedPlatform, setSelectedPlatform] = useState(0);
    // const [selectedCapacity, setSelectedCapacity] = useState(null);
    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState("");
    const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
    const [newThreshold, setNewThreshold] = useState(0);
    const [avgCapacity, setAvgCapacity] = useState(null);
    const [totalCurrentNum, setTotalCurrentNum] = useState(null);
    const [NumThanUsual, setNumThanUsual] = useState(null);

    const db = getFirestore(props.firebase);
    const storage = getStorage();

    function abbreviateNumber(value) {
        let newValue = value;
        if (value >= 1000) {
            let suffixes = ["", "k", "m", "b","t"];
            let suffixNum = Math.floor( (""+value).length/3 );
            let shortValue = '';
            for (let precision = 2; precision >= 1; precision--) {
                shortValue = parseFloat( (suffixNum !== 0 ? (value / Math.pow(1000,suffixNum) ) : value).toPrecision(precision));
                let dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g,'');
                if (dotLessShortValue.length <= 2) { break; }
            }
            if (shortValue % 1 !== 0)  shortValue = shortValue.toFixed(1);
            newValue = shortValue+suffixes[suffixNum];
        }
        return newValue;
    }

    async function submitAnnouncement() {
        const docRef = await addDoc(collection(db, "announcements"), {
            title: newAnnouncementTitle,
            body: newAnnouncementContent
        });
        const doc2Ref = doc(db, "stations/" + stationsData[selectedStation].id);
        await updateDoc(doc2Ref, {
            announcements: arrayUnion(doc(db, "announcements/" + docRef.id))
        });
    }

    async function updateThreshold() {
        const docRef = doc(db, "stations/" + stationsData[selectedStation].id + "/platforms/" + "platform" + (selectedPlatform + 1));
        await updateDoc(docRef, {
            threshold: newThreshold
        });
    }

    async function runStationsQuery(querySnapshot) {
        let temp = [];
        let stationCapacities = [];
        let stationTotalCurrentNum = [];
        let stationsRequiringAttention = [];
        let stationsNumThanUsual = [];

        setAllStationsData([]);
        setStationsData([]);
        setWarningStationsData([]);

        await querySnapshot.forEach((docObj) => {
            temp.push(docObj.data())
        });
        for (let i = 0; i < temp.length; i++) {
            let tempObj = temp[i];
            const docRef = doc(db, tempObj.line.path);
            const docSnap = await getDoc(docRef);
            tempObj.line = docSnap.data();
            const listRef = ref(storage, tempObj.id);
            await listAll(listRef).then(async (res) => {
                for (let i = 0; i < res.items.length; i++) {
                    await getDownloadURL(res.items[i]).then((url) => {
                        tempObj.image = url;
                    });
                }
            });
            if (tempObj.announcements.length > 0) {
                let announcementPath = tempObj.announcements[tempObj.announcements.length - 1].path;
                if (announcementPath.length % 2 === 1) {
                    announcementPath = announcementPath.substring(1);
                }
                const docRef2 = doc(db, announcementPath);
                const docSnap2 = await getDoc(docRef2);
                tempObj.announcement = docSnap2.data();
            }
            const platformCollectionRef = collection(db, "stations", tempObj.id, "platforms");
            const platformQuery = query(platformCollectionRef);
            const platformQuerySnapshot = await getDocs(platformQuery);
            let platforms = [];
            let platformTotalPredNum = [];
            await platformQuerySnapshot.forEach((doc, index) => {
                let tempObjPlatform = doc.data();
                if (tempObjPlatform.pred_num.length > 0) {
                    tempObjPlatform.latest_num = tempObjPlatform.pred_num[tempObjPlatform.pred_num.length - 1];
                    if (tempObjPlatform.latest_num < 0) {
                        tempObjPlatform.latest_num = 0;
                    }
                }
                for (let i = 0; i < tempObjPlatform.pred_num.length; i++) {
                    platformTotalPredNum.push(tempObjPlatform.pred_num[i]);
                }
                tempObjPlatform.threshold = Number(tempObjPlatform.threshold);
                if (tempObjPlatform.threshold > 0) {
                    tempObjPlatform.currentCapacity = (tempObjPlatform.latest_num / tempObjPlatform.threshold * 100).toFixed(0);
                } else {
                    tempObjPlatform.currentCapacity = 0;
                }
                platforms.push(tempObjPlatform);
            });
            let platformAvgCapacity = 0;
            let platformTotalCurrentNum = 0;
            for (let i = 0; i < platforms.length; i++) {
                platformAvgCapacity += Number(platforms[i].currentCapacity);
                platformTotalCurrentNum += Number(platforms[i].latest_num);

                const picRef = ref(storage, tempObj.id + "/platform" + (i + 1) + "/captures/");
                await listAll(picRef).then(async (res) => {
                    for (let j = 0; j < res.items.length; j++) {
                        await getDownloadURL(res.items[j]).then((url) => {
                            platforms[i].image = url;
                        });
                    }
                });

                const picRef2 = ref(storage, tempObj.id + "/platform" + (i + 1) + "/prediction/");
                await listAll(picRef2).then(async (res) => {
                    for (let j = 0; j < res.items.length; j++) {
                        await getDownloadURL(res.items[j]).then((url) => {
                            platforms[i].predImg = url;
                        });
                    }
                });
            }
            let platformAvgPredNum = 0;
            for (let i = 0; i < platformTotalPredNum.length; i++) {
                platformAvgPredNum += Number(platformTotalPredNum[i]);
            }
            tempObj.platformTotalCurrentNum = platformTotalCurrentNum;
            platformAvgPredNum -= platformTotalCurrentNum;
            platformAvgPredNum = (platformAvgPredNum / platformTotalPredNum.length).toFixed(0);
            tempObj.stationNumThanUsual = (platformAvgPredNum / platformTotalCurrentNum * 100).toFixed(0);
            stationsNumThanUsual.push((platformAvgPredNum / platformTotalCurrentNum * 100).toFixed(0));
            platformAvgCapacity = (platformAvgCapacity / platforms.length).toFixed(0);
            tempObj.platformAvgCapacity = platformAvgCapacity;
            tempObj.platforms = platforms;
            stationCapacities.push(Number(platformAvgCapacity));
            stationTotalCurrentNum.push(Number(platformTotalCurrentNum));
            if (Number(platformAvgCapacity) > 80) {
                stationsRequiringAttention.push(tempObj);
            }
        }
        setAvgCapacity(Number((stationCapacities.reduce((a, b) => a + b, 0) / stationCapacities.length).toFixed(0)));
        setTotalCurrentNum(Number(stationTotalCurrentNum.reduce((a, b) => a + b, 0)));
        setNumThanUsual((Number(stationsNumThanUsual.reduce((a, b) => a + b, 0)) / stationsNumThanUsual.length).toFixed(1));
        setAllStationsData(temp);
        setStationsData(temp);
        setWarningStationsData(stationsRequiringAttention);
    }

    async function runLinesQuery(querySnapshot) {
        let temp2 = [];
        setLinesData([]);
        await querySnapshot.forEach((docObj) => {
            temp2.push(docObj.data());
        });
        setLinesData(temp2);
    }

    useEffect(() => {
        const unsubscribe = onSnapshot(query(collection(db, "stations")), async (querySnapshot) => {
            await runStationsQuery(querySnapshot);
        });

        const unsubscribe2 = onSnapshot(query(collection(db, "lines")), async (querySnapshot) => {
            await runLinesQuery(querySnapshot);
        });

        return () => {
            unsubscribe()
            unsubscribe2()
        }
    }, []);

    useEffect(() => {
        if (selectedLine !== null) {
            setStationsData(allStationsData.filter((station) => station.line.id === linesData[selectedLine].id));
        } else {
            setStationsData(allStationsData);
        }
    }, [selectedLine]);

    const handleChangeTitle = (event) => {
        setNewAnnouncementTitle(event.target.value);
    };

    const handleChangeContent = (event) => {
        setNewAnnouncementContent(event.target.value);
    };

    const handleChangeThreshold = (event) => {
        setNewThreshold(event.target.value);
    }

    return (
        <div className="h-screen w-screen flex relative">
            <div className="w-1/3 absolute p-7 z-30">
                <div>
                    <button type="button" className="hs-collapse-toggle p-2 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800" onClick={() => setIsExpanded(!isExpanded)}>
                        <svg className={`${isExpanded ? "hidden" : "block"} w-4 h-4`} width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                        <svg className={`${isExpanded ? "block" : "hidden"} w-4 h-4`} width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                            <path
                                d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div className="w-1/3 p-7 transition-all duration-500 ease-in-out border-r h-full overflow-y-scroll">
                <div className="pt-16 flex gap-3">
                    <div className="hs-dropdown relative inline-flex w-1/3 z-10">
                        <button id="hs-dropdown-with-icons" type="button" className="hs-dropdown-toggle py-3 px-4 inline-flex justify-between items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800 w-full">
                            <div>
                                {
                                    selectedLine === null ? "Line" : <div className="flex items-center rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300">
                                        <span className="inline-flex items-center align-middle py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + linesData[selectedLine].color}}>{linesData[selectedLine].id}</span>
                                    </div>
                                }
                            </div>
                            <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        </button>
                        <div
                            className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden mt-2 min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 divide-y divide-gray-200 dark:bg-gray-800 dark:border dark:border-gray-700 dark:divide-gray-700">
                            <div className="py-2 first:pt-0 last:pb-0">
                                {
                                    linesData.map((line, index) => {
                                        return (
                                            <a key={index} className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedLine(index)}>
                                                <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + line.color}}>{line.id}</span>
                                                {line.name}
                                            </a>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    </div>
                    {/*<div className="hs-dropdown relative inline-flex w-1/3 z-10">*/}
                    {/*    <button id="hs-dropdown-with-icons" type="button" className="hs-dropdown-toggle py-3 px-4 inline-flex justify-between items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800 w-full">*/}
                    {/*        <div>*/}
                    {/*            {*/}
                    {/*                selectedCapacity === null ? "Capacity" : (selectedCapacity === 0 ? "Low" : "High")*/}
                    {/*            }*/}
                    {/*        </div>*/}
                    {/*        <svg className="hs-dropdown-open:rotate-180 w-2.5 h-2.5 text-gray-600" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">*/}
                    {/*            <path d="M2 5L8.16086 10.6869C8.35239 10.8637 8.64761 10.8637 8.83914 10.6869L15 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>*/}
                    {/*        </svg>*/}
                    {/*    </button>*/}
                    {/*    <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 hidden mt-2 min-w-[15rem] bg-white shadow-md rounded-lg p-2 mt-2 divide-y divide-gray-200 dark:bg-gray-800 dark:border dark:border-gray-700 dark:divide-gray-700">*/}
                    {/*        <div className="py-2 first:pt-0 last:pb-0">*/}
                    {/*            <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedCapacity(1)}>*/}
                    {/*                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"*/}
                    {/*                     className="bi bi-circle-fill fill-red-500" viewBox="0 0 16 16">*/}
                    {/*                    <circle cx="8" cy="8" r="8"/>*/}
                    {/*                </svg>*/}
                    {/*                High*/}
                    {/*            </a>*/}
                    {/*            <a className="flex items-center gap-x-3.5 py-2 px-3 rounded-md text-sm text-gray-800 hover:bg-gray-100 focus:ring-2 focus:ring-blue-500 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300" href="#" onClick={() => setSelectedCapacity(0)}>*/}
                    {/*                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"*/}
                    {/*                     className="bi bi-circle-fill fill-green-500" viewBox="0 0 16 16">*/}
                    {/*                    <circle cx="8" cy="8" r="8"/>*/}
                    {/*                </svg>*/}
                    {/*                Low*/}
                    {/*            </a>*/}
                    {/*        </div>*/}
                    {/*    </div>*/}
                    {/*</div>*/}
                </div>
                <div className="py-6">
                    {
                        stationsData.map((station, index) => {
                            return (
                                <StationCardAdmin key={index} stationId={station.id} stationName={station.name} stationColor={station.line.color} stationPic={station.image} stationAvgCapacity={station.platformAvgCapacity} onClick={() => setSelectedStation(index)}/>
                            )
                        })
                    }
                </div>
            </div>
            <div className={`${isExpanded ? "w-1/3" : "w-0"} transition-all duration-500 ease-in-out`}></div>
            <div className="w-1/3 p-7 border-r transition-all duration-500 ease-in-out bg-white absolute z-20 h-screen overflow-y-scroll" style={isExpanded ? {transform: "translateX(100%)"} : {transform: "translateX(0%)"}}>
                <div className={`flex pb-3 ${isExpanded ? "pl-0" : "pl-7"} transition-all duration-500 ease-in-out`}>
                    <div className={`flex-1 text-3xl font-bold ${isExpanded ? "text-gray-300" : "px-6 text-black"} transition-all duration-500 ease-in-out`}>
                        {
                            isExpanded ? "Station Info" : "All Stations"
                        }
                    </div>
                </div>
                {
                    isExpanded ? <div>
                        <div className="py-6 text-4xl font-bold">
                            {
                                stationsData.length ? <span className="inline-block align-middle mr-5">{stationsData[selectedStation].name}</span> : <span className="inline-block align-middle mr-5"></span>
                            }
                            {
                                stationsData.length ? <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + stationsData[selectedStation].line.color}}>{stationsData[selectedStation].id}</span> : <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase"></span>
                            }
                        </div>
                        <div className="py-3">
                            <div className="border rounded-xl shadow-sm overflow-hidden flex flex-col dark:border-gray-700 dark:shadow-slate-700/[.7] divide-y dark:divide-gray-600">
                                <div className="rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                    <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                        Latest Announcement
                                    </p>
                                </div>
                                {
                                    stationsData.length ?  <AnnouncementCard title={stationsData[selectedStation].announcement.title} body={stationsData[selectedStation].announcement.body}/> : <AnnouncementCard title="No Announcement" body="No Announcement"/>
                                }
                                <div className="border-t rounded-b-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700 text-right">
                                    <button type="button" className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-announcement" onClick={() => { setNewAnnouncementContent(""); setNewAnnouncementTitle("");}}>
                                        Add announcement
                                        <svg className="w-2.5 h-auto" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path fillRule="evenodd" clipRule="evenodd" d="M1 7C0.447715 7 -3.73832e-07 7.44771 -3.49691e-07 8C-3.2555e-07 8.55228 0.447715 9 1 9L13.0858 9L7.79289 14.2929C7.40237 14.6834 7.40237 15.3166 7.79289 15.7071C8.18342 16.0976 8.81658 16.0976 9.20711 15.7071L16.0303 8.88388C16.5185 8.39573 16.5185 7.60427 16.0303 7.11612L9.20711 0.292893C8.81658 -0.0976318 8.18342 -0.0976318 7.79289 0.292893C7.40237 0.683417 7.40237 1.31658 7.79289 1.70711L13.0858 7L1 7Z" fill="currentColor"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="hs-accordion-group">
                            <div
                                className="hs-accordion active bg-white border -mt-px first:rounded-t-lg last:rounded-b-lg dark:bg-gray-800 dark:border-gray-700"
                                id="hs-bordered-heading-one">
                                <button
                                    className="hs-accordion-toggle hs-accordion-active:text-blue-600 inline-flex items-center gap-x-3 w-full font-semibold text-left text-gray-800 transition py-4 px-5 hover:text-gray-500 dark:hs-accordion-active:text-blue-500 dark:text-gray-200 dark:hover:text-gray-400"
                                    aria-controls="hs-basic-bordered-collapse-one">
                                    <svg
                                        className="hs-accordion-active:hidden hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 block w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400"
                                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 8.85999L14.5 8.85998" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                        <path d="M8 15.36L8 2.35999" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                    </svg>
                                    <svg
                                        className="hs-accordion-active:block hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 hidden w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400"
                                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 8.85999L14.5 8.85998" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                    </svg>
                                    Platform 1
                                </button>
                                <div id="hs-basic-bordered-collapse-one"
                                     className="hs-accordion-content w-full overflow-hidden transition-[height] duration-300 px-2"
                                     aria-labelledby="hs-bordered-heading-one">
                                    <div className="pb-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Station Capacity
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5">
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {
                                                        stationsData.length ? <span className={`text-6xl ${stationsData[selectedStation].platforms[0].currentCapacity >= 80 ? "text-red-500" : "text-blue-500"}`}>{<span className="text-4xl">{stationsData[selectedStation].platforms[0].currentCapacity}</span>}</span> : <span className="text-6xl text-red-500">0</span>
                                                    }
                                                    <span className="text-md text-gray-500 dark:text-gray-400 px-2"> / 100% of threshold</span>
                                                </h3>
                                            </div>
                                            <div className="border-t rounded-b-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700 text-right">
                                                <button type="button" className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-threshold" onClick={() => setSelectedPlatform(0)}>
                                                    Modify threshold
                                                    <svg className="w-2.5 h-auto" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M1 7C0.447715 7 -3.73832e-07 7.44771 -3.49691e-07 8C-3.2555e-07 8.55228 0.447715 9 1 9L13.0858 9L7.79289 14.2929C7.40237 14.6834 7.40237 15.3166 7.79289 15.7071C8.18342 16.0976 8.81658 16.0976 9.20711 15.7071L16.0303 8.88388C16.5185 8.39573 16.5185 7.60427 16.0303 7.11612L9.20711 0.292893C8.81658 -0.0976318 8.18342 -0.0976318 7.79289 0.292893C7.40237 0.683417 7.40237 1.31658 7.79289 1.70711L13.0858 7L1 7Z" fill="currentColor"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Estimated Users
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5">
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {
                                                        stationsData.length ? <span className="text-6xl">
                                                            ~
                                                            {
                                                                abbreviateNumber(stationsData[selectedStation].platforms[0].latest_num)
                                                            }
                                                        </span> : <span className="text-6xl">0</span>
                                                    }
                                                    <span className="text-md text-gray-500 dark:text-gray-400 px-2"> users in station</span>
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Latest Captured Image
                                                </p>
                                            </div>
                                            {
                                                stationsData.length ? <>
                                                    {
                                                        stationsData[selectedStation].platforms[0].image ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[0].image} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" />
                                                    }
                                                </> : <img className="w-full h-auto rounded-b-xl" />
                                            }
                                            {
                                                stationsData.length ? <>
                                                    {
                                                        stationsData[selectedStation].platforms[0].predImg ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[0].predImg} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" />
                                                    }
                                                </> : <img className="w-full h-auto rounded-b-xl" />
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                className="hs-accordion bg-white border -mt-px first:rounded-t-lg last:rounded-b-lg dark:bg-gray-800 dark:border-gray-700"
                                id="hs-bordered-heading-two">
                                <button
                                    className="hs-accordion-toggle hs-accordion-active:text-blue-600 inline-flex items-center gap-x-3 w-full font-semibold text-left text-gray-800 transition py-4 px-5 hover:text-gray-500 dark:hs-accordion-active:text-blue-500 dark:text-gray-200 dark:hover:text-gray-400"
                                    aria-controls="hs-basic-bordered-collapse-two">
                                    <svg
                                        className="hs-accordion-active:hidden hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 block w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400"
                                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 8.85999L14.5 8.85998" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                        <path d="M8 15.36L8 2.35999" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                    </svg>
                                    <svg
                                        className="hs-accordion-active:block hs-accordion-active:text-blue-600 hs-accordion-active:group-hover:text-blue-600 hidden w-3 h-3 text-gray-600 group-hover:text-gray-500 dark:text-gray-400"
                                        width="16" height="16" viewBox="0 0 16 16" fill="none"
                                        xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.5 8.85999L14.5 8.85998" stroke="currentColor" strokeWidth="2"
                                              strokeLinecap="round"/>
                                    </svg>
                                    Platform 2
                                </button>
                                <div id="hs-basic-bordered-collapse-two"
                                     className="hs-accordion-content hidden w-full overflow-hidden transition-[height] duration-300 px-2"
                                     aria-labelledby="hs-bordered-heading-two">
                                    <div className="pb-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Station Capacity
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5">
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {
                                                        stationsData.length ? <span className={`text-6xl ${stationsData[selectedStation].platforms[1].currentCapacity >= 80 ? "text-red-500" : "text-blue-500"}`}>{<span className="text-4xl">{stationsData[selectedStation].platforms[1].currentCapacity}</span>}</span> : <span className="text-6xl text-red-500">0</span>
                                                    }
                                                    <span className="text-md text-gray-500 dark:text-gray-400 px-2"> / 100% of threshold</span>
                                                </h3>
                                            </div>
                                            <div className="border-t rounded-b-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700 text-right">
                                                <button type="button" className="py-2 px-3 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-threshold" onClick={() => {setSelectedPlatform(0); updateThreshold(); setNewThreshold("");}}>
                                                    Modify threshold
                                                    <svg className="w-2.5 h-auto" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path fillRule="evenodd" clipRule="evenodd" d="M1 7C0.447715 7 -3.73832e-07 7.44771 -3.49691e-07 8C-3.2555e-07 8.55228 0.447715 9 1 9L13.0858 9L7.79289 14.2929C7.40237 14.6834 7.40237 15.3166 7.79289 15.7071C8.18342 16.0976 8.81658 16.0976 9.20711 15.7071L16.0303 8.88388C16.5185 8.39573 16.5185 7.60427 16.0303 7.11612L9.20711 0.292893C8.81658 -0.0976318 8.18342 -0.0976318 7.79289 0.292893C7.40237 0.683417 7.40237 1.31658 7.79289 1.70711L13.0858 7L1 7Z" fill="currentColor"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Estimated Users
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5">
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {
                                                        stationsData.length ? <span className="text-6xl">
                                                            ~
                                                            {
                                                                abbreviateNumber(stationsData[selectedStation].platforms[1].latest_num)
                                                            }
                                                        </span> : <span className="text-6xl">0</span>
                                                    }
                                                    <span className="text-md text-gray-500 dark:text-gray-400 px-2"> users in station</span>
                                                </h3>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="py-2">
                                        <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                            <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                                <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                    Latest Captured Image
                                                </p>
                                            </div>
                                            {
                                                stationsData.length ? <>
                                                    {
                                                        stationsData[selectedStation].platforms[1].image ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[1].image} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />
                                                    }
                                                </> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />
                                            }
                                            {
                                                stationsData.length ? <>
                                                    {
                                                        stationsData[selectedStation].platforms[1].predImg ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[1].predImg} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" />
                                                    }
                                                </> : <img className="w-full h-auto rounded-b-xl" />
                                            }
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div> : <>
                        {
                            stationsData.length ? <>
                                <div className="py-3">
                                    {
                                        warningStationsData.length ? <div className="bg-orange-500 text-sm text-white rounded-md p-4" role="alert">
                                            <span className="font-bold">Warning</span> Some stations are currently operating at high capacity.
                                        </div> : <></>
                                    }
                                </div>
                                <div className="py-3">
                                    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                                        <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">
                                            <p className="mt-1 text-md text-gray-500 dark:text-gray-500">
                                                Overall
                                            </p>
                                        </div>
                                        <div className="p-4 md:p-5 flex items-center">
                                            <div className="flex-1">
                                                <h3 className="font-bold text-gray-800 dark:text-white">
                                                    {
                                                        stationsData.length ? <span className="text-4xl">{avgCapacity}</span> : <span className="text-4xl">0</span>
                                                    }
                                                    <span className="text-md text-gray-500 dark:text-gray-400"> / 100%</span>
                                                </h3>
                                                <p className="mt-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
                                                    ~ {totalCurrentNum} total users, + {NumThanUsual}% than usual
                                                </p>
                                                <p className="mt-2 text-gray-800 dark:text-gray-400">
                                                    {
                                                        avgCapacity >= 80 ? "Stations are currently operating at high capacity." : "Stations are currently operating at normal capacity."
                                                    }
                                                </p>
                                            </div>
                                            <div className="pl-5 pr-2">
                                                <div className="flex flex-col flex-nowrap justify-end w-2 h-32 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                                                    <div className={`${avgCapacity >= 80 ? "bg-red-500" : "bg-blue-500"} overflow-hidden`} role="progressbar" style={{height: avgCapacity + "%"}} aria-valuenow={Number(avgCapacity)} aria-valuemin="0" aria-valuemax="100"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="py-3">
                                    {
                                        warningStationsData.map((station, index) => {
                                            return <AttentionCard key={index} stationId={station.id} stationName={station.name} stationColor={station.line.color} stationCapacity={station.platformAvgCapacity} stationUsers={abbreviateNumber(station.platformTotalCurrentNum)}/>
                                        })
                                    }
                                </div>
                            </> : <div className="text-center py-5">
                                <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                                    <span className="sr-only">Loading...</span>
                                </div>
                            </div>
                        }
                    </>
                }
            </div>
            <div className="flex-1 p-7">
                <img src={mapPic} alt="map" className="w-full h-full" draggable={false} />
            </div>
            <div id="hs-slide-down-animation-modal-threshold" className="hs-overlay hidden w-full h-full fixed top-0 left-0 z-[60] overflow-x-hidden overflow-y-auto">
                <div
                    className="hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 mt-0 opacity-0 ease-out transition-all sm:max-w-lg sm:w-full m-3 sm:mx-auto">
                    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                        <div className="flex justify-between items-center py-3 px-4 border-b dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white">
                                Modify threshold
                            </h3>
                            <button type="button" className="hs-dropdown-toggle inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all text-sm dark:focus:ring-gray-700 dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-threshold">
                                <span className="sr-only">Close</span>
                                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            {
                                stationsData.length ? <div className="text-sm text-gray-500 mt-2 text-center" id="hs-inline-input-helper-text">Original threshold: {(stationsData[selectedStation].platforms[selectedPlatform].threshold).toLocaleString()}</div> : <div className="text-sm text-gray-500 mt-2 text-center" id="hs-inline-input-helper-text">Original threshold: </div>
                            }
                            <div className="inline-flex items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 w-full mt-4">
                                <label htmlFor="inline-input-label-with-helper-text" className="block text-sm font-medium dark:text-white">New Threshold</label>
                                {
                                    stationsData.length ? <input type="email" id="inline-input-label-with-helper-text" className="py-3 px-4 block border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" placeholder={(stationsData[selectedStation].platforms[selectedPlatform].threshold).toString()} aria-describedby="hs-inline-input-helper-text" value={newThreshold} onChange={handleChangeThreshold}/> : <span></span>
                                }
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t dark:border-gray-700">
                            <button type="button" className="hs-dropdown-toggle py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-threshold">
                                Close
                            </button>
                            <a className="py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" href="#" data-hs-overlay="#hs-slide-down-animation-modal-threshold" onClick={() => {setSelectedPlatform(1); updateThreshold(); setNewThreshold("");}}>
                                Save changes
                            </a>
                        </div>
                    </div>
                </div>
            </div>
            <div id="hs-slide-down-animation-modal-announcement" className="hs-overlay hidden w-full h-full fixed top-0 left-0 z-[60] overflow-x-hidden overflow-y-auto">
                <div className="hs-overlay-open:mt-7 hs-overlay-open:opacity-100 hs-overlay-open:duration-500 mt-0 opacity-0 ease-out transition-all sm:max-w-lg sm:w-full m-3 sm:mx-auto">
                    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">
                        <div className="flex justify-between items-center py-3 px-4 border-b dark:border-gray-700">
                            <h3 className="font-bold text-gray-800 dark:text-white">
                                Add announcement
                            </h3>
                            <button type="button" className="hs-dropdown-toggle inline-flex flex-shrink-0 justify-center items-center h-8 w-8 rounded-md text-gray-500 hover:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all text-sm dark:focus:ring-gray-700 dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-announcement">
                                <span className="sr-only">Close</span>
                                <svg className="w-3.5 h-3.5" width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M0.258206 1.00652C0.351976 0.912791 0.479126 0.860131 0.611706 0.860131C0.744296 0.860131 0.871447 0.912791 0.965207 1.00652L3.61171 3.65302L6.25822 1.00652C6.30432 0.958771 6.35952 0.920671 6.42052 0.894471C6.48152 0.868271 6.54712 0.854471 6.61352 0.853901C6.67992 0.853321 6.74572 0.865971 6.80722 0.891111C6.86862 0.916251 6.92442 0.953381 6.97142 1.00032C7.01832 1.04727 7.05552 1.1031 7.08062 1.16454C7.10572 1.22599 7.11842 1.29183 7.11782 1.35822C7.11722 1.42461 7.10342 1.49022 7.07722 1.55122C7.05102 1.61222 7.01292 1.6674 6.96522 1.71352L4.31871 4.36002L6.96522 7.00648C7.05632 7.10078 7.10672 7.22708 7.10552 7.35818C7.10442 7.48928 7.05182 7.61468 6.95912 7.70738C6.86642 7.80018 6.74102 7.85268 6.60992 7.85388C6.47882 7.85498 6.35252 7.80458 6.25822 7.71348L3.61171 5.06702L0.965207 7.71348C0.870907 7.80458 0.744606 7.85498 0.613506 7.85388C0.482406 7.85268 0.357007 7.80018 0.264297 7.70738C0.171597 7.61468 0.119017 7.48928 0.117877 7.35818C0.116737 7.22708 0.167126 7.10078 0.258206 7.00648L2.90471 4.36002L0.258206 1.71352C0.164476 1.61976 0.111816 1.4926 0.111816 1.36002C0.111816 1.22744 0.164476 1.10028 0.258206 1.00652Z" fill="currentColor"/>
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <div className="flex flex-col gap-8">
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Title</label>
                                    <div className="relative">
                                        <input type="text" id="hs-trailing-icon" name="hs-trailing-icon" className="py-3 px-4 pr-11 block w-full border-gray-200 shadow-sm rounded-md text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" value={newAnnouncementTitle} onChange={handleChangeTitle}/>
                                        <div
                                            className="absolute inset-y-0 right-0 flex items-center pointer-events-none z-20 pr-4">
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2 dark:text-white">Content</label>
                                    <div className="relative">
                                        <textarea className="py-3 px-4 block w-full border-gray-200 rounded-md text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400" rows="5" value={newAnnouncementContent} onChange={handleChangeContent}></textarea>
                                        <div
                                            className="absolute inset-y-0 right-0 flex items-center pointer-events-none z-20 pr-4">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end items-center gap-x-2 py-3 px-4 border-t dark:border-gray-700">
                            <button type="button" className="hs-dropdown-toggle py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800" data-hs-overlay="#hs-slide-down-animation-modal-announcement">
                                Close
                            </button>
                            <a className="py-3 px-4 inline-flex justify-center items-center gap-2 rounded-md border border-transparent font-semibold bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all text-sm dark:focus:ring-offset-gray-800" href="#" data-hs-overlay="#hs-slide-down-animation-modal-announcement" onClick={() => submitAnnouncement()}>
                                Save changes
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Admin;