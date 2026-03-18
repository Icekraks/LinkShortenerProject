import LinkHistoryList from "@components/home/LinkHistory/LinkHistoryList"

const LinkHistorySection = () => {
  return (
    <section className="w-full">
      <h2 className="text-lg font-semibold mb-2">History of Links Created</h2>
      <p className="text-sm text-gray-500 mb-4">
        This section will display the history of links you have created.
      </p>
      <LinkHistoryList />
    </section>
  )
}

export default LinkHistorySection
