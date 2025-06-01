import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
// ECPay SDK 沒型別 → 直接用 require
const ecpay_payment = require('ecpay_aio_nodejs');

dotenv.config();

const router = express.Router();

router.get('/', (req: Request, res: Response) => {
  res.render('index', { title: 'Express' });
});

router.get('/checkout', (req: Request, res: Response) => {
  const options = {
    OperationMode: 'Test',
    MercProfile: {
      MerchantID: process.env.MERCHANTID,
      HashKey: process.env.HASHKEY,
      HashIV: process.env.HASHIV,
    },
    IgnorePayment: [],
    IsProjectContractor: false,
  };

  const payment = new ecpay_payment(options);

  const base_param = {
    MerchantTradeNo: `1234567${new Date().getTime()}`,
    MerchantTradeDate: new Date().toLocaleString('zh-TW', {
      hour12: false,
    }),
    TotalAmount: '100',
    TradeDesc: '測試交易描述',
    ItemName: '測試商品',
    ReturnURL: `${req.protocol}://${req.get('host')}/return`,
    ChoosePayment: 'ALL',
  };

  const html = payment.payment_client.aio_check_out_all(base_param, {}, {});
  res.render('checkout', { html });
});

router.post('/return', (req: Request, res: Response) => {
  console.log('ECPay Return:', req.body);
  res.send('1|OK');
});

export default router;
