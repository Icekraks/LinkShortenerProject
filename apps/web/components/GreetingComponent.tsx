const GreetingComponent = () => {
  const currentGreeting = () => {
    const currentHour = new Date().getHours()

    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning!"
    } else if (currentHour >= 12 && currentHour < 17) {
      return "Good afternoon!"
    } else if (currentHour >= 17 && currentHour < 21) {
      return "Good evening!"
    } else {
      return "Good night!"
    }
  }

  return (
    <>
      <span className="text-xl font-bold mb-2">{currentGreeting()}</span>
      <h2>Welcome to the Link Shortener App! Create and manage your short links with ease.</h2>
    </>
  )
}

export default GreetingComponent
