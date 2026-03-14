const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middlewares/auth');
const serviceController = require('../controllers/serviceController');

router.post('/xl/request-otp', isAuthenticated, serviceController.xlRequestOtp);
router.post('/xl/login-otp', isAuthenticated, serviceController.xlLoginOtp);
router.post('/xl/check-session', isAuthenticated, serviceController.xlCheckSession);
router.post('/xl/check-quotas', isAuthenticated, serviceController.xlCheckQuotas);
router.post('/xl/get-products', isAuthenticated, serviceController.xlGetProducts);
router.post('/xl/buy-package', isAuthenticated, serviceController.xlBuyPackage);
router.post('/xl/list-product', isAuthenticated, serviceController.xlListProduct);
router.post('/xl/akrabv2/order', isAuthenticated, serviceController.xlAkrabV2Order);
router.post('/xl/akrab/invite', isAuthenticated, serviceController.xlAkrabInvite);
router.post('/v3/xl/stock-khfy', isAuthenticated, serviceController.xlStockKhfy);
router.post('/xl/akrabv3/order', isAuthenticated, serviceController.xlAkrabV3Order);
router.post('/no-otp/products', isAuthenticated, serviceController.noOtpProducts);
router.post('/no-otp/order', isAuthenticated, serviceController.noOtpOrder);
router.post('/check-package', isAuthenticated, serviceController.checkPackage);
router.post('/xl/akrab-stock', isAuthenticated, serviceController.xlAkrabStock);

module.exports = router;
