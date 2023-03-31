export default function AttentionCard(props) {
    return (
        <div className="flex flex-col bg-white border border-red-300 shadow-sm rounded-xl dark:bg-gray-800 dark:border-red-700 dark:shadow-slate-700/[.7] my-2">
            <div className="border-b border-red-300 rounded-t-xl py-3 px-4 md:py-4 md:px-5 dark:border-red-700">
                <p className="text-md text-red-500 inline-block align-middle mr-2">
                    Requires Attention
                </p>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-exclamation-diamond-fill inline-block align-middle fill-red-500" viewBox="0 0 16 16">
                    <path d="M9.05.435c-.58-.58-1.52-.58-2.1 0L.436 6.95c-.58.58-.58 1.519 0 2.098l6.516 6.516c.58.58 1.519.58 2.098 0l6.516-6.516c.58-.58.58-1.519 0-2.098L9.05.435zM8 4c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995A.905.905 0 0 1 8 4zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
            </div>
            <div className="p-4 md:p-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    <span className="align-middle">{props.stationName}</span>
                    <span className="inline-flex items-center align-middle mx-3 gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-white uppercase" style={{backgroundColor: "#" + props.stationColor}}>{props.stationId}</span>
                </h3>
                <div className="mt-2 w-full flex text-center">
                    <div className="flex-auto">
                        <div className="text-3xl font-bold">
                            {props.stationCapacity}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                            capacity
                        </div>
                    </div>
                    <div className="flex-auto">
                        <div>
                            <div className="text-3xl font-bold">
                                ~ {props.stationUsers}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                                total users
                            </div>
                        </div>
                    </div>
                    <div className="flex-auto">
                        <div>
                            <div className="text-3xl font-bold">
                                + 0.0%
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase">
                                than usual
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}