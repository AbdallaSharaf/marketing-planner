function calculateServiceFinalPrice(price, discount, discountType) {
  if (!discount || discount === 0) return price;
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = (price * discount) / 100;
  } else {
    discountAmount = discount;
  }
  return Math.max(0, price - discountAmount);
}

function calculateQuotationTotal(
  services = [],
  customServices = [],
  quotationDiscount = 0,
  quotationDiscountType = 'percentage'
) {
  let subtotal = 0;
  services.forEach((s) => {
    let servicePrice = s.customPrice || s.price || 0;
    if (s.discount) {
      if (s.discountType === 'percentage')
        servicePrice -= (servicePrice * s.discount) / 100;
      else servicePrice -= s.discount;
    }
    subtotal += servicePrice;
  });
  customServices.forEach((cs) => {
    let price = cs.price || 0;
    if (cs.discount) {
      if (cs.discountType === 'percentage')
        price -= (price * cs.discount) / 100;
      else price -= cs.discount;
    }
    subtotal += price;
  });
  let total = subtotal;
  if (quotationDiscount) {
    if (quotationDiscountType === 'percentage')
      total -= (subtotal * quotationDiscount) / 100;
    else total -= quotationDiscount;
  }
  return { subtotal: Math.max(0, subtotal), total: Math.max(0, total) };
}

module.exports = {
  calculateServiceFinalPrice,
  calculateQuotationTotal,
};
