import { db } from '../../utils/db'
import { hashPassword } from '../../utils/crypto'
import { createSession } from '../../utils/session'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    if (!body || !body.username || !body.password) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username and password are required'
      })
    }

    const username = body.username.trim()
    const password = body.password

    // Retrieve user by username
    const user = await db.getUserByUsername(username)
    if (!user) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid username or password'
      })
    }

    // Verify password hash
    const inputHash = await hashPassword(password)
    if (user.passwordHash !== inputHash) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid username or password'
      })
    }

    // Log the user in by starting session
    await createSession(event, user)

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username
      }
    }
  } catch (error: any) {
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || `Login failed: ${error.message}`
    })
  }
})
