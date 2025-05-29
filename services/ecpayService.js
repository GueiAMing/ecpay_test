const ecpay_payment = require('ecpay_aio_nodejs'); // ECPay All-In-One Node.js SDK
const crypto = require('crypto'); // Node.js crypto module for manual checksum generation
const { v4: uuidv4 } = require('uuid'); // UUID library for generating unique MerchantTradeNo
require('dotenv').config(); // Load environment variables from .env file

// Destructure ECPay credentials and application host from environment variables
const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env;

// ECPay SDK client initialization options
const options = {
  OperationMode: "Test", // Specifies ECPay environment: "Test" or "Production"
  MercProfile: {
    MerchantID: MERCHANTID, // ECPay Merchant ID
    HashKey: HASHKEY,       // ECPay HashKey
    HashIV: HASHIV         // ECPay HashIV
  },
  IgnorePayment: [], // Payments to ignore (e.g., ["Credit", "WebATM"])
  IsProjectContractor: false // Whether the merchant is a project contractor
};

/**
 * Initiates an ECPay checkout process by generating the necessary parameters and HTML form.
 * 
 * @param {object} checkoutData - Data for the checkout, including:
 *   @param {string} [checkoutData.orderId] - Optional: Your application's internal order ID for logging and reference.
 *   @param {string} checkoutData.totalAmount - The total amount for the transaction (e.g., "100").
 *   @param {string} checkoutData.description - Description of the transaction (e.g., "Test Transaction").
 *   @param {string} checkoutData.items - Item names, can be a concatenated string (e.g., "Product A x 1#Product B x 2").
 * @returns {string} HTML string for the ECPay payment form, which will auto-submit to ECPay.
 * @throws {Error} If ECPay HTML generation fails (e.g., due to SDK issues or misconfiguration).
 */
function initiateCheckout(checkoutData) {
  // Generate MerchantTradeDate in the required ECPay format: "YYYY/MM/DD HH:mm:ss"
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',        // Numeric year (e.g., 2023)
    month: '2-digit',       // 2-digit month (e.g., 01)
    day: '2-digit',         // 2-digit day (e.g., 15)
    hour: '2-digit',        // 2-digit hour (24-hour format)
    minute: '2-digit',      // 2-digit minute
    second: '2-digit',      // 2-digit second
    hour12: false           // Use 24-hour format
  }).replace(/\//g, '/'); // Ensure forward slashes are used as separators.

  // Generate a unique MerchantTradeNo for ECPay (ECPay requires max 20 characters).
  // Uses UUID v4, removes hyphens, and truncates to the first 20 characters.
  // This ensures a high probability of uniqueness for each transaction.
  const MerchantTradeNo = uuidv4().replace(/-/g, '').substring(0, 20);
  
  // Log the mapping if an internal orderId was provided in checkoutData.
  // This is useful for debugging and correlating ECPay's MerchantTradeNo 
  // with your application's internal order identifiers.
  if (checkoutData.orderId) {
    console.info(`Mapping internal orderId ${checkoutData.orderId} to ECPay MerchantTradeNo ${MerchantTradeNo}`);
  }

  // Construct the base parameters required for the ECPay AIO (All-In-One) checkout.
  // These parameters are defined by ECPay's integration documentation.
  const base_param = {
    MerchantTradeNo: MerchantTradeNo,           // Unique merchant trade number (max 20 chars).
    MerchantTradeDate: MerchantTradeDate,       // Trade date and time (format: "YYYY/MM/DD HH:mm:ss").
    TotalAmount: checkoutData.totalAmount || '100', // Total amount of the order. Defaults to '100' if not provided.
    TradeDesc: checkoutData.description || '測試交易描述', // Trade description. Defaults if not provided.
    ItemName: checkoutData.items || '測試商品等',        // Item names (can be a list separated by '#'). Defaults if not provided.
    ReturnURL: `${HOST}/return`,                // URL for ECPay to send backend (server-to-server) notifications to.
    // ChooseSubPayment: '',                    // Optional: Default payment method for the customer.
    // OrderResultURL: `${HOST}/order_result`,  // Optional: URL for client redirection after payment success/failure from ECPay's page.
    // NeedExtraPaidInfo: '1',                  // Optional: '1' to show extra payment info on ECPay page, '0' otherwise.
    // ClientBackURL: `${HOST}/client_back`,    // Optional: URL for client redirection if they click a "back to merchant" button on ECPay page.
    // ... other optional parameters (e.g., CustomField1-4, ItemURL, Remark) can be found in ECPay documentation.
  };

  try {
    // Instantiate the ECPay payment client with the configured options (merchant credentials, mode).
    const create = new ecpay_payment(options);
    // Call the SDK method to generate the complete HTML form for ECPay AIO checkout.
    // This HTML includes all necessary parameters and a script to auto-submit the form.
    const html = create.payment_client.aio_check_out_all(base_param);
    return html; // Return the generated HTML string.
  } catch (error) {
    // Log and re-throw a more specific error if the SDK call fails.
    console.error("Error during ECPay SDK aio_check_out_all:", error);
    throw new Error('ECPay HTML generation failed. Details: ' + error.message);
  }
}

/**
 * Verifies the CheckMacValue of a payload received from ECPay (e.g., via ReturnURL).
 * This is a critical security measure to ensure the integrity and authenticity of the data
 * received from ECPay, preventing tampering.
 * 
 * @param {object} receivedPayload - The full payload object received from ECPay. This object
 *                                 contains all transaction details and the CheckMacValue.
 * @returns {object} An object indicating the verification status and relevant data:
 *   @returns {boolean} success - True if the calculated CheckMacValue matches the received one, false otherwise.
 *   @returns {string} [error] - An error message if verification fails or an internal error occurs during calculation.
 *   @returns {string} [merchantTradeNo] - The MerchantTradeNo from the payload, useful for logging and order lookup.
 *   @returns {string} [receivedMac] - The CheckMacValue that was received in the payload from ECPay.
 *   @returns {string} [calculatedMac] - The CheckMacValue calculated by this server based on the payload and merchant credentials.
 *   @returns {string} [details] - Additional details if an error occurred during manual calculation.
 */
function verifyReturnPayload(receivedPayload) {
  // Extract the CheckMacValue from the received payload. This is what we need to verify.
  const receivedMac = receivedPayload.CheckMacValue;
  if (!receivedMac) {
    // If CheckMacValue is missing, it's an invalid payload or an issue in communication.
    // Include MerchantTradeNo in the log/return if available, for better tracking.
    console.warn("ECPay Return: Missing CheckMacValue in payload.", receivedPayload);
    return { success: false, error: "Missing CheckMacValue", merchantTradeNo: receivedPayload.MerchantTradeNo };
  }
  
  // Instantiate the ECPay payment client to use its utility functions.
  const create = new ecpay_payment(options);
  let calculatedMac; // This will store the CheckMacValue calculated by our server.

  try {
    // Attempt to generate the CheckMacValue using the ECPay SDK's built-in utility.
    // The SDK is expected to correctly handle parameter sorting, string construction, and hashing
    // according to ECPay's specifications. It should ignore the received CheckMacValue field during its calculation.
    calculatedMac = create.payment_client.generate_check_mac_value(receivedPayload);
    console.info("ECPay SDK CheckMacValue generation successful.");
  } catch (sdkError) {
    // If the SDK fails to generate the CheckMacValue (e.g., due to an SDK bug or unexpected data),
    // log the error and fall back to manual calculation.
    console.warn("ECPay SDK CheckMacValue generation failed, attempting manual calculation. SDK Error:", sdkError);
    
    // Create a copy of the payload. The CheckMacValue field itself must be excluded from the data
    // used to calculate the checksum.
    const dataForChecksum = { ...receivedPayload };
    delete dataForChecksum.CheckMacValue;

    // Ensure HashKey and HashIV are available (these are critical for manual calculation).
    // These should have been loaded from environment variables.
    if (!HASHKEY || !HASHIV) {
        console.error("Critical: Missing HASHKEY or HASHIV for manual checksum calculation.");
        return { success: false, error: "Server configuration error: Missing HashKey/HashIV", merchantTradeNo: receivedPayload.MerchantTradeNo };
    }

    try {
      // Manual CheckMacValue Generation Process:
      // 1. Sort all parameters in the dataForChecksum object alphabetically by key, case-insensitively.
      let sortedKeys = Object.keys(dataForChecksum).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      
      // 2. Construct the "check string" by concatenating HashKey, sorted parameters (Key=Value), and HashIV,
      //    separated by ampersands. Format: "HashKey=YOUR_HASH_KEY&Key1=Value1&Key2=Value2...&HashIV=YOUR_HASH_IV"
      let checkString = "HashKey=" + HASHKEY;
      for (let key of sortedKeys) {
        checkString += "&" + key + "=" + dataForChecksum[key];
      }
      checkString += "&HashIV=" + HASHIV;

      // 3. URL encode the entire check string. ECPay requires a specific type of URL encoding
      //    that mimics .NET's HttpUtility.UrlEncode. This involves replacing spaces with '+'
      //    and keeping certain characters unescaped. After encoding, convert the string to lowercase.
      let urlEncodedString = encodeURIComponent(checkString)
        .replace(/%20/g, "+")    // Replace space with '+'
        .replace(/%2d/g, "-")    // Keep '-' (hyphen)
        .replace(/%5f/g, "_")    // Keep '_' (underscore)
        .replace(/%2e/g, ".")    // Keep '.' (period)
        .replace(/%21/g, "!")    // Keep '!' (exclamation)
        .replace(/%2a/g, "*")    // Keep '*' (asterisk)
        .replace(/%28/g, "(")    // Keep '(' (open parenthesis)
        .replace(/%29/g, ")");   // Keep ')' (close parenthesis)

      let lowerCaseString = urlEncodedString.toLowerCase();
      
      // 4. Calculate the SHA256 hash of the resulting lowercase, URL-encoded string.
      const sha256 = crypto.createHash('sha256');
      sha256.update(lowerCaseString);
      // 5. Convert the binary hash digest to an uppercase hexadecimal string. This is the calculated CheckMacValue.
      calculatedMac = sha256.digest('hex').toUpperCase();
      console.info("Manual CheckMacValue calculation successful.");
    } catch (manualError) {
      // If an error occurs during the manual calculation steps, log it and return a failure.
      console.error("Error during manual CheckMacValue calculation:", manualError);
      return { success: false, error: "Manual checksum calculation failed", details: manualError.message, merchantTradeNo: receivedPayload.MerchantTradeNo };
    }
  }

  // Final comparison: Check if the calculated MAC (either from SDK or manual process) matches the received MAC.
  if (calculatedMac && calculatedMac === receivedMac) {
    // Verification successful: The payload is authentic and its integrity is confirmed.
    console.info('ECPay Return: CheckMacValue successfully verified in service.');
    return { success: true, merchantTradeNo: receivedPayload.MerchantTradeNo };
  } else if (!calculatedMac) {
    // This case is hit if the SDK failed AND the manual calculation also failed (e.g. threw an error before setting calculatedMac).
    console.error('ECPay Return: CheckMacValue could not be calculated. Received: ' + receivedMac, "Payload:", receivedPayload);
    return { success: false, error: "Checksum calculation failed", receivedMac, merchantTradeNo: receivedPayload.MerchantTradeNo };
  } 
  else {
    // Verification failed: The calculated CheckMacValue does not match the received one.
    // This could indicate data tampering or a configuration mismatch (e.g., wrong HashKey/HashIV).
    console.error('ECPay Return: CheckMacValue mismatch in service. Received: ' + receivedMac + ', Calculated: ' + calculatedMac, "Payload:", receivedPayload);
    return { success: false, error: "Checksum mismatch", receivedMac, calculatedMac, merchantTradeNo: receivedPayload.MerchantTradeNo };
  }
}

// Export the service functions for use in routes or other modules within the application.
module.exports = {
  initiateCheckout,
  verifyReturnPayload
};
