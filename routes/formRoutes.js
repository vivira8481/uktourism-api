

const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
require('dotenv').config();

// Setup transporter for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    pool: true,
    maxConnections: 1,
    rateDelta: 20000,
    rateLimit: 5
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.log('Transporter verification error:', error);
    } else {
        console.log('Email server is ready to send messages');
    }
});

// POST /api/form/submit
router.post('/submit', async (req, res) => {
    let browser;
    try {
        const {
            fullName,
            mobileNumber,
            email,
            departureCity,
            location,
            numberOfPersons,
            date,
            numberOfDays,
            text,
            tourTitle,
        } = req.body;

        // Basic validation
        if (!fullName || !mobileNumber) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Prepare booking line
        const bookingLine = `<p><strong>Booking For:</strong> ${tourTitle || 'Customized Tour'}</p>`;

        // Create HTML content for PDF
        const htmlContent = `
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 20px;
                        }
                        h2 {
                            color: #333;
                        }
                        p {
                            margin: 4px 0;
                        }
                        strong {
                            color: #000;
                        }
                    </style>
                </head>
                <body>
                    <h2>New Tour Inquiry</h2>
                    ${bookingLine}
                    <p><strong>Full Name:</strong> ${fullName}</p>
                    <p><strong>Mobile Number:</strong> ${mobileNumber}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Departure City:</strong> ${departureCity}</p>
                    <p><strong>Location:</strong> ${location}</p>
                    <p><strong>Number of Persons:</strong> ${numberOfPersons}</p>
                    <p><strong>Date of Birth:</strong> ${date}</p>
                    <p><strong>Number of Days:</strong> ${numberOfDays}</p>
                    <p><strong>Description:</strong> ${text}</p>
                </body>
            </html>
        `;

        // Generate PDF from HTML using Puppeteer
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
            dumpio: true
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 10000 });
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();
        browser = null;

        // Compose email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER,
            subject: 'New Tour Inquiry Form Submission',
            html: `<p>Please find the attached PDF for the form submission details.</p>`,
            attachments: [
                {
                    filename: 'TourInquiry.pdf',
                    content: pdfBuffer,
                    contentType: 'application/pdf'
                }
            ]
        };

        // Send email
        await new Promise((resolve, reject) => {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Send error:', error);
                    reject(error);
                } else {
                    console.log('Email sent: %s', info.messageId);
                    resolve(info);
                }
            });
        });

        return res.status(200).json({ message: 'Form submitted and email sent successfully!' });

    } catch (error) {
        console.error('Error in /submit:', error);
        if (browser) await browser.close().catch(() => { });
        return res.status(500).json({ error: 'Server error while processing form submission' });
    }
});

module.exports = router;
