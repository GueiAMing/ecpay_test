var express = require('express');
var router = express.Router();
const ecpayService = require('../services/ecpayService'); // Service for ECPay related logic

// Note: dotenv.config() is called in ecpayService.js and app.js, so not needed here.
// Note: HOST from process.env is used within ecpayService.js.

/* GET home page. */
// This route renders the main landing page of the application.
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express ECPay Sample' }); // Render the 'index.ejs' view
});

/* GET /checkout - Initiates the ECPay payment process. */
// This route prepares payment data and calls the ECPay service to generate
// the payment form, then renders a page that auto-submits this form to ECPay.
router.get('/checkout', function(req, res, next) {
  // Define checkout data. In a real application, this would typically come from
  // the user's session, a database, or the request body (e.g., from a shopping cart).
  const checkoutData = {
    orderId: `WebAppOrder${new Date().getTime()}`, // Example Order ID - should be unique for each transaction.
    totalAmount: '250',                           // Example total amount for the transaction.
    description: 'WebApp Transaction Description',  // Description of the transaction.
    items: 'Product A x 1, Product B x 2'         // Item details (name, quantity). ECPay format: "Item1#Item2..."
    // ReturnURL is configured within the ecpayService.
  };

  try {
    // Call the service to initiate checkout and get the ECPay HTML form.
    const html = ecpayService.initiateCheckout(checkoutData);
    // console.info("Generated ECPay HTML:", html); // Useful for debugging, consider removing for production.
    
    // Render the 'checkout.ejs' view, passing the generated HTML.
    // The view will typically place this HTML in a way that it auto-submits.
    res.render('checkout', { title: 'ECPay Checkout', html });
  } catch (error) {
    // Handle any errors that occur during payment initiation.
    console.error("Error in /checkout route during payment initiation:", error);
    // Render a generic error page for the user.
    // In development, the error object itself might be passed for more details.
    res.status(500).render('error', { 
      message: 'Payment initiation failed. Please try again later.', 
      error: process.env.NODE_ENV === 'development' ? error : {} 
    });
  }
});

/* POST /return - Handles ECPay's server-to-server return notification. */
// ECPay sends a POST request to this URL (specified as ReturnURL) after the payment process.
// This route is responsible for verifying the received data's integrity and authenticity.
router.post('/return', function(req, res, next) {
  // Log the received request body from ECPay. 
  // Important: Be cautious about logging entire request bodies in production due to potential sensitive data and log volume.
  console.info("ECPay Return POST request body:", req.body); 
  
  try {
    // Call the service to verify the payload, including CheckMacValue.
    const verificationResult = ecpayService.verifyReturnPayload(req.body);

    if (verificationResult.success) {
      // If CheckMacValue is verified successfully.
      console.info('ECPay Return: CheckMacValue verified successfully via service. Responding with "1|OK".');
      // ECPay expects a response of "1|OK" to acknowledge successful receipt and verification.
      res.status(200).send('1|OK');
      // TODO: Add further business logic here, e.g., update order status in database, send confirmation email.
    } else {
      // If CheckMacValue verification fails.
      // Log the specific error details returned from the service.
      console.error('ECPay Return: CheckMacValue verification failed via service. Details:', verificationResult);
      // Respond to ECPay with "0|ERROR_MESSAGE" to indicate failure.
      res.status(200).send(`0|ERROR ${verificationResult.error || 'Checksum verification failed'}`);
    }
  } catch (error) {
    // Catch any unexpected errors that occur in the service layer or within this route handler.
    console.error("Unexpected error in /return route processing:", error);
    // Respond to ECPay with a generic error message.
    // ECPay expects a "0|..." or "1|..." response format. A 500 status might not be correctly interpreted by ECPay.
    res.status(200).send('0|ERROR Internal server error during processing');
  }
});

module.exports = router;
