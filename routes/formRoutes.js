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
    try {
        const {
            fullName,
            mobileNumber,
            email,
            departureCity,
            location,
            numberOfPersons,
            dateOfBirth,
            numberOfDays,
            description
        } = req.body;

        // Basic validation
        if (!fullName || !mobileNumber) {
            return res.status(400).json({ error: 'Required fields are missing' });
        }

        // Create HTML content for PDF
        const htmlContent = `
            <h2>New Tour Inquiry</h2>
            <p><strong>Full Name:</strong> ${fullName}</p>
            <p><strong>Mobile Number:</strong> ${mobileNumber}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Departure City:</strong> ${departureCity}</p>
            <p><strong>Location:</strong> ${location}</p>
            <p><strong>Number of Persons:</strong> ${numberOfPersons}</p>
            <p><strong>Date of Birth:</strong> ${dateOfBirth}</p>
            <p><strong>Number of Days:</strong> ${numberOfDays}</p>
            <p><strong>Description:</strong> ${description}</p>
        `;

        // Generate PDF from HTML using Puppeteer
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setContent(htmlContent);
        const pdfBuffer = await page.pdf({ format: 'A4' });
        await browser.close();

        // Compose email
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.EMAIL_USER, // Or any other recipient
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
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Send error:', error);
                return res.status(500).json({ error: 'Failed to send email' });
            }

            console.log('Email sent: %s', info.messageId);
            return res.status(200).json({ message: 'Form submitted and email sent successfully!' });
        });

    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Server error while processing form submission' });
    }
});

module.exports = router;
