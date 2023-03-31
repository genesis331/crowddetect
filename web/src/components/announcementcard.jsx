export default function AnnouncementCard(props) {
    return (
        <div className="flex flex-col flex-[1_0_0%] bg-white dark:bg-gray-800">
            <div className="p-4 flex-1 md:p-5">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                    {props.title}
                </h3>
                <p className="mt-1 text-gray-800 dark:text-gray-400">
                    {props.body}
                </p>
            </div>
        </div>
    )
}