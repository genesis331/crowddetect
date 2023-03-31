export default function StationCardPublic(props) {
    return (
        <div className="flex flex-col bg-white border shadow-sm rounded-xl hover:bg-gray-100 cursor-pointer dark:bg-gray-800 dark:border-gray-700 dark:shadow-slate-700/[.7]" onClick={props.onClick}>
            <div className="p-4 md:p-5 flex-col lg:flex-row flex align-middle gap-3">
                <div>
                    <span className="inline-flex items-center align-middle gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + props.stationColor}}>{props.stationId}</span>
                </div>
                <h3 className="text-2xl md:text-lg font-bold text-gray-800 dark:text-white">
                    {props.stationName}
                </h3>
            </div>
            <div className="relative pt-[50%] sm:pt-[60%] lg:pt-[80%] rounded-b-xl overflow-hidden">
                <img className="w-full h-full absolute top-0 left-0 object-cover group-hover:scale-105 transition-transform duration-500 ease-in-out" src={props.stationPic} alt="Image Description" />
            </div>
        </div>
    )
}