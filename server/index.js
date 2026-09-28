import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import Expense from './models/Expense.js'

const app = express()
const port = Number(process.env.PORT || 3001)
const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pennywise'

app.use(express.json({ limit: '20kb' }))

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
})

app.get('/api/expenses', async (_request, response, next) => {
  try {
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 })
    return response.json({ expenses })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/expenses', async (request, response, next) => {
  try {
    const expense = await Expense.create({
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

app.delete('/api/expenses/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ error: 'Invalid expense id.' })
    }
    const expense = await Expense.findByIdAndDelete(request.params.id)
    if (!expense) return response.status(404).json({ error: 'Expense not found.' })
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

async function startServer() {
  await mongoose.connect(mongoUri)
  app.listen(port, '127.0.0.1', () => {
    console.log(`Expense API listening at http://127.0.0.1:${port}`)
    console.log(`MongoDB connected to ${mongoose.connection.name}`)
  })
}

startServer().catch((error) => {
  console.error(`Could not connect to MongoDB at ${mongoUri}`)
  console.error(error.message)
  process.exitCode = 1
})