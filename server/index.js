import 'dotenv/config'
import bcrypt from 'bcryptjs'
import MongoStore from 'connect-mongo'
import express from 'express'
import session from 'express-session'
import { randomBytes } from 'node:crypto'
import mongoose from 'mongoose'
import Expense from './models/Expense.js'
import User from './models/User.js'

const app = express()
const port = Number(process.env.PORT || 3102)
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/expense_tracker'

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)

async function getSessionSecret() {
  const settings = mongoose.connection.collection('app_settings')
  const settingId = 'session-signing-key'
  const existing = await settings.findOne({ _id: settingId })
  if (existing?.value) return existing.value

  const value = randomBytes(48).toString('base64')
  try {
    await settings.insertOne({ _id: settingId, value, createdAt: new Date() })
    return value
  } catch (error) {
    if (error.code !== 11000) throw error
    const createdByAnotherProcess = await settings.findOne({ _id: settingId })
    if (createdByAnotherProcess?.value) return createdByAnotherProcess.value
    throw error
  }
}

function startSession(request, userId) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((regenerateError) => {
      if (regenerateError) return reject(regenerateError)
      request.session.userId = userId.toString()
      request.session.save((saveError) => saveError ? reject(saveError) : resolve())
    })
  })
}

function requireAuth(request, response, next) {
  if (!request.session.userId || !mongoose.isValidObjectId(request.session.userId)) {
    return response.status(401).json({ error: 'Not signed in.' })
  }
  request.userId = new mongoose.Types.ObjectId(request.session.userId)
  return next()
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email }
}

try {
  await mongoose.connect(mongoUri)
} catch (error) {
  console.error(`Could not connect to MongoDB at ${mongoUri}`)
  console.error(error.message)
  process.exit(1)
}

const sessionSecret = await getSessionSecret()
app.use(express.json({ limit: '20kb' }))
app.use(session({
  name: 'pennywise.sid',
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    client: mongoose.connection.getClient(),
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60,
  }),
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 14 * 24 * 60 * 60 * 1000,
  },
}))

app.get('/api/auth/session', async (request, response, next) => {
  try {
    if (!request.session.userId) return response.status(401).json({ error: 'Not signed in.' })
    const user = await User.findById(request.session.userId)
    if (!user) return response.status(401).json({ error: 'Not signed in.' })
    return response.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/register', async (request, response, next) => {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : ''
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body.password === 'string' ? request.body.password : ''
    if (name.length < 2 || name.length > 60) {
      return response.status(400).json({ error: 'Enter a name between 2 and 60 characters.' })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return response.status(400).json({ error: 'Enter a valid email address.' })
    }
    if (password.length < 8 || password.length > 128) {
      return response.status(400).json({ error: 'Use a password between 8 and 128 characters.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash })
    await startSession(request, user.id)
    return response.status(201).json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/login', async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : ''
    const password = typeof request.body.password === 'string' ? request.body.password : ''
    const user = await User.findOne({ email }).select('+passwordHash')
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: 'Email or password is incorrect.' })
    }
    await startSession(request, user.id)
    return response.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/logout', (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error)
    response.clearCookie('pennywise.sid', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    })
    return response.json({ success: true })
  })
})

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

app.get('/api/expenses', requireAuth, async (request, response, next) => {
  try {
    const expenses = await Expense.find({ userId: request.userId }).sort({ date: -1, createdAt: -1 })
    return response.json({ expenses })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/expenses', requireAuth, async (request, response, next) => {
  try {
    const expense = await Expense.create({
      userId: request.userId,
      merchant: request.body.merchant,
      category: request.body.category,
      amount: request.body.amount,
      date: request.body.date,
      note: request.body.note || '',
    })
    return response.status(201).json({ expense })
  } catch (error) {
    return next(error)
  }
})

app.delete('/api/expenses/:id', requireAuth, async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid expense id.' })
    }
    const result = await Expense.deleteOne({ _id: request.params.id, userId: request.userId })
    if (!result.deletedCount) return response.status(404).json({ error: 'Expense not found.' })
    return response.json({ success: true })
  } catch (error) {
    return next(error)
  }
})

app.use('/api', (_request, response) => response.status(404).json({ error: 'API route not found.' }))

app.use((error, _request, response, _next) => {
  if (error.name === 'ValidationError' || error.name === 'CastError' || error instanceof SyntaxError) {
    return response.status(400).json({ error: error.message || 'Please check the submitted information.' })
  }
  console.error(error)
  return response.status(500).json({ error: 'Server error. Check the API and MongoDB logs.' })
})

app.listen(port, '127.0.0.1', () => {
  console.log(`Expense API listening at http://127.0.0.1:${port}`)
  console.log(`MongoDB connected to ${mongoose.connection.name}`)
})