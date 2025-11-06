function quotationNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `QUO-${year}-${rand}`;
}

function contractNumber() {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `CNT-${year}-${rand}`;
}

module.exports = { quotationNumber, contractNumber };
