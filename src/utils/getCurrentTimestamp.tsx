const getCurrentTimestamp = () => {
    const now = new Date();
    return now.toLocaleString("en-US", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  export default getCurrentTimestamp;