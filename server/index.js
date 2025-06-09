require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const formidable = require('formidable').default;
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const webpackConfig = require('../webpack.config.js');
const livereload = require('livereload');
const connectLivereload = require('connect-livereload');
const app = express();
const jwt = require('jsonwebtoken');
const secretKey = 'your_secret_key';
const multer = require('multer');
const fs = require('fs').promises;
const stream = require('stream');
const nodemailer = require('nodemailer'); 
const nodemailerSendgrid = require('nodemailer-sendgrid');
const crypto = require('crypto');
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
const axios = require('axios');  // Add axios for making HTTP requests
const port = 3774;
const sql = require('mssql');

// Configuration for your Azure SQL Database
const config = {
    user: 'OAPSA',      // Your SQL database username
    password: 'Seven74!',  // Your SQL database password
    server: 'oap-prod.database.windows.net', // Azure SQL Server name
    database: 'OAP', // The name of your database
    options: {
        encrypt: true,          // Use encryption (Azure requires this)
        enableArithAbort: true  // Optional, prevents issues with some SQL queries
    }
};
let pool;
sql.connect(config).then(_pool => {
  pool = _pool;
  console.log("Connected to database");
}).catch(err => console.error("Error connecting to database:", err));
const transporter = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY,
  })
);
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(express.json({ limit: '10mb' }));
// Multer configuration for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public_html', 'index.html'));
});
// Fetch list of apps
app.get('/api/list-apps', async (req, res) => {
  try {
    // Query to select all apps with their details
    const query = `
      SELECT 
        Id,
        OwnerUserId,
        DisplayName,
        Price,
        TagLine,
        Description,
        TechnologyListCsv,
        ConclusionSummary,
        RepositoryUrl,
        CASE WHEN PreviewImageFile IS NOT NULL THEN CONCAT('api/app-image/', Id) ELSE NULL END AS PreviewImageFile,
        CASE WHEN DemonstrationVideoFile IS NOT NULL THEN CONCAT('api/app-video/', Id) ELSE NULL END AS DemonstrationVideoFile
      FROM [dbo].[Application]
    `;

    // Use the global pool to create a request
    const result = await pool.request().query(query);

    // Transform the result to match the expected structure
    const transformedResult = result.recordset.map(app => ({
      Id: app.Id,
      OwnerUserId: app.OwnerUserId,
      DisplayName: app.DisplayName,
      Price: app.Price,
      TagLine: app.TagLine,
      Description: app.Description,
      TechnologyListCsv: app.TechnologyListCsv ? app.TechnologyListCsv.split(',') : [],
      ConclusionSummary: app.ConclusionSummary,
      RepositoryUrl: app.RepositoryUrl,
      PreviewImageFile: app.PreviewImageFile,
      DemonstrationVideoFile: app.DemonstrationVideoFile
    }));

    // Send the transformed results as JSON
    res.json(transformedResult);

  } catch (error) {
    console.error("Error retrieving app data:", error);
    res.status(500).json({ error: 'Failed to retrieve app data', details: error.message });
  }
});
// Express route to create a new user
app.post('/api/create-user', express.json(), async (req, res) => {
  const { EmailAddress, Username, password, FirstName, LastName, PersonalDescription, Name, rememberMe } = req.body;

  try {
    console.log('Received create-user request:', { EmailAddress, Username, FirstName, LastName });

    // Check if the username or email already exists
    const checkUserResult = await pool.request()
      .input('EmailAddress', sql.NVarChar, EmailAddress)
      .input('Username', sql.NVarChar, Username)
      .query`
        SELECT COUNT(*) AS count FROM [dbo].[User] WHERE EmailAddress = @EmailAddress OR Username = @Username
      `;

    if (checkUserResult.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the User table and set IsEmailAddressVerified to false
    const insertResult = await pool.request()
      .input('FirstName', sql.NVarChar, FirstName)
      .input('LastName', sql.NVarChar, LastName)
      .input('Username', sql.NVarChar, Username)
      .input('EmailAddress', sql.NVarChar, EmailAddress)
      .input('PersonalDescription', sql.NVarChar, PersonalDescription || '')
      .input('Name', sql.NVarChar, Name || `${FirstName} ${LastName}`)
      .input('PasswordHash', sql.NVarChar, hashedPassword)
      .query`
        INSERT INTO [dbo].[User] (FirstName, LastName, Username, EmailAddress, PersonalDescription, Name, PasswordHash, IsEmailAddressVerified)
        OUTPUT INSERTED.Id
        VALUES (@FirstName, @LastName, @Username, @EmailAddress, @PersonalDescription, @Name, @PasswordHash, 0)
      `;

    const newUserId = insertResult.recordset[0].Id;

    console.log('User created successfully in SQL database with Id:', newUserId);

    // Generate email verification token (expires in 24 hours)
    const verificationToken = jwt.sign({ userId: newUserId, email: EmailAddress }, secretKey, { expiresIn: '24h' });

    // Send verification email
    const emailSent = await sendVerificationEmail(EmailAddress, verificationToken, newUserId);

    if (!emailSent) {
      throw new Error('Failed to send verification email');
    }

    // Logic for rememberMe
    let token;
    if (rememberMe) {
      // Generate a JWT token for the client-side to store in localStorage
      token = jwt.sign({ userId: newUserId, email: EmailAddress }, secretKey, { expiresIn: '30d' });

      // Include token in the response for the client to store in local storage
      return res.json({
        message: 'User account created successfully. Please check your email to verify your account.',
        token: token,
        userId: newUserId
      });
    }

    // Respond to the user with success message without token if rememberMe is not set
    res.json({
      message: 'User account created successfully. Please check your email to verify your account.',
    });

  } catch (err) {
    console.error('Error creating user or sending verification email:', err);
    res.status(500).json({ error: 'Failed to create user account or send verification email', details: err.message });
  }
});

async function sendVerificationEmail(email, token, userId) {
  const verificationLink = `http://localhost:3774/api/verify-email-page?token=${token}&userId=${userId}`;

  const mailOptions = {
    from: 'openAppPartners@gmail.com',
    to: email,
    subject: 'Verify Your Email',
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 100%;
            padding: 20px;
            background-color: #ffffff;
            max-width: 600px;
            margin: 20px auto;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            background-color: #007bff;
            padding: 20px;
            border-radius: 8px 8px 0 0;
            color: white;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
          }
          .content {
            padding: 20px;
            font-size: 16px;
            color: #333;
          }
          .content p {
            margin-bottom: 20px;
          }
          .btn {
            display: inline-block;
            padding: 12px 24px;
            background-color: #28a745;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
          }
          .btn:hover {
            background-color: #218838;
          }
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Open App Partners!</h1>
          </div>
          <div class="content">
            <p>Hello,</p>
            <p>Thank you for signing up with Open App Partners. To complete your registration, please verify your email address by clicking the button below:</p>
            <p style="text-align: center;">
              <a href="${verificationLink}" class="btn">Verify Your Email</a>
            </p>
            <p>If the button above doesn't work, copy and paste the following link into your web browser:</p>
            <p><a href="${verificationLink}">${verificationLink}</a></p>
            <p>If you did not create this account, please disregard this email.</p>
          </div>
          <div class="footer">
            <p>Open App Partners - All Rights Reserved</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log(`Attempting to send verification email to ${email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sending response:', info);
    if (info.messageId) {
      console.log('Verification email sent successfully. Message ID:', info.messageId);
    } else {
      console.log('Verification email sent, but no message ID was returned.');
    }
    return true;
  } catch (error) {
    console.error('Error sending verification email:', error);
    if (error.response) {
      console.error('SMTP response:', error.response);
    }
    return false;
  }
}
app.get('/api/verify-email-page', async (req, res) => {
  const { token, userId } = req.query;

  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { width: 100%; max-width: 400px; margin: auto; text-align: center; }
          .btn { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; border-radius: 5px; text-decoration: none; cursor: pointer; }
          .loading-modal {
              position: fixed;
              top: 0; left: 0;
              width: 100%; height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              display: flex; justify-content: center; align-items: center;
              visibility: hidden; /* Hidden by default */
          }
          .loading-modal.active { visibility: visible; }
          .spinner {
              border: 8px solid #f3f3f3;
              border-top: 8px solid #3498db;
              border-radius: 50%;
              width: 60px; height: 60px;
              animation: spin 1s linear infinite;
          }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Confirm Email Verification</h1>
          <p>To complete your email verification, please click the button below:</p>
          <button class="btn" onclick="verifyEmail()">Verify Email</button>
        </div>

        <!-- Loading Modal -->
        <div class="loading-modal" id="loadingModal">
          <div class="spinner"></div>
        </div>

        <script>
          async function verifyEmail() {
            const loadingModal = document.getElementById('loadingModal');
            loadingModal.classList.add('active'); // Show the loading modal

            try {
              const response = await fetch('/api/verify-email?token=${token}&userId=${userId}');
              if (response.ok) {
                // If successful, redirect to the verified page
                window.location.href = response.url;
              } else {
                // If there's an error, hide the loading modal and alert
                loadingModal.classList.remove('active');
                const result = await response.json();
                alert(result.error);
              }
            } catch (error) {
              console.error('Verification error:', error);
              loadingModal.classList.remove('active');
              alert('An error occurred during verification.');
            }
          }
        </script>
      </body>
      </html>
  `);
});
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`Attempt ${i + 1} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
    }
  }
}
async function sendEmailVerificationSuccessEmail(email) {
  const mailOptions = {
      from: 'openapppartners@gmail.com',
      to: email,
      subject: 'Your Email Has Been Verified!',
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verified Successfully</title>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { width: 100%; padding: 20px; background-color: #ffffff; max-width: 600px; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; background-color: #007bff; padding: 20px; border-radius: 8px 8px 0 0; color: white; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 20px; font-size: 16px; color: #333; }
              .content p { margin-bottom: 20px; }
              .btn { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .btn:hover { background-color: #218838; }
              .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification Successful</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Your email has been successfully verified. You can now log in to access your Open App Partners account and enjoy all its features.</p>
                <p style="text-align: center;">
                  <a href="https://openapppartners.com" class="btn">Go to Login</a>
                </p>
                <p>If you did not create this account, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>Open App Partners - All Rights Reserved</p>
              </div>
            </div>
          </body>
          </html>
      `
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log('Email verification success email sent to', email);
  } catch (error) {
      console.error('Error sending email verification success email:', error);
      throw error;
  }
}
app.get('/api/verify-email', async (req, res) => {
  const { token, userId } = req.query;

  try {
    // Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Verification link expired' });
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid verification link' });
      }
      throw err;
    }

    // Ensure the token userId matches the one from the URL
    if (decoded.userId !== userId) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    const result = await retryOperation(async () => {
      // Retrieve the user's verification status and email based on userId
      const userResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query`
          SELECT EmailAddress, IsEmailAddressVerified
          FROM [dbo].[User]
          WHERE Id = @userId
        `;

      if (userResult.recordset.length === 0) {
        throw new Error('User not found');
      }

      const { EmailAddress: email, IsEmailAddressVerified: isVerified } = userResult.recordset[0];

      if (isVerified) {
        // If the email is already verified, skip updating and sending an email
        console.log('Email is already verified for user:', userId);
        return { alreadyVerified: true, email };
      }

      // Mark the user as verified in the database
      await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query`
          UPDATE [dbo].[User]
          SET IsEmailAddressVerified = 1
          WHERE Id = @userId
        `;

      // Send email verification success email
      await sendEmailVerificationSuccessEmail(email);

      return { alreadyVerified: false, email };
    });

    // Serve a styled confirmation HTML page
    if (result.alreadyVerified) {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Successfully Verified</title>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
            .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); text-align: center; max-width: 400px; width: 100%; }
            h1 { color: #28a745; margin-bottom: 20px; }
            p { color: #333; font-size: 16px; }
            .login-link { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
            .login-link:hover { background-color: #0056b3; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Email Successfully Verified</h1>
            <p>Your account is Successfully verified. You can now log in to access your account.</p>
            <a href="https://openapppartners.com" class="login-link">Go to Login</a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verified</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                .container { background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); text-align: center; max-width: 400px; width: 100%; }
                h1 { color: #28a745; margin-bottom: 20px; }
                p { color: #333; font-size: 16px; }
                .login-link { display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                .login-link:hover { background-color: #0056b3; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Email Verified Successfully!</h1>
                <p>Your account has been verified. You can now log in to access your account.</p>
                <a href="https://openapppartners.com" class="login-link">Go to Login</a>
            </div>
        </body>
        </html>
      `);
    }

  } catch (err) {
    console.error('Error verifying email:', err);
    res.status(500).json({ error: 'Server error during email verification' });
  }
});
// Route to request password reset
app.post('/api/forgot-password', express.json(), async (req, res) => {
  const { identifier } = req.body; // 'identifier' will be either Username or EmailAddress

  try {
    const result = await retryOperation(async () => {
      // Check if the identifier matches either the Username or EmailAddress
      const userResult = await pool.request()
        .input('identifier', sql.NVarChar, identifier)
        .query`
          SELECT Id, EmailAddress FROM [dbo].[User] 
          WHERE Username = @identifier OR EmailAddress = @identifier
        `;

      // If no matching user is found
      if (userResult.recordset.length === 0) {
        throw new Error('Username or email not found');
      }

      const userId = userResult.recordset[0].Id;
      const email = userResult.recordset[0].EmailAddress;

      // Generate password reset token (valid for 1 hour)
      const resetToken = jwt.sign({ userId }, secretKey, { expiresIn: '1h' });

      // Send password reset email
      const resetLink = `http://localhost:3774/api/reset-password?token=${resetToken}`;
      await sendResetPasswordEmail(email, resetLink);

      return { userId, email };
    });

    console.log(`Password reset requested for user: ${result.userId}`);
    res.json({ message: 'Password reset link sent to your email.' });

  } catch (err) {
    console.error('Error requesting password reset:', err);
    if (err.message === 'Username or email not found') {
      res.status(404).json({ error: 'Username or email not found' });
    } else {
      res.status(500).json({ error: 'Failed to request password reset' });
    }
  }
});
// Route to handle password reset request
app.post('/api/request-password-reset', express.json(), async (req, res) => {
  const { identifier } = req.body; // This could be the username or email

  try {
    const result = await retryOperation(async () => {
      // Find the user by Username or EmailAddress
      const userResult = await pool.request()
        .input('identifier', sql.NVarChar, identifier)
        .query`
          SELECT Id, EmailAddress FROM [dbo].[User]
          WHERE Username = @identifier OR EmailAddress = @identifier
        `;

      if (userResult.recordset.length === 0) {
        throw new Error('Username or email not found');
      }

      const userId = userResult.recordset[0].Id;
      const email = userResult.recordset[0].EmailAddress;

      // Generate password reset token (expires in 1 hour)
      const resetToken = jwt.sign({ userId }, secretKey, { expiresIn: '1h' });
      await sendPasswordResetEmail(email, resetToken, userId);

      return { userId, email };
    });

    console.log(`Password reset requested for user: ${result.userId}`);
    res.json({ message: 'Password reset link sent to your email.' });

  } catch (err) {
    console.error('Error requesting password reset:', err);
    if (err.message === 'Username or email not found') {
      res.status(404).json({ error: 'Username or email not found' });
    } else {
      res.status(500).json({ error: 'Failed to request password reset' });
    }
  }
});
// Send password reset email
async function sendPasswordResetEmail(email, token, userId) {
  const resetLink = `http://localhost:3774/api/reset-password-page?token=${token}&userId=${userId}`;

  const mailOptions = {
      from: 'openAppPartners@gmail.com',
      to: email,
      subject: 'Reset Your Password',
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f4;
                      margin: 0;
                      padding: 0;
                  }
                  .container {
                      width: 100%;
                      padding: 20px;
                      background-color: #ffffff;
                      max-width: 600px;
                      margin: 20px auto;
                      border-radius: 10px;
                      box-shadow: 0 5px 10px rgba(0, 0, 0, 0.15);
                  }
                  .header {
                      text-align: center;
                      background-color: #6c757d;
                      padding: 25px;
                      border-radius: 10px 10px 0 0;
                      color: #ffffff;
                  }
                  .header h1 {
                      margin: 0;
                      font-size: 22px;
                  }
                  .content {
                      padding: 20px;
                      font-size: 15px;
                      color: #555;
                  }
                  .content p {
                      margin-bottom: 20px;
                  }
                  .btn {
                      display: inline-block;
                      padding: 10px 20px;
                      background-color: #17a2b8;
                      color: white;
                      text-decoration: none;
                      border-radius: 5px;
                      font-weight: bold;
                  }
                  .btn:hover {
                      background-color: #138496;
                  }
                  .footer {
                      margin-top: 20px;
                      text-align: center;
                      font-size: 12px;
                      color: #999;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>Password Reset Request</h1>
                  </div>
                  <div class="content">
                      <p>Hello,</p>
                      <p>We received a request to reset your password for your Open App Partners account. If this was you, please click the button below to set a new password:</p>
                      <p style="text-align: center;">
                          <a href="${resetLink}" class="btn">Reset Password</a>
                      </p>
                      <p>If the button above doesn't work, copy and paste the following link into your browser:</p>
                      <p><a href="${resetLink}">${resetLink}</a></p>
                      <p>If you did not request a password reset, you can safely ignore this email.</p>
                  </div>
                  <div class="footer">
                      <p>Open App Partners - All Rights Reserved</p>
                  </div>
              </div>
          </body>
          </html>
      `
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log('Password reset email sent to', email);
  } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
  }
}
// Serve the password reset form when user clicks the reset link
app.get('/api/reset-password-page', (req, res) => {
  const { token, userId } = req.query;

  res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
              body {
                  font-family: Arial, sans-serif;
                  background-color: #f9f9f9;
                  margin: 0;
                  padding: 0;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
              }
              .container {
                  width: 100%;
                  max-width: 400px;
                  padding: 20px;
                  background-color: #ffffff;
                  border-radius: 8px;
                  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                  text-align: center;
              }
              .hidden { display: none; }
              h1 {
                  font-size: 24px;
                  color: #007bff;
                  margin-bottom: 20px;
              }
              label {
                  display: block;
                  margin: 15px 0 5px;
                  font-weight: bold;
                  color: #333;
              }
              .input-container {
                  position: relative;
                  margin-bottom: 10px;
              }
              input[type="password"],
              input[type="text"] {
                  width: 100%;
                  padding: 10px;
                  padding-right: 30px;
                  border-radius: 5px;
                  border: 1px solid #ccc;
                  font-size: 14px;
                  box-sizing: border-box;
              }
              .toggle-password {
                  position: absolute;
                  top: 50%;
                  right: 10px;
                  transform: translateY(-50%);
                  cursor: pointer;
                  font-size: 18px;
                  color: #888;
              }
              .btn {
                  display: inline-block;
                  padding: 12px 24px;
                  margin-top: 20px;
                  background-color: #28a745;
                  color: white;
                  border: none;
                  border-radius: 5px;
                  cursor: pointer;
                  font-weight: bold;
                  font-size: 16px;
              }
              .btn:disabled {
                  background-color: #ddd;
                  cursor: not-allowed;
              }
              .criteria {
                  font-size: 14px;
                  text-align: left;
                  margin-top: 15px;
                  color: #666;
                  margin-bottom: 20px;
              }
              .criteria span {
                  display: block;
                  margin-bottom: 8px;
              }
              .criteria span.valid {
                  color: #28a745;
                  font-weight: bold;
              }
              .criteria span.invalid {
                  color: #d9534f;
              }
              .error-message {
                  color: #d9534f;
                  font-size: 14px;
                  text-align: left;
                  margin-top: 8px;
              }
              .loading-modal {
                  display: none;
                  position: fixed;
                  top: 0;
                  left: 0;
                  width: 100%;
                  height: 100%;
                  background-color: rgba(0, 0, 0, 0.5);
                  justify-content: center;
                  align-items: center;
                  z-index: 1000;
              }
              .loading-modal.active { display: flex; }
              .spinner {
                  border: 8px solid #f3f3f3;
                  border-top: 8px solid #3498db;
                  border-radius: 50%;
                  width: 60px;
                  height: 60px;
                  animation: spin 1s linear infinite;
              }
              @keyframes spin { 100% { transform: rotate(360deg); } }
              .modal {
                  display: none;
                  background-color: #fff;
                  padding: 30px;
                  max-width: 400px;
                  border-radius: 8px;
                  text-align: center;
              }
              .modal h2 {
                  color: #28a745;
                  font-size: 22px;
                  margin-bottom: 20px;
              }
              .modal p {
                  font-size: 16px;
                  color: #333;
                  margin-bottom: 20px;
              }
              #errorModal {
                  background-color: #fff;
                  border: 2px solid #d9534f;
              }
              #errorModal h2 {
                  color: #d9534f;
              }
          </style>
      </head>
      <body>
          <div class="container" id="resetFormContainer">
              <h1>Reset Your Password</h1>
              <form id="resetPasswordForm">
                  <input type="hidden" id="resetToken" value="${token}" />
                  <input type="hidden" id="userId" value="${userId}" />
                  
                  <label for="newPassword">New Password</label>
                  <div class="input-container">
                      <input type="password" id="newPassword" placeholder="Enter new password" required />
                      <span class="toggle-password" onclick="togglePasswordVisibility('newPassword')">&#128065;</span>
                  </div>
                  
                  <div id="confirmPasswordContainer" class="hidden">
                      <label for="confirmPassword">Confirm Password</label>
                      <div class="input-container">
                          <input type="password" id="confirmPassword" placeholder="Confirm your password" required />
                          <span class="toggle-password" onclick="togglePasswordVisibility('confirmPassword')">&#128065;</span>
                      </div>
                      <span id="confirmPasswordError" class="error-message hidden">Passwords do not match</span>
                  </div>
                  <div class="criteria" id="passwordCriteria">
                      <span id="minLength" class="invalid">At least 8 characters</span>
                      <span id="uppercase" class="invalid">At least one uppercase letter</span>
                      <span id="number" class="invalid">At least one number</span>
                      <span id="specialChar" class="invalid">At least one special character</span>
                  </div>

                  <button type="submit" class="btn" disabled>Update Password</button>
              </form>
          </div>
          <!-- Loading and Success Modals -->
          <div class="loading-modal" id="loadingModal">
              <div class="spinner"></div>
          </div>
          <div class="modal" id="successModal">
              <h2>Password Reset Successful!</h2>
              <p>Your password has been reset. Click the button below to log in.</p>
              <a href="https://openapppartners.com" class="btn">Go to Login</a>
          </div>
          <!-- New Error Modal -->
          <div class="modal" id="errorModal">
              <h2>Password Reset Failed</h2>
              <p id="errorMessage">An error occurred while resetting your password. Please try again later.</p>
              <button onclick="location.reload()" class="btn">Try Again</button>
          </div>
          <script>
              const newPasswordInput = document.getElementById('newPassword');
              const confirmPasswordContainer = document.getElementById('confirmPasswordContainer');
              const confirmPasswordInput = document.getElementById('confirmPassword');
              const confirmPasswordError = document.getElementById('confirmPasswordError');
              const submitButton = document.querySelector('.btn');

              function togglePasswordVisibility(inputId) {
                  const input = document.getElementById(inputId);
                  input.type = input.type === 'password' ? 'text' : 'password';
              }

              function validatePassword() {
                  const password = newPasswordInput.value;
                  const minLength = password.length >= 8;
                  const uppercase = /[A-Z]/.test(password);
                  const number = /[0-9]/.test(password);
                  const specialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                  document.getElementById('minLength').className = minLength ? 'valid' : 'invalid';
                  document.getElementById('uppercase').className = uppercase ? 'valid' : 'invalid';
                  document.getElementById('number').className = number ? 'valid' : 'invalid';
                  document.getElementById('specialChar').className = specialChar ? 'valid' : 'invalid';

                  const passwordValid = minLength && uppercase && number && specialChar;

                  confirmPasswordContainer.classList.toggle('hidden', !passwordValid);
                  return passwordValid;
              }

              function checkPasswordsMatch() {
                  const password = newPasswordInput.value;
                  const confirmPassword = confirmPasswordInput.value;

                  const passwordsMatch = password === confirmPassword;
                  confirmPasswordError.classList.toggle('hidden', passwordsMatch || !confirmPassword);
                  return passwordsMatch;
              }

              function updateSubmitButtonState() {
                  const isPasswordValid = validatePassword();
                  const passwordsMatch = checkPasswordsMatch();
                  submitButton.disabled = !(isPasswordValid && passwordsMatch);
              }

              newPasswordInput.addEventListener('input', updateSubmitButtonState);
              confirmPasswordInput.addEventListener('input', updateSubmitButtonState);

              document.getElementById('resetPasswordForm').addEventListener('submit', async (event) => {
                  event.preventDefault();
                  const loadingModal = document.getElementById('loadingModal');
                  loadingModal.classList.add('active');

                  const token = document.getElementById('resetToken').value;
                  const userId = document.getElementById('userId').value;
                  const newPassword = document.getElementById('newPassword').value;

                  try {
                      const response = await fetch('/api/reset-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ token, userId, newPassword })
                      });

                      const result = await response.json();
                      loadingModal.classList.remove('active');

                      if (response.ok) {
                          document.getElementById('resetFormContainer').classList.add('hidden');
                          document.getElementById('successModal').style.display = 'block';
                      } else {
                          document.getElementById('resetFormContainer').classList.add('hidden');
                          document.getElementById('errorModal').style.display = 'block';
                          document.getElementById('errorMessage').textContent = result.error || 'An error occurred during password reset.';
                      }
                  } catch (error) {
                      loadingModal.classList.remove('active');
                      console.error('Error resetting password:', error);
                      document.getElementById('resetFormContainer').classList.add('hidden');
                      document.getElementById('errorModal').style.display = 'block';
                      document.getElementById('errorMessage').textContent = 'An unexpected error occurred. Please try again later.';
                  }
              });
          </script>
      </body>
      </html>
  `);
});
// Password reset confirmation email
async function sendPasswordResetConfirmationEmail(email) {
  const mailOptions = {
      from: 'openapppartners@gmail.com', // ensure this is the verified sender email
      to: email,
      subject: 'Your Password Has Been Reset',
      html: `
          <!DOCTYPE html>
          <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset Confirmation</title>
            <style>
              body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { width: 100%; padding: 20px; background-color: #ffffff; max-width: 600px; margin: 20px auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); }
              .header { text-align: center; background-color: #007bff; padding: 20px; border-radius: 8px 8px 0 0; color: white; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 20px; font-size: 16px; color: #333; }
              .content p { margin-bottom: 20px; }
              .btn { display: inline-block; padding: 12px 24px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
              .btn:hover { background-color: #218838; }
              .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Successfully Reset</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>Your password has been successfully reset. You can now log in using your new password.</p>
                <p style="text-align: center;">
                  <a href="https://openapppartners.com" class="btn">Go to Login</a>
                </p>
                <p>If you did not request this change, please contact our support team immediately.</p>
              </div>
              <div class="footer">
                <p>Open App Partners - All Rights Reserved</p>
              </div>
            </div>
          </body>
          </html>
      `
  };

  try {
      await transporter.sendMail(mailOptions);
      console.log('Password reset confirmation email sent to', email);
  } catch (error) {
      console.error('Error sending password reset confirmation email:', error);
      throw error;
  }
}
app.post('/api/reset-password', async (req, res) => {
  const { token, userId, newPassword } = req.body;

  try {
    console.log("Starting password reset process...");
    
    const decoded = jwt.verify(token, secretKey);
    if (decoded.userId !== userId) {
      console.log("Invalid reset token.");
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    await retryOperation(async () => {
      // Get the user's email based on userId
      const userResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query`
          SELECT EmailAddress 
          FROM [dbo].[User] 
          WHERE Id = @userId
        `;

      if (userResult.recordset.length === 0) {
        throw new Error('User not found');
      }

      const email = userResult.recordset[0].EmailAddress;
      console.log("Retrieved user email:", email);

      // Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update the password in the database
      await pool.request()
        .input('hashedPassword', sql.NVarChar, hashedPassword)
        .input('userId', sql.UniqueIdentifier, userId)
        .query`
          UPDATE [dbo].[User]
          SET PasswordHash = @hashedPassword
          WHERE Id = @userId
        `;

      console.log(`Password reset for user: ${userId}`);
      
      // Send confirmation email
      await sendPasswordResetConfirmationEmail(email);
    });
    
    console.log("Password reset process completed successfully.");
    res.json({ message: 'Your password has been reset successfully.' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Error resetting password', details: error.message });
  }
});
app.post('/api/update-user/:userId', express.json(), async (req, res) => {
  const { userId } = req.params;
  const { FirstName, LastName, EmailAddress, Username, password, PersonalDescription } = req.body;

  try {
    // Check if the new email or username is already taken by another user
    const checkUserResult = await pool.request()
      .input('EmailAddress', sql.NVarChar, EmailAddress)
      .input('Username', sql.NVarChar, Username)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT COUNT(*) AS count 
        FROM [dbo].[User] 
        WHERE (EmailAddress = @EmailAddress OR Username = @Username) 
        AND Id != @userId
      `);
    
    if (checkUserResult.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash the new password if provided, else keep the existing password hash
    let passwordHash = null;
    if (password && password !== '') {
      passwordHash = await bcrypt.hash(password, 10);
    } else {
      // Fetch existing password hash if no new password is provided
      const existingPasswordResult = await pool.request()
        .input('userId', sql.UniqueIdentifier, userId)
        .query(`
          SELECT PasswordHash 
          FROM [dbo].[User] 
          WHERE Id = @userId
        `);
      if (existingPasswordResult.recordset.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      passwordHash = existingPasswordResult.recordset[0].PasswordHash;
    }

    // Update user profile data in the Azure SQL User table
    await pool.request()
      .input('FirstName', sql.NVarChar, FirstName)
      .input('LastName', sql.NVarChar, LastName)
      .input('EmailAddress', sql.NVarChar, EmailAddress)
      .input('Username', sql.NVarChar, Username)
      .input('PasswordHash', sql.NVarChar, passwordHash)
      .input('PersonalDescription', sql.NVarChar, PersonalDescription)
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        UPDATE [dbo].[User]
        SET 
          FirstName = @FirstName,
          LastName = @LastName,
          EmailAddress = @EmailAddress,
          Username = @Username,
          PasswordHash = @PasswordHash,
          PersonalDescription = @PersonalDescription,
          Name = @FirstName + ' ' + @LastName
        WHERE Id = @userId
      `);

    // Retrieve the updated user data to send back in the response
    const updatedUserResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT Id, FirstName, LastName, EmailAddress, Username, PersonalDescription, Name 
        FROM [dbo].[User] 
        WHERE Id = @userId
      `);

    const updatedUser = updatedUserResult.recordset[0];

    // Respond with success and the updated user data
    res.json({
      message: 'User account updated successfully',
      user: updatedUser
    });

  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user account' });
  }
});
// Express route to validate a token
app.post('/api/validate-token', express.json(), async (req, res) => {
  const { token } = req.body;
  
  try {
    // Step 1: Verify the JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, secretKey);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      throw err;
    }

    const userId = decoded.userId;  // Retrieve the userId from the decoded token

    // Step 2: Retrieve the user data from the User table in Azure SQL
    const userResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          Id, 
          Name, 
          FirstName, 
          LastName, 
          Username, 
          EmailAddress, 
          PersonalDescription, 
          PasswordHash, 
          IsEmailAddressVerified
        FROM [dbo].[User] 
        WHERE Id = @userId
      `);

    if (userResult.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userResult.recordset[0];

    // Step 3: Check if the email is verified
    if (!userData.IsEmailAddressVerified) {
      return res.status(401).json({ error: 'Email not verified. Please verify your email before proceeding.' });
    }

    // Exclude the password from the user data
    const { PasswordHash, IsEmailAddressVerified, ...userWithoutPassword } = userData;

    // Step 4: Retrieve all apps belonging to the user from the Application table using OwnerUserId
    const appsResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, userId)
      .query(`
        SELECT 
          Id, 
          OwnerUserId, 
          DisplayName, 
          Price, 
          TagLine, 
          Description, 
          TechnologyListCsv, 
          ConclusionSummary, 
          RepositoryUrl,
          CASE WHEN PreviewImageFile IS NOT NULL THEN CONCAT('api/app-image/', Id) ELSE NULL END AS PreviewImageFile,
          CASE WHEN DemonstrationVideoFile IS NOT NULL THEN CONCAT('api/app-video/', Id) ELSE NULL END AS DemonstrationVideoFile
        FROM [dbo].[Application] 
        WHERE OwnerUserId = @userId
      `);

    const userApps = appsResult.recordset;

    res.json({
      message: 'Token validated successfully',
      user: userWithoutPassword,
      apps: userApps
    });

  } catch (err) {
    console.error('Error validating token:', err);
    res.status(500).json({ error: 'Server error during token validation' });
  }
});
// Login route
app.post('/api/login', express.json(), async (req, res) => {
  const { login, password, rememberMe } = req.body;

  try {
    // Check if the login matches either the Username or EmailAddress fields
    const userResult = await pool.request()
      .input('login', sql.NVarChar, login)
      .query`
        SELECT Id, Username, EmailAddress, PasswordHash, IsEmailAddressVerified, PersonalDescription, Name, FirstName, LastName
        FROM [dbo].[User]
        WHERE Username = @login OR EmailAddress = @login
      `;
    
    if (userResult.recordset.length === 0) {
      // No user found
      return res.status(401).json({ validCredentials: false, IsEmailAddressVerified: false });
    }
    
    const user = userResult.recordset[0];
    
    // Check if the entered password matches the stored hashed password
    const passwordMatch = await bcrypt.compare(password, user.PasswordHash);
    if (!passwordMatch) {
      // Password does not match
      return res.status(401).json({ validCredentials: false, IsEmailAddressVerified: user.IsEmailAddressVerified });
    }

    // Check if the user's email is verified
    if (!user.IsEmailAddressVerified) {
      return res.status(403).json({
        validCredentials: true,
        IsEmailAddressVerified: false
      });
    }

    // Generate JWT token if rememberMe is checked
    let token = null;
    if (rememberMe) {
      token = jwt.sign(
        { userId: user.Id, email: user.EmailAddress },
        secretKey,
        { expiresIn: '7d' }  // Token expires in 7 days
      );
    }

    // Remove sensitive fields and return user data
    const { PasswordHash, ...userWithoutPassword } = user;

    res.json({
      message: 'Login successful',
      token,  // Include the JWT token if rememberMe is checked
      user: { 
        Id: user.Id,
        Username: user.Username,
        EmailAddress: user.EmailAddress,
        IsEmailAddressVerified: user.IsEmailAddressVerified,
        PersonalDescription: user.PersonalDescription,
        Name: user.Name,
        FirstName: user.FirstName,
        LastName: user.LastName,
        validCredentials: true
      }
    });

  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Failed to login', validCredentials: null, IsEmailAddressVerified: null });
  }
});
app.post('/api/create-app', async (req, res) => {
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      // Extract fields
      const {
        OwnerUserId,
        DisplayName,
        TagLine,
        Description,
        TechnologyListCsv,
        ConclusionSummary,
        RepositoryUrl,
        Price
      } = fields;

      // Read files
      let previewImageFile = null;
      let demonstrationVideoFile = null;

      if (files.PreviewImageFile && files.PreviewImageFile[0]) {
        previewImageFile = await fs.readFile(files.PreviewImageFile[0].filepath);
      }

      if (files.DemonstrationVideoFile && files.DemonstrationVideoFile[0]) {
        demonstrationVideoFile = await fs.readFile(files.DemonstrationVideoFile[0].filepath);
      }

      // Check if DisplayName already exists
      const checkResult = await pool.request()
        .input('DisplayName', sql.VarChar(50), DisplayName[0])
        .query('SELECT COUNT(*) as count FROM [dbo].[Application] WHERE DisplayName = @DisplayName');

      if (checkResult.recordset[0].count > 0) {
        return res.status(400).json({ error: 'An application with this name already exists' });
      }

      // Prepare insert query
      const insertQuery = `
        INSERT INTO [dbo].[Application] 
        (OwnerUserId, DisplayName, Price, TagLine, Description, TechnologyListCsv, ConclusionSummary, RepositoryUrl, PreviewImageFile, DemonstrationVideoFile)
        OUTPUT INSERTED.*
        VALUES 
        (@OwnerUserId, @DisplayName, @Price, @TagLine, @Description, @TechnologyListCsv, @ConclusionSummary, @RepositoryUrl, @PreviewImageFile, @DemonstrationVideoFile)
      `;

      // Execute insert query
      const insertResult = await pool.request()
        .input('OwnerUserId', sql.UniqueIdentifier, OwnerUserId[0])
        .input('DisplayName', sql.VarChar(50), DisplayName[0])
        .input('Price', sql.Numeric(18, 2), parseFloat(Price[0]))
        .input('TagLine', sql.VarChar(100), TagLine[0])
        .input('Description', sql.VarChar(sql.MAX), Description[0])
        .input('TechnologyListCsv', sql.VarChar(sql.MAX), TechnologyListCsv[0])
        .input('ConclusionSummary', sql.VarChar(sql.MAX), ConclusionSummary[0])
        .input('RepositoryUrl', sql.VarChar(255), RepositoryUrl[0] || null)
        .input('PreviewImageFile', sql.VarBinary(sql.MAX), previewImageFile || null)
        .input('DemonstrationVideoFile', sql.VarBinary(sql.MAX), demonstrationVideoFile || null)
        .query(insertQuery);

      const newApp = insertResult.recordset[0];

      // Prepare the response
      const response = {
        message: 'App created successfully',
        data: {
          Id: newApp.Id,
          OwnerUserId: newApp.OwnerUserId,
          DisplayName: newApp.DisplayName,
          Price: newApp.Price,
          TagLine: newApp.TagLine,
          Description: newApp.Description,
          TechnologyListCsv: newApp.TechnologyListCsv ? newApp.TechnologyListCsv.split(',') : [],
          ConclusionSummary: newApp.ConclusionSummary,
          RepositoryUrl: newApp.RepositoryUrl,
          PreviewImageFile: newApp.PreviewImageFile ? `api/app-image/${newApp.Id}` : null,
          DemonstrationVideoFile: newApp.DemonstrationVideoFile ? `api/app-video/${newApp.Id}` : null
        }
      };

      res.json(response);
    } catch (err) {
      console.error('Error creating app:', err);
      res.status(500).json({ error: 'Failed to create app', details: err.message });
    }
  });
});
app.get('/api/app-image/:id', async (req, res) => {
  try {
    const request = pool.request();
    request.input('Id', sql.UniqueIdentifier, req.params.id);
    const result = await request.query('SELECT PreviewImageFile FROM [dbo].[Application] WHERE Id = @Id');
    
    if (result.recordset.length > 0 && result.recordset[0].PreviewImageFile) {
      res.contentType('image/jpeg');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(result.recordset[0].PreviewImageFile);
      bufferStream.pipe(res);
    } else {
      res.status(404).send('Image not found');
    }
  } catch (err) {
    console.error('Error retrieving image:', err);
    res.status(500).send('Error retrieving image');
  }
});
app.get('/api/app-video/:id', async (req, res) => {
  try {
    const request = pool.request();
    request.input('Id', sql.UniqueIdentifier, req.params.id);
    const result = await request.query('SELECT DemonstrationVideoFile FROM [dbo].[Application] WHERE Id = @Id');
    
    if (result.recordset.length > 0 && result.recordset[0].DemonstrationVideoFile) {
      res.contentType('video/mp4');
      const bufferStream = new stream.PassThrough();
      bufferStream.end(result.recordset[0].DemonstrationVideoFile);
      bufferStream.pipe(res);
    } else {
      res.status(404).send('Video not found');
    }
  } catch (err) {
    console.error('Error retrieving video:', err);
    res.status(500).send('Error retrieving video');
  }
});
app.post('/api/update-app/:appId', async (req, res) => {
  const { appId } = req.params;
  const form = formidable({ multiples: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ error: 'Failed to parse form data' });
    }

    try {
      console.log('Parsed fields:', fields);
      console.log('Parsed files:', files);

      const {
        OwnerUserId,
        DisplayName,
        TagLine,
        Description,
        TechnologyListCsv,
        ConclusionSummary,
        RepositoryUrl,
        Price
      } = fields;

      // Fetch the existing app data, including the image and video
      const existingAppResult = await pool.request()
        .input('Id', sql.UniqueIdentifier, appId)
        .query('SELECT PreviewImageFile, DemonstrationVideoFile FROM [dbo].[Application] WHERE Id = @Id');

      if (existingAppResult.recordset.length === 0) {
        console.log(`No app found with ID: ${appId}`);
        return res.status(404).json({ error: 'App not found' });
      }

      const existingApp = existingAppResult.recordset[0];
      console.log('Existing app data:', existingApp);

      let imageUpdated = false;
      let videoUpdated = false;
      let previewImageFileToUpdate = existingApp.PreviewImageFile;
      let demonstrationVideoFileToUpdate = existingApp.DemonstrationVideoFile;

      // Handle image update
      if (files.PreviewImageFile && files.PreviewImageFile[0] && files.PreviewImageFile[0].filepath !== 'null') {
        const newPreviewImageFile = await fs.readFile(files.PreviewImageFile[0].filepath);
        console.log('New PreviewImageFile detected:', newPreviewImageFile);
        if (!existingApp.PreviewImageFile || !newPreviewImageFile.equals(existingApp.PreviewImageFile)) {
          previewImageFileToUpdate = newPreviewImageFile;
          imageUpdated = true;
        }
      } else if (fields.PreviewImageFile === 'null' || fields.PreviewImageFile === null) {
        console.log('PreviewImageFile explicitly set to null');
        previewImageFileToUpdate = null;
        imageUpdated = true;
      }

      // Handle video update (ensuring null values are handled properly)
      if (fields.DemonstrationVideoFile && fields.DemonstrationVideoFile[0] === 'null') {
        console.log('DemonstrationVideoFile explicitly set to null');
        demonstrationVideoFileToUpdate = null;
        videoUpdated = true;
      } else if (files.DemonstrationVideoFile && files.DemonstrationVideoFile[0] && files.DemonstrationVideoFile[0].filepath !== 'null') {
        const newDemonstrationVideoFile = await fs.readFile(files.DemonstrationVideoFile[0].filepath);
        console.log('New DemonstrationVideoFile detected:', newDemonstrationVideoFile);
        if (!existingApp.DemonstrationVideoFile || !newDemonstrationVideoFile.equals(existingApp.DemonstrationVideoFile)) {
          demonstrationVideoFileToUpdate = newDemonstrationVideoFile;
          videoUpdated = true;
        }
      }

      console.log('Prepared values for update - Image:', previewImageFileToUpdate, 'Video:', demonstrationVideoFileToUpdate);

      // Check if the new DisplayName is already taken (by another app)
      if (DisplayName) {
        const checkNameResult = await pool.request()
          .input('DisplayName', sql.VarChar(50), DisplayName[0])
          .input('Id', sql.UniqueIdentifier, appId)
          .query('SELECT COUNT(*) as count FROM [dbo].[Application] WHERE DisplayName = @DisplayName AND Id != @Id');

        if (checkNameResult.recordset[0].count > 0) {
          console.log(`DisplayName "${DisplayName[0]}" is already in use`);
          return res.status(400).json({ error: 'An application with this name already exists' });
        }
      }

      // Build update query conditionally for image and video fields
      let updateQuery = `
        UPDATE [dbo].[Application] 
        SET 
          DisplayName = COALESCE(@DisplayName, DisplayName),
          Price = COALESCE(@Price, Price),
          TagLine = COALESCE(@TagLine, TagLine),
          Description = COALESCE(@Description, Description),
          TechnologyListCsv = COALESCE(@TechnologyListCsv, TechnologyListCsv),
          ConclusionSummary = COALESCE(@ConclusionSummary, ConclusionSummary),
          RepositoryUrl = COALESCE(@RepositoryUrl, RepositoryUrl)
      `;

      if (imageUpdated) {
        updateQuery += `, PreviewImageFile = @PreviewImageFile`;
      }

      if (videoUpdated) {
        updateQuery += `, DemonstrationVideoFile = @DemonstrationVideoFile`;
      }

      updateQuery += ` OUTPUT INSERTED.* WHERE Id = @Id`;

      // Execute update query
      const updateResult = await pool.request()
        .input('Id', sql.UniqueIdentifier, appId)
        .input('DisplayName', sql.VarChar(50), DisplayName ? DisplayName[0] : null)
        .input('Price', sql.Numeric(18, 2), Price ? parseFloat(Price[0]) : null)
        .input('TagLine', sql.VarChar(100), TagLine ? TagLine[0] : null)
        .input('Description', sql.VarChar(sql.MAX), Description ? Description[0] : null)
        .input('TechnologyListCsv', sql.VarChar(sql.MAX), TechnologyListCsv ? TechnologyListCsv[0] : null)
        .input('ConclusionSummary', sql.VarChar(sql.MAX), ConclusionSummary ? ConclusionSummary[0] : null)
        .input('RepositoryUrl', sql.VarChar(255), RepositoryUrl ? RepositoryUrl[0] : null)
        .input('PreviewImageFile', sql.VarBinary(sql.MAX), previewImageFileToUpdate)
        .input('DemonstrationVideoFile', sql.VarBinary(sql.MAX), demonstrationVideoFileToUpdate)
        .query(updateQuery);

      console.log('Update query result:', updateResult.recordset[0]);

      // Retrieve the updated app, including image and video URLs
      const updatedAppResult = await pool.request()
        .input('Id', sql.UniqueIdentifier, appId)
        .query(`
          SELECT Id, OwnerUserId, DisplayName, Price, TagLine, Description, TechnologyListCsv, ConclusionSummary, RepositoryUrl,
                 CASE WHEN PreviewImageFile IS NOT NULL THEN CONCAT('api/app-image/', Id) ELSE NULL END AS PreviewImageFile,
                 CASE WHEN DemonstrationVideoFile IS NOT NULL THEN CONCAT('api/app-video/', Id) ELSE NULL END AS DemonstrationVideoFile
          FROM [dbo].[Application]
          WHERE Id = @Id
        `);

      const updatedApp = updatedAppResult.recordset[0];
      console.log('Updated app data:', updatedApp);

      // Send response with updated fields
      res.json({
        message: 'App updated successfully',
        data: {
          Id: updatedApp.Id,
          OwnerUserId: updatedApp.OwnerUserId,
          DisplayName: updatedApp.DisplayName,
          Price: updatedApp.Price,
          TagLine: updatedApp.TagLine,
          Description: updatedApp.Description,
          TechnologyListCsv: updatedApp.TechnologyListCsv ? updatedApp.TechnologyListCsv.split(',') : [],
          ConclusionSummary: updatedApp.ConclusionSummary,
          RepositoryUrl: updatedApp.RepositoryUrl,
          PreviewImageFile: updatedApp.PreviewImageFile,
          DemonstrationVideoFile: updatedApp.DemonstrationVideoFile
        }
      });

    } catch (err) {
      console.error('Error updating app:', err);
      res.status(500).json({ error: 'Failed to update app', details: err.message });
    }
  });
});
// Reusable function for file uploads
async function processFileUpload(file, bucketKey, contentType) {
  console.log('Processing file upload:', bucketKey, contentType);
  console.log('File size:', file.size);

  let fileBuffer;
  if (file.buffer) {
    fileBuffer = file.buffer;
  } else if (file.path) {
    fileBuffer = fs.readFileSync(file.path);
  } else {
    throw new Error('Invalid file object');
  }

  console.log('File read successfully');

  try {
    const uploadResponse = await s3Client.send(new PutObjectCommand({
      Bucket: defaultBucket,
      Key: bucketKey,
      Body: fileBuffer,
      ContentType: contentType,
      Metadata: {
        'Access-Control-Allow-Origin': '*'
      }
    }));

    console.log('S3 upload response:', uploadResponse);

    if (uploadResponse.$metadata.httpStatusCode !== 200) {
      throw new Error(`Failed to upload ${bucketKey}`);
    }

    if (file.path) {
      fs.unlinkSync(file.path);
      console.log('Local file cleaned up');
    }

  } catch (error) {
    console.error('Error in processFileUpload:', error);
    throw error;
  }
}
// Helper function to get existing app data
async function getExistingAppData(appId) {
  const fileName = `apps/${appId}.json`;
  const command = new GetObjectCommand({
    Bucket: defaultBucket,
    Key: fileName
  });

  try {
    const response = await s3Client.send(command);
    const bodyContents = await streamToString(response.Body);
    return JSON.parse(bodyContents);
  } catch (err) {
    console.error("Error fetching existing app data:", err);
    return {};
  }
}
// Helper function to convert stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
// Helper function to delete S3 object
async function deleteS3Object(key) {
  const command = new DeleteObjectCommand({
    Bucket: defaultBucket,
    Key: key
  });

  try {
    await s3Client.send(command);
    console.log(`Deleted old file: ${key}`);
  } catch (err) {
    console.error(`Error deleting old file ${key}:`, err);
  }
}
// Helper function to get S3 key from URL
function getKeyFromUrl(url) {
  if (!url) return null;
  try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.substr(1); // Remove leading '/'
  } catch (error) {
      console.error('Error parsing URL:', error);
      return null;
  }
}
// Helper function to convert S3 stream to string
function streamToString(stream) {
  return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
// DELETE /api/delete-user/:userId
app.delete('/api/delete-user/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
      console.error("User ID is undefined");
      return res.status(400).json({ error: "Invalid user ID" });
  }

  try {
      // Verify if the user exists
      const userExistsResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query('SELECT COUNT(*) AS count FROM [dbo].[User] WHERE Id = @UserId');

      if (userExistsResult.recordset[0].count === 0) {
          console.error(`User with ID ${userId} not found`);
          return res.status(404).json({ error: "User not found" });
      }

      // Step 1: Delete applications owned by the user
      const deleteAppsResult = await pool.request()
          .input('OwnerUserId', sql.UniqueIdentifier, userId)
          .query('DELETE FROM [dbo].[Application] WHERE OwnerUserId = @OwnerUserId');

      console.log(`Deleted ${deleteAppsResult.rowsAffected[0]} applications for user ID: ${userId}`);

      // Step 2: Delete the user
      const deleteUserResult = await pool.request()
          .input('UserId', sql.UniqueIdentifier, userId)
          .query('DELETE FROM [dbo].[User] WHERE Id = @UserId');

      console.log(`User with ID ${userId} deleted successfully`);

      res.json({
          message: `User ${userId} and their associated applications were deleted successfully.`,
          deletedAppsCount: deleteAppsResult.rowsAffected[0],
          deletedUserId: userId
      });

  } catch (error) {
      console.error('Error deleting user and associated applications:', error);
      res.status(500).json({ error: 'Failed to delete user and associated applications', details: error.message });
  }
});
// DELETE /api/delete-app/:appId
app.delete('/api/delete-app/:appId', async (req, res) => {
  const { appId } = req.params;

  if (!appId) {
      console.error("App ID is undefined");
      return res.status(400).json({ error: "Invalid app ID" });
  }

  try {
      // Check if the application exists in the Azure SQL database
      const checkAppExists = await pool.request()
          .input('Id', sql.UniqueIdentifier, appId)
          .query('SELECT COUNT(*) AS count FROM [dbo].[Application] WHERE Id = @Id');

      if (checkAppExists.recordset[0].count === 0) {
          console.error("App not found for appId:", appId);
          return res.status(404).json({ error: "App not found" });
      }

      // Retrieve any related image or video file paths before deletion
      const appDataResult = await pool.request()
          .input('Id', sql.UniqueIdentifier, appId)
          .query(`
              SELECT 
                  CASE WHEN PreviewImageFile IS NOT NULL THEN CONCAT('api/app-image/', Id) ELSE NULL END AS PreviewImageFile,
                  CASE WHEN DemonstrationVideoFile IS NOT NULL THEN CONCAT('api/app-video/', Id) ELSE NULL END AS DemonstrationVideoFile
              FROM [dbo].[Application]
              WHERE Id = @Id
          `);

      const appData = appDataResult.recordset[0];

      // Delete the application record from Azure SQL
      await pool.request()
          .input('Id', sql.UniqueIdentifier, appId)
          .query('DELETE FROM [dbo].[Application] WHERE Id = @Id');

      console.log(`App with ID ${appId} deleted successfully from Azure SQL`);

      // Send response including details of any removed files
      res.json({
          message: 'App deleted successfully from Azure SQL',
          removedFiles: {
              PreviewImageFile: appData.PreviewImageFile,
              DemonstrationVideoFile: appData.DemonstrationVideoFile
          }
      });

  } catch (error) {
      console.error('Error deleting app from Azure SQL:', error);
      res.status(500).json({ error: 'Failed to delete app from Azure SQL', details: error.message });
  }
});
if (process.env.NODE_ENV !== 'production') {
  const compiler = webpack(webpackConfig);
  app.use(
    webpackDevMiddleware(compiler, {
      publicPath: webpackConfig.output.publicPath,
    })
  );
  app.use(webpackHotMiddleware(compiler)); // Hot reloading
}

// Serve static files from public_html in production and development
app.use(express.static(path.join(__dirname, 'public_html')));

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});