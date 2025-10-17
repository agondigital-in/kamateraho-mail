import express from 'express';
import { Resend } from 'resend';
import 'dotenv/config';

const app = express();
app.use(express.json());

// --- Middleware for Server-to-Server Authentication ---
const authMiddleware = (req, res, next) => {
  console.log("auth")
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header is missing.' });
  }

  const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"
  if (token !== process.env.SHARED_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Invalid or missing shared secret token.' });
  }

  next();
};

// --- Resend Client ---
const resend = new Resend(process.env.RESEND_API_KEY);

app.get('/', (req, res) => {
  res.send('Hello, this is the Resend email service!');
});
// --- Route to Send Password, protected by middleware ---
app.post('/send-password', authMiddleware, async (req, res) => {
  const { email ,Password} = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (!Password) {
    return res.status(400).json({ error: 'Password is required.' });
  }


  try {
    const { data, error } = await resend.emails.send({
      from: 'Kamateraho <support@kamateraho.com>',
      to: email,
      subject: 'Your Password is',
      html: `<p>Your Password is: <strong>${Password}</strong>.</p>
    <div>  <a href="https://kamateraho.com/reset_password.php">Go for Change PassWord</a></div>`,
    });

    if (error) {
      console.error({ error });
      return res.status(400).json({ error });
    }

    // Return the Password to the calling server
    res.status(200).json({ message: 'Password sent successfully!', Password: Password });
  } catch (e) {
    console.error('Email sending error:', e);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// --- Route to send a generic email (subject + message) ---
app.post('/send-email', authMiddleware, async (req, res) => {
  const { email, subject, message } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }
  if (!subject) {
    return res.status(400).json({ error: 'Subject is required.' });
  }
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'Kamateraho <support@kamateraho.com>',
      to: email,
      subject: subject,
      html: `<div>${message}</div>`,
    });

    if (error) {
      console.error({ error });
      return res.status(400).json({ error });
    }

    res.status(200).json({ message: 'Email sent successfully!', data });
  } catch (e) {
    console.error('Email sending error:', e);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

const server = app.listen(process.env.PORT, () => {
  console.log('Server is running on port 5000');
});

export default server;
