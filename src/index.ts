import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { Resend } from 'resend';
import 'dotenv/config'

const app = new Hono()

// --- Resend Client ---
const resend = new Resend(process.env.RESEND_API_KEY);

// --- Middleware for Server-to-Server Authentication ---
const authMiddleware = async (c, next) => {
  const authHeader = c.req.header('authorization');
  if (!authHeader) {
    return c.json({ error: 'Authorization header is missing.' }, 401);
  }

  const token = authHeader.split(' ')[1]; // Expecting "Bearer <token>"
  if (token !== process.env.SHARED_SECRET_TOKEN) {
    return c.json({ error: 'Invalid or missing shared secret token.' }, 403);
  }

  await next();
};

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

// --- Route to Send Password, protected by middleware ---
const schema = z.object({
  email: z.string().email(),
  Password: z.string(),
})

app.post('/send-password', authMiddleware, zValidator('json', schema), async (c) => {
  const { email, Password } = c.req.valid('json')

  try {
    const { data, error } = await resend.emails.send({
      from: 'Kamateraho <support@kamateraho.com>',
      to: email,
      subject: 'Your Password is',
      html: `<p>Your Password is: <strong>${Password}</strong>.</p>`
    });

    if (error) {
      console.error({ error });
      return c.json({ error }, 400);
    }

    // Return the Password to the calling server
    return c.json({ message: 'Password sent successfully!', Password: Password }, 200);
  } catch (e) {
    console.error('Email sending error:', e);
    return c.json({ error: 'An internal server error occurred.' }, 500);
  }
})


serve({
  fetch: app.fetch,
  port: Number(process.env.PORT) || 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
