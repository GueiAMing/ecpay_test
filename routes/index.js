var express = require('express');
var router = express.Router();
const ecpay_payment = require('ecpay_aio_nodejs');
require('dotenv').config();
// console.log(process.env);
const { MERCHANTID, HASHKEY, HASHIV, HOST} = process.env;
const options = {
  "OperationMode": "Test", //Test or Production
  "MercProfile": {
    "MerchantID": MERCHANTID,
    "HashKey": HASHKEY,
    "HashIV": HASHIV
  },
  "IgnorePayment": [
//    "Credit",
//    "WebATM",
//    "ATM",
//    "CVS",
//    "BARCODE",
//    "AndroidPay"
  ],
  "IsProjectContractor": false
}
/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/checkout', function(req, res, next) {
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
}).replace(/\//g, '/');
const MerchantTradeNo = `1234567${new Date().getTime()}`
  const base_param = {
    MerchantTradeNo: MerchantTradeNo, //請帶20碼uid, ex: f0a0d7e9fae1bb72bc93
    MerchantTradeDate: MerchantTradeDate, //ex: 2017/02/13 15:45:30
    TotalAmount: '100',
    TradeDesc: '測試交易描述',
    ItemName: '測試商品等',
    ReturnURL: `${HOST}/return`,
    // ChooseSubPayment: '',
    // OrderResultURL: 'http://192.168.0.1/payment_result',
    // NeedExtraPaidInfo: '1',
    // ClientBackURL: 'https://www.google.com',
    // ItemURL: 'http://item.test.tw',
    // Remark: '交易備註',
    // HoldTradeAMT: '1',
    // StoreID: '',
    // CustomField1: '',
    // CustomField2: '',
    // CustomField3: '',
    // CustomField4: ''
  };
  const create = new ecpay_payment(options);
  const html = create.payment_client.aio_check_out_all(base_param)
  console.log(html);
  res.render('checkout', { title: 'Express' , html});
});
router.post('/return', function(req, res, next) {
  console.log("req.body:",req.body);
  res.render('1|OK');
});

module.exports = router;
