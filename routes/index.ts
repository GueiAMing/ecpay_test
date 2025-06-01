import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// ECPay SDK 沒型別 → 直接用 require
const ecpay_payment = require('ecpay_aio_nodejs');
const { MERCHANTID, HASHKEY, HASHIV, HOST} = process.env;
dotenv.config();

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Express' });
});

router.get('/checkout', (req: Request, res: Response) => {
  const options = {
    OperationMode: 'Test',
    MercProfile: {
      MerchantID: MERCHANTID,
      HashKey: HASHKEY,
      HashIV: HASHIV,
    },
    IgnorePayment: [],
    IsProjectContractor: false,
  };

  const payment = new ecpay_payment(options);
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '/');
  const base_param = {
    MerchantTradeNo: `1234567${new Date().getTime()}`,
    MerchantTradeDate: MerchantTradeDate,
    TotalAmount: '100',
    TradeDesc: '測試交易描述',
    ItemName: '測試商品',
    ReturnURL: `${HOST}/return`,
    ChoosePayment: 'ALL',
  };

  const html = payment.payment_client.aio_check_out_all(base_param, {}, {});
  res.render('checkout', { title: 'Checkout Page', html });
});

router.post('/return', (req: Request, res: Response) => {
  console.log('ECPay Return:', req.body);
  res.send('1|OK');
});

export default router;
