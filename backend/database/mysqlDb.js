const { pool } = require('./dbConfig');

class MysqlDatabase {
  // We'll keep the basic interface identical for compatibility, 
  // but now operations return Promises because of mysql2/promise.
  // The route files will need to be updated to async/await anyway.

  async findAll(collection) {
    const [rows] = await pool.query(`SELECT * FROM ${collection}`);
    return rows;
  }

  async findById(collection, id) {
    const [rows] = await pool.query(`SELECT * FROM ${collection} WHERE id = ?`, [id]);
    return rows.length > 0 ? rows[0] : null;
  }

  async findOne(collection, queryObj) {
    // queryObj allows { key: value } matching for simple lookups
    const keys = Object.keys(queryObj);
    if (keys.length === 0) return null;
    
    const conditions = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => queryObj[k]);
    
    const [rows] = await pool.query(`SELECT * FROM ${collection} WHERE ${conditions} LIMIT 1`, values);
    return rows.length > 0 ? rows[0] : null;
  }

  async insert(collection, doc) {
    const [result] = await pool.query(`INSERT INTO ${collection} SET ?`, doc);
    return this.findById(collection, result.insertId);
  }

  async update(collection, id, updates) {
    await pool.query(`UPDATE ${collection} SET ? WHERE id = ?`, [updates, id]);
    return this.findById(collection, id);
  }

  async delete(collection, id) {
    const [result] = await pool.query(`DELETE FROM ${collection} WHERE id = ?`, [id]);
    return result.affectedRows > 0;
  }
}

module.exports = new MysqlDatabase();
