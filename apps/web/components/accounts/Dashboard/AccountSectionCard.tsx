type AccountSectionCardProps = {
  children: React.ReactNode
  title: string
  description: string
}

const AccountSectionCard = ({ children, title, description }: AccountSectionCardProps) => {
  return (
    <div className="w-full md:rounded-lg md:shadow-md py-4 md:py-6 md:px-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      <p className="text-gray-600 mb-4">{description}</p>
      {children}
    </div>
  )
}

export default AccountSectionCard
