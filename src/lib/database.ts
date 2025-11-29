import Database from '@tauri-apps/plugin-sql'

let db: Database | null = null

/**
 * Lazy-load database connection (only works in Tauri/client environment)
 */
async function getDb(): Promise<Database> {
  if (db) return db
  db = await Database.load('sqlite:timers.db')
  return db
}

/**
 * Generic database service for CRUD operations
 */
export class DbService<T = unknown> {
  constructor(
    private tableName: string,
    private primaryKey: string = 'uuid',
    private db?: Database
  ) {}

  private async getConnection(): Promise<Database> {
    return getDb()
  }

  /**
   * Fetch all records with optional ordering
   */
  async findAll(orderBy?: string): Promise<T[]> {
    try {
      if (!this.db) throw 'db not initialised'
      const query = `SELECT * FROM ${this.tableName}${orderBy ? ` ORDER BY ${orderBy}` : ''}`
      return await this.db.select<T[]>(query)
    } catch (err) {
      console.error(`Failed to fetch from ${this.tableName}:`, err)
      throw new Error(`Failed to fetch records from ${this.tableName}`)
    }
  }

  /**
   * Find a single record by primary key
   */
  async findById(id: string | number, field?: string): Promise<T | undefined> {
    try {
      if (!this.db) throw 'db not initialised'
      const results = await this.db.select<T[]>(
        `SELECT * FROM ${this.tableName} WHERE ${field ? field : this.primaryKey} = $1`,
        [id]
      )
      return results.length ? results[0] : undefined
    } catch (err) {
      console.error(`Failed to fetch from ${this.tableName}:`, err)
      throw new Error(`Failed to fetch record from ${this.tableName}`)
    }
  }

  /**
   * Find records matching conditions
   */
  async findWhere(conditions: Partial<T>): Promise<T[]> {
    try {
      if (!this.db) throw 'db not initialised'
      const keys = Object.keys(conditions)
      const whereClauses = keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ')
      const values = Object.values(conditions)

      const query = `SELECT * FROM ${this.tableName} WHERE ${whereClauses}`
      return await this.db.select<T[]>(query, values)
    } catch (err) {
      console.error(`Failed to query ${this.tableName}:`, err)
      throw new Error(`Failed to query records from ${this.tableName}`)
    }
  }

  /**
   * Create a new record
   */
  async create(data: Omit<T, typeof this.primaryKey>): Promise<T> {
    try {
      if (!this.db) throw 'db not initialised'
      const keys = Object.keys(data)
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
      const values = Object.values(data)

      const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders})`
      const result = await this.db.execute(query, values)

      // Fetch the created record
      const createdRecord = await this.findById(
        result.lastInsertId as number,
        'id'
      )
      if (!createdRecord) {
        throw new Error('Failed to fetch created record')
      }
      return createdRecord
    } catch (err) {
      console.error(`Failed to create in ${this.tableName}:`, err)
      throw new Error(`Failed to create record in ${this.tableName}`)
    }
  }

  /**
   * Update a record by primary key
   */
  async update(id: string | number, data: Partial<T>): Promise<T> {
    try {
      if (!this.db) throw 'db not initialised'
      const keys = Object.keys(data)
      const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ')
      const values = [...Object.values(data), id]

      const query = `UPDATE ${this.tableName} SET ${setClauses} WHERE ${this.primaryKey} = $${keys.length + 1}`
      await this.db.execute(query, values)

      // Fetch the updated record
      const updatedRecord = await this.findById(id)
      if (!updatedRecord) {
        throw new Error('Failed to fetch updated record')
      }
      return updatedRecord
    } catch (err) {
      if (!this.db) throw 'db not initialised'
      console.error(`Failed to update ${this.tableName}:`, err)
      throw new Error(`Failed to update record in ${this.tableName}`)
    }
  }

  /**
   * Update records matching conditions
   */
  async updateWhere(
    conditions: Partial<T>,
    updates: Partial<T>
  ): Promise<number> {
    try {
      if (!this.db) throw 'db not initialised'
      const updateKeys = Object.keys(updates)
      const conditionKeys = Object.keys(conditions)

      const setClauses = updateKeys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(', ')
      const whereClauses = conditionKeys
        .map((key, i) => `${key} = $${updateKeys.length + i + 1}`)
        .join(' AND ')

      const values = [...Object.values(updates), ...Object.values(conditions)]

      const query = `UPDATE ${this.tableName} SET ${setClauses} WHERE ${whereClauses}`
      const result = await this.db.execute(query, values)

      return result.rowsAffected
    } catch (err) {
      console.error(`Failed to update ${this.tableName}:`, err)
      throw new Error(`Failed to update records in ${this.tableName}`)
    }
  }

  /**
   * Delete a record by primary key
   */
  async delete(id: string | number): Promise<void> {
    try {
      if (!this.db) throw 'db not initialised'
      await this.db.execute(
        `DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = $1`,
        [id]
      )
    } catch (err) {
      console.error(`Failed to delete from ${this.tableName}:`, err)
      throw new Error(`Failed to delete record from ${this.tableName}`)
    }
  }

  /**
   * Delete records matching conditions
   */
  async deleteWhere(conditions: Partial<T>): Promise<number> {
    try {
      if (!this.db) throw 'db not initialised'
      const keys = Object.keys(conditions)
      const whereClauses = keys
        .map((key, i) => `${key} = $${i + 1}`)
        .join(' AND ')
      const values = Object.values(conditions)

      const query = `DELETE FROM ${this.tableName} WHERE ${whereClauses}`
      const result = await this.db.execute(query, values)

      return result.rowsAffected
    } catch (err) {
      console.error(`Failed to delete from ${this.tableName}:`, err)
      throw new Error(`Failed to delete records from ${this.tableName}`)
    }
  }

  /**
   * Upsert (insert or update) a record
   * If a record with the primary key exists, it updates; otherwise inserts
   */
  async upsert(data: Partial<T> & Record<string, string | number>): Promise<T> {
    try {
      if (!this.db) throw 'db not initialised'
      const keys = Object.keys(data)
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ')
      const values = Object.values(data)

      // Create the excluded columns for the UPDATE part
      const updateClauses = keys
        .filter((key) => key !== this.primaryKey) // Don't update the primary key
        .map((key) => `${key} = EXCLUDED.${key}`)
        .join(', ')

      const query = `INSERT INTO ${this.tableName} (${keys.join(', ')}) VALUES (${placeholders}) ON CONFLICT(${this.primaryKey}) DO UPDATE SET ${updateClauses}`

      await this.db.execute(query, values)

      // Fetch the upserted record
      const primaryKeyValue = data[this.primaryKey]
      const upsertedRecord = await this.findById(primaryKeyValue)
      if (!upsertedRecord) {
        throw new Error('Failed to fetch upserted record')
      }
      return upsertedRecord
    } catch (err) {
      console.error(`Failed to upsert in ${this.tableName}:`, err)
      throw new Error(`Failed to upsert record in ${this.tableName}`)
    }
  }

  /**
   * Execute raw SQL query
   */
  async raw(query: string, params?: string[]): Promise<unknown> {
    try {
      if (!this.db) throw 'db not initialised'
      return await this.db.select(query, params)
    } catch (err) {
      console.error('Failed to execute raw query:', err)
      throw new Error('Failed to execute database query')
    }
  }
}
