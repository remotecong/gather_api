function debugTimer(message) {
  if (process.env.NODE_ENV !== "production") {
    const s = Date.now();
    return (tag) => {
      console.log(message, tag || "DEBUG TIME", Date.now() - s);
    };
  } else {
      return () => {};
  }
}

module.exports = debugTimer;
