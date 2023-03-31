import {useEffect, useState, useRef} from "react";
import StationCardPublic from "./components/stationcardpublic.jsx";
import congestionPic from "./assets/rail_congestion.png";
import AnnouncementCard from "./components/announcementcard.jsx";
import {collection, doc, getDoc, getDocs, getFirestore, onSnapshot, query} from "firebase/firestore";
import { ref, getStorage, listAll, getDownloadURL } from "firebase/storage";

function Public(props) {
    const db = getFirestore(props.firebase);
    const storage = getStorage();
    const [stationIsSelected, setStationIsSelected] = useState(false);
    const [allStationsData, setAllStationsData] = useState([]);
    const [stationsData, setStationsData] = useState([]);
    const [linesData, setLinesData] = useState([]);
    const [selectedStation, setSelectedStation] = useState(0);
    const [selectedLine, setSelectedLine] = useState(null);
    const title1ref = useRef(null);
    const title2ref = useRef(null);
    const part1ref = useRef(null);
    const part2ref = useRef(null);
    const scrollRef = useRef(null);

    function resetScrollHeight() {
        part1ref.current.style.height = "auto";
        part2ref.current.style.height = "auto";
        if (stationIsSelected) {
            if (part1ref.current.offsetHeight > part2ref.current.offsetHeight) {
                part1ref.current.style.height = 0;
                part2ref.current.style.height = "auto";
            } else {
                part1ref.current.style.height = 0;
                part2ref.current.style.height = "auto";
            }
        } else {
            if (part1ref.current.offsetHeight < part2ref.current.offsetHeight) {
                part1ref.current.style.height = "auto";
                part2ref.current.style.height = 0;
            } else {
                part1ref.current.style.height = "auto";
                part2ref.current.style.height = 0;
            }
        }
    }

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

    useEffect(() => {
        window.scrollTo(0, 0)
        resetScrollHeight();
    }, [stationIsSelected])

    async function runStationsQuery(querySnapshot) {
        let temp = [];
        // let stationCapacities = [];
        // let stationTotalCurrentNum = [];
        // let stationsRequiringAttention = [];
        // let stationsNumThanUsual = [];
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
            await platformQuerySnapshot.forEach((doc) => {
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
            }
            let platformAvgPredNum = 0;
            for (let i = 0; i < platformTotalPredNum.length; i++) {
                platformAvgPredNum += Number(platformTotalPredNum[i]);
            }
            platformAvgPredNum -= platformTotalCurrentNum;
            platformAvgPredNum = (platformAvgPredNum / platformTotalPredNum.length).toFixed(0);
            tempObj.stationNumThanUsual = (platformAvgPredNum / platformTotalCurrentNum * 100).toFixed(0);
            // stationsNumThanUsual.push((platformAvgPredNum / platformTotalCurrentNum * 100).toFixed(0));
            platformAvgCapacity = (platformAvgCapacity / platforms.length).toFixed(0);
            tempObj.platformAvgCapacity = platformAvgCapacity;
            tempObj.platforms = platforms;
            // stationCapacities.push(Number(platformAvgCapacity));
            // stationTotalCurrentNum.push(Number(platformTotalCurrentNum));
            // if (Number(platformAvgCapacity) > 80) {
            //     stationsRequiringAttention.push(tempObj);
            // }
        }
        setAllStationsData(temp);
        setStationsData(temp);
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
        resetScrollHeight();

        const unsubscribe = onSnapshot(query(collection(db, "stations")), async (querySnapshot) => {
            await runStationsQuery(querySnapshot)
        });

        const unsubscribe2 = onSnapshot(query(collection(db, "lines")), async (querySnapshot) => {
            await runLinesQuery(querySnapshot)
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

    return (
        <div className="flex">
            <div className="h-full flex-1 w-full overflow-x-hidden overflow-y-hidden">
                <div className="px-6 pt-6 lg:px-10 lg:pt-10">
                    <div className="text-3xl font-bold inline-flex whitespace-nowrap transition-all duration-500 ease-in-out" style={{transform: !stationIsSelected ? "translateX(0)" : "translateX(-" + title1ref.current.offsetWidth + "px)"}}>
                        <div ref={title1ref} className={`transition-all duration-500 inline-flex pr-4 ${!stationIsSelected ? "opacity-100" : "opacity-0"}`}>
                            <div className="flex flex-col justify-center">
                                <span className="flex-shrink">Pick a Station</span>
                            </div>
                        </div>
                        <div className={`inline-block text-gray-300 transition-all duration-500 ${!stationIsSelected ? "opacity-0" : "opacity-100"}`}>
                            <button type="button" onClick={() => setStationIsSelected(!stationIsSelected)} className="inline-flex flex-shrink-0 justify-center items-center gap-2 h-[2.875rem] w-[2.875rem] rounded-md border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 focus:ring-offset-white transition-all text-xs dark:bg-gray-800 dark:hover:bg-slate-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-gray-700 dark:focus:ring-offset-gray-800 align-middle">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-bar-left" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M12.5 15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 1 0v13a.5.5 0 0 1-.5.5ZM10 8a.5.5 0 0 1-.5.5H3.707l2.147 2.146a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 1 1 .708.708L3.707 7.5H9.5a.5.5 0 0 1 .5.5Z"/>
                                </svg>
                            </button>
                            <span className="align-middle px-4">Station Info</span>
                        </div>
                    </div>
                    <div className="py-6">
                        <div className="relative z-10 whitespace-nowrap transition-all duration-500 ease-in-out" style={{transform: !stationIsSelected ? "translateX(0)" : "translateX(-" + title2ref.current.offsetWidth + "px)"}}>
                            <div ref={title2ref} className={`hs-dropdown relative inline-flex items-center justify-center space-x-3 align-middle pr-4 transition-all duration-700 ${!stationIsSelected ? "opacity-100" : "opacity-0"}`}>
                                <label className="block text-md font-medium dark:text-white">Line</label>
                                <button id="hs-dropdown-custom-trigger" type="button" className="hs-dropdown-toggle py-1 pl-1 pr-3 inline-flex justify-center items-center gap-2 rounded-full border font-medium bg-white text-gray-700 shadow-sm align-middle hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-600 transition-all text-sm dark:bg-gray-800 dark:hover:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:text-white dark:focus:ring-offset-gray-800">
                                    <span className={`inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase ${selectedLine === null ? "opacity-0" : ""}`} style={{backgroundColor: `#${selectedLine !== null ? linesData[selectedLine].color : "FFFFFF"}`}}>
                                        {
                                            selectedLine !== null ? linesData[selectedLine].id : ""
                                        }
                                    </span>
                                    <span className="text-gray-600 font-medium truncate max-w-[7.5rem] dark:text-gray-400">
                                        {
                                            selectedLine !== null ? linesData[selectedLine].name : "Select a Line"
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
                            <div className={`inline-block align-middle text-4xl font-bold transition-all duration-700 ${!stationIsSelected ? "opacity-0" : "opacity-100"}`}>
                                <span className="align-middle">
                                    {
                                        stationsData.length ? <span>
                                            {
                                                stationsData[selectedStation].name
                                            }
                                        </span> : <span>Station Name</span>
                                    }
                                </span>
                                {
                                    stationsData.length ? <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white mx-4 uppercase" style={{backgroundColor: "#" + stationsData[selectedStation].line.color}}>{stationsData[selectedStation].id}</span> : <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white mx-4 uppercase"></span>
                                }
                            </div>
                        </div>
                    </div>
                </div>
                <div ref={scrollRef} className="relative z-0 whitespace-nowrap transition-all duration-500 ease-in-out" style={{transform: !stationIsSelected ? "translateX(0)" : "translateX(-" + part1ref.current.offsetWidth + "px)"}}>
                    <div ref={part1ref} className={`inline-block align-top w-full px-6 pb-6 lg:px-10 lg:pb-10 transition-all duration-300 ${!stationIsSelected ? "opacity-100" : "opacity-0"}\`}`}>
                        <div>
                            <div>
                                {
                                    stationsData.length ? <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5">
                                        {
                                            stationsData.map((station, index) => {
                                                return (
                                                    <StationCardPublic key={index} stationId={station.id} stationName={station.name} stationColor={station.line.color} stationPic={station.image} onClick={() => {
                                                        setStationIsSelected(true)
                                                        setSelectedStation(index)
                                                    }}/>
                                                )
                                            })
                                        }
                                    </div> : <div className="text-center py-5">
                                        <div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full" role="status" aria-label="loading">
                                            <span className="sr-only">Loading...</span>
                                        </div>
                                    </div>
                                }
                            </div>
                            <div className="bg-white/[.1] border border-white/[.1] text-sm text-gray-600 rounded-md p-8 dark:text-gray-400 pb-6 text-center" role="alert">
                                <span className="font-bold">Beep!</span> You have reached the end of the list.
                            </div>
                        </div>
                    </div>
                    <div ref={part2ref} className={`inline-block align-top w-full px-6 pb-6 lg:px-10 lg:pb-10 whitespace-normal transition-all duration-300 ${!stationIsSelected ? "opacity-0" : "opacity-100"}`}>
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
                                                    Crowd Information
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5 flex items-center">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-800 dark:text-white">
                                                        {
                                                            stationsData.length ? <span className="text-4xl">{stationsData[selectedStation].platforms[0].currentCapacity}</span>: <span className="text-4xl">0</span>
                                                        }
                                                        <span className="text-md text-gray-500 dark:text-gray-400"> / 100%</span>
                                                    </h3>
                                                    <p className="mt-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
                                                        ~ {stationsData.length ? abbreviateNumber(stationsData[selectedStation].platforms[0].latest_num) : "0"} users
                                                        {/*, + {stationsData.length ? stationsData[selectedStation].platforms[0].latest_num : "0.0"}% than usual*/}
                                                    </p>
                                                    {
                                                        stationsData.length ? <p className="mt-2 text-gray-800 dark:text-gray-400">
                                                            {
                                                                stationsData[selectedStation].platforms[0].currentCapacity >= 80 ? "Stations are currently operating at high capacity." : "Stations are currently operating at normal capacity."
                                                            }
                                                        </p> : <p className="mt-2 text-gray-800 dark:text-gray-400"></p>
                                                    }
                                                </div>
                                                <div className="pl-5 pr-2">
                                                    <div className="flex flex-col flex-nowrap justify-end w-2 h-32 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                                                        {
                                                            stationsData.length ? <div className={`${stationsData[selectedStation].platforms[0].currentCapacity >= 80 ? "bg-red-500" : "bg-blue-500"} overflow-hidden`} role="progressbar" style={{height: stationsData[selectedStation].platforms[0].currentCapacity + "%"}} aria-valuenow={stationsData[selectedStation].platforms[0].currentCapacity} aria-valuemin="0" aria-valuemax="100"></div> : <div></div>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {stationsData.length ? <div>
                                        {
                                            stationsData[selectedStation].platforms[0].currentCapacity >= 80 ? <div className="py-2"><div className="bg-blue-50 border border-blue-200 text-sm text-blue-600 rounded-md p-4" role="alert">
                                                <span className="font-bold">Info</span> This station is currently operating at high capacity, you may experience delays.
                                            </div></div> : <div></div>
                                        }
                                    </div> : <div></div>}
                                    {/*<div className="py-3">*/}
                                    {/*    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">*/}
                                    {/*        <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">*/}
                                    {/*            <p className="mt-1 text-md text-gray-500 dark:text-gray-500">*/}
                                    {/*                Latest Captured Image*/}
                                    {/*            </p>*/}
                                    {/*        </div>*/}
                                    {/*        {*/}
                                    {/*            stationsData.length ? <>*/}
                                    {/*                {*/}
                                    {/*                    stationsData[selectedStation].platforms[0].image ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[0].image} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />*/}
                                    {/*                }*/}
                                    {/*            </> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />*/}
                                    {/*        }*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}
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
                                                    Crowd Information
                                                </p>
                                            </div>
                                            <div className="p-4 md:p-5 flex items-center">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-gray-800 dark:text-white">
                                                        {
                                                            stationsData.length ? <span className="text-4xl">{stationsData[selectedStation].platforms[1].currentCapacity}</span>: <span className="text-4xl">0</span>
                                                        }
                                                        <span className="text-md text-gray-500 dark:text-gray-400"> / 100%</span>
                                                    </h3>
                                                    <p className="mt-1 text-xs font-medium uppercase text-gray-500 dark:text-gray-500">
                                                        ~ {stationsData.length ? abbreviateNumber(stationsData[selectedStation].platforms[1].latest_num) : "0"} users
                                                        {/*, + {stationsData.length ? stationsData[selectedStation].platforms[0].latest_num : "0.0"}% than usual*/}
                                                    </p>
                                                    {
                                                        stationsData.length ? <p className="mt-2 text-gray-800 dark:text-gray-400">
                                                            {
                                                                stationsData[selectedStation].platforms[1].currentCapacity >= 80 ? "Stations are currently operating at high capacity." : "Stations are currently operating at normal capacity."
                                                            }
                                                        </p> : <p className="mt-2 text-gray-800 dark:text-gray-400"></p>
                                                    }
                                                </div>
                                                <div className="pl-5 pr-2">
                                                    <div className="flex flex-col flex-nowrap justify-end w-2 h-32 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                                                        {
                                                            stationsData.length ? <div className={`${stationsData[selectedStation].platforms[1].currentCapacity >= 80 ? "bg-red-500" : "bg-blue-500"} overflow-hidden`} role="progressbar" style={{height: stationsData[selectedStation].platforms[1].currentCapacity + "%"}} aria-valuenow={stationsData[selectedStation].platforms[1].currentCapacity} aria-valuemin="0" aria-valuemax="100"></div> : <div></div>
                                                        }
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    {stationsData.length ? <div>
                                        {
                                            stationsData[selectedStation].platforms[1].currentCapacity >= 80 ? <div className="py-2"><div className="bg-blue-50 border border-blue-200 text-sm text-blue-600 rounded-md p-4" role="alert">
                                                <span className="font-bold">Info</span> This station is currently operating at high capacity, you may experience delays.
                                            </div></div> : <div></div>
                                        }
                                    </div> : <div></div>}
                                    {/*<div className="py-3">*/}
                                    {/*    <div className="flex flex-col bg-white border shadow-sm rounded-xl dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]">*/}
                                    {/*        <div className="border-b rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-gray-700">*/}
                                    {/*            <p className="mt-1 text-md text-gray-500 dark:text-gray-500">*/}
                                    {/*                Latest Captured Image*/}
                                    {/*            </p>*/}
                                    {/*        </div>*/}
                                    {/*        {*/}
                                    {/*            stationsData.length ? <>*/}
                                    {/*                {*/}
                                    {/*                    stationsData[selectedStation].platforms[1].image ? <img className="w-full h-auto rounded-b-xl" src={stationsData[selectedStation].platforms[1].image} alt="Image Description" /> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />*/}
                                    {/*                }*/}
                                    {/*            </> : <img className="w-full h-auto rounded-b-xl" src={congestionPic} alt="Image Description" />*/}
                                    {/*        }*/}
                                    {/*    </div>*/}
                                    {/*</div>*/}
                                </div>
                            </div>
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
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Public;