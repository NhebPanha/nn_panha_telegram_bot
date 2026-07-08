import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const bots = await db.getBots()
    return bots.map(b => ({
      id: b.id,
      username: b.username,
      firstName: b.firstName,
      active: b.active,
      permissions: b.permissions,
      status: b.status,
      createdAt: b.createdAt
    }))
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch bots: ${error.message}`
    })
  }
})
