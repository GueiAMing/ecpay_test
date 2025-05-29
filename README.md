# ECPay AIO Node.js Integration Example

## Description

This project demonstrates an example integration of the ECPay All-In-One (AIO) payment gateway using the `ecpay_aio_nodejs` SDK with a Node.js and Express backend. It aims to provide a basic but functional setup for initiating payments and handling ECPay's return notifications.

The project has been developed with considerations for production environments, including secure `CheckMacValue` verification, unique `MerchantTradeNo` generation, and configuration management via environment variables.

## Prerequisites

*   Node.js (v14.x or later recommended)
*   npm (Node Package Manager)

## Setup Instructions

1.  **Clone the Repository / Download the Code:**
    ```bash
    # If it's a git repository
    # git clone <repository-url>
    # cd your-project-directory

    # If you downloaded the code, navigate to the project directory
    cd your-project-directory
    ```

2.  **Install Dependencies:**
    Navigate to the project directory in your terminal and run:
    ```bash
    npm install
    ```

3.  **Environment Configuration (`.env` file):**
    Create a `.env` file in the root of the project directory. This file will store your ECPay merchant credentials and application configuration.

    **Do not commit your `.env` file to version control if it contains sensitive credentials.**

    Use the following template for your `.env` file. Replace the placeholder values with your actual ECPay merchant details and desired host configuration.

    ```env
    # ECPay Merchant Details (Obtain from ECPay Merchant Portal)
    # IMPORTANT: Keep your HASHKEY and HASHIV secret!
    MERCHANTID=YOUR_ECPAY_MERCHANT_ID
    HASHKEY=YOUR_ECPAY_HASH_KEY
    HASHIV=YOUR_ECPAY_HASH_IV

    # Application Host URL (This is where ECPay will send return information)
    # For local development, if your app runs on port 3000:
    HOST=http://localhost:3000
    # For a production environment, use your public domain:
    # HOST=https://yourdomain.com

    # Optional: Port for the application to run on.
    # The application defaults to port 3000 if not set (as configured in ./bin/www).
    # If you set this, ensure it matches the port in your HOST URL for local development.
    # PORT=3000
    ```

    **Note:** Your `MERCHANTID`, `HASHKEY`, and `HASHIV` are provided by ECPay when you register as a merchant. These are sensitive credentials and must be kept confidential. For testing, ECPay provides a set of test credentials.

## Running the Application

Once the dependencies are installed and the `.env` file is configured, you can start the application:

```bash
npm start
```

The application will typically be accessible at `http://localhost:3000` (or the `HOST` and `PORT` you configured in the `.env` file or as defined in `./bin/www`).

## Key Endpoints

*   **`GET /`**:
    *   Displays the home page of the application.
*   **`GET /checkout`**:
    *   Initiates a sample payment process by redirecting to ECPay. This endpoint gathers necessary parameters and generates the payment form.
*   **`POST /return`**:
    *   This is the callback URL (ReturnURL) that ECPay uses to send server-to-server notifications about the payment status (e.g., success, failure).
    *   It performs `CheckMacValue` verification to ensure the integrity and authenticity of the received data.
    *   This endpoint is not typically accessed directly by a user's browser after the initial payment flow; it's a backend communication channel.

## Project Structure Overview

*   **`services/`**: Contains service modules that encapsulate business logic, such as ECPay interactions (`ecpayService.js`).
*   **`routes/`**: Defines the application's HTTP routes and handlers (e.g., `index.js` for main routes, `users.js` for user-related routes).
*   **`views/`**: Contains template files (e.g., EJS templates like `index.ejs`, `checkout.ejs`, `error.ejs`) for rendering dynamic HTML content.
*   **`public/`**: Stores static assets like stylesheets, client-side JavaScript files, and images.
*   **`bin/www`**: The executable script that configures and starts the HTTP server (Node.js standard).
*   **`.env`**: (User-created) Stores environment-specific configurations like API keys and host settings.
*   **`app.js`**: The main application file where Express is configured, middleware is set up, and routes are mounted.
*   **`package.json`**: Lists project dependencies and scripts.

## Notes on Production Readiness

This example project incorporates several practices important for production environments:

*   **`CheckMacValue` Verification:** The `/return` endpoint rigorously verifies the `CheckMacValue` of incoming ECPay notifications to ensure data integrity and authenticity.
*   **Secure `MerchantTradeNo` Generation:** The `MerchantTradeNo` (unique order identifier) is generated using `uuid` to ensure uniqueness, a critical requirement for ECPay.
*   **Environment Variables (`.env`):** Sensitive credentials (like ECPay HashKey and HashIV) and environment-specific settings (like HOST URL) are managed through a `.env` file, keeping them separate from the codebase.
*   **Error Handling:** Basic error handling is implemented in routes and services to manage unexpected issues and provide feedback or log errors.

Further considerations for a full production deployment would include more comprehensive logging, security hardening (e.g., rate limiting, input validation beyond ECPay's needs), robust testing, and potentially a more sophisticated session management or database integration for order tracking.
