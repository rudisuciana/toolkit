const validateAmount = (req, res, next) => {
  const { baseAmount } = req.body;
  if (!baseAmount || isNaN(baseAmount) || baseAmount < 10000) {
    return res.status(400).json({ success: false, message: 'Jumlah top up minimal Rp 10.000.' });
  }
  next();
};

module.exports = { validateAmount };
