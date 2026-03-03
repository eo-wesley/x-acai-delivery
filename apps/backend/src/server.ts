import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import healthRouter from './routes/health'
import ordersRouter from './routes/orders'
import webhookRouter from './routes/webhook'

dotenv.config()

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

app.use('/health', healthRouter)
app.use('/orders', ordersRouter)
app.use('/webhook', webhookRouter)

app.listen(port, () => {
  console.log(`🚀 Server running on port ${port}`)
})
