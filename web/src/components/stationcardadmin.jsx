export default function StationCardAdmin(props) {
    return (
        <div className="bg-white border rounded-xl shadow-sm sm:flex dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7] hover:bg-gray-100 cursor-pointer my-4" onClick={props.onClick}>
            <div className="flex-shrink-0 relative rounded-tl-xl rounded-bl-xl overflow-hidden w-1/3">
                <img className="w-full h-full absolute top-0 left-0 object-cover" src={props.stationPic} alt="Image Description" />
            </div>
            <div className="flex flex-wrap">
                <div className="p-4 flex flex-col h-full sm:p-7">
                    <div className="mb-2">
                        <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + props.stationColor}}>{props.stationId}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className={`bi bi-circle-fill ${props.stationAvgCapacity >= 80 ? "fill-red-500" : "fill-green-500"} inline-block ml-2`} viewBox="0 0 16 16">
                            <circle cx="8" cy="8" r="8"/>
                        </svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                        {props.stationName}
                    </h3>
                </div>
            </div>
        </div>
    )
}