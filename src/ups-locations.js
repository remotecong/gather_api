const UPS_BOXES = ["11063-D S MEMORIAL", "6528 E 101ST ST STE D"];

module.exports = function(addr) {
  const comp = addr.toUpperCase();
  return (
    /po box/i.test(comp) ||
    UPS_BOXES.some(box => {
      return comp.includes(box);
    })
  );
};
