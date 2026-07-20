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

    if (username.length < 3) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username must be at least 3 characters long'
      })
    }

    if (password.length < 6) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Password must be at least 6 characters long'
      })
    }

    // Check if username is already taken
    const existingUser = await db.getUserByUsername(username)
    if (existingUser) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Username is already taken'
      })
    }

    // Hash the password and save
    const passwordHash = await hashPassword(password)
    const user = await db.createUser(username, passwordHash)

    // Log the user in
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
      statusMessage: error.statusMessage || `Registration failed: ${error.message}`
    })
  }
})
