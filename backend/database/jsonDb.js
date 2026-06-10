const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');

class JsonDatabase {
  constructor() {
    this.data = {};
    this.init();
  }

  init() {
    // Ensure directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Define files and initial seed data
    const schemas = {
      users: () => [
        {
          id: 1,
          username: 'admin',
          password_hash: bcrypt.hashSync('admin123', 10),
          full_name: 'Dorado Admin',
          role: 'admin',
          status: 'active'
        },
        {
          id: 2,
          username: 'cashier',
          password_hash: bcrypt.hashSync('cashier123', 10),
          full_name: 'Sadun Perera',
          role: 'cashier',
          status: 'active'
        }
      ],
      products: () => [
        {
          id: 1,
          barcode: '8901234567890',
          name: 'Classic Cappuccino',
          category: 'Beverages',
          price: 450.00,
          cost_price: 280.00,
          stock_quantity: 48,
          low_stock_threshold: 10,
          image_url: ''
        },
        {
          id: 2,
          barcode: '8901234567891',
          name: 'Chocolate Fudge Cake',
          category: 'Desserts',
          price: 550.00,
          cost_price: 320.00,
          stock_quantity: 15,
          low_stock_threshold: 5,
          image_url: ''
        },
        {
          id: 3,
          barcode: '8901234567892',
          name: 'Crispy Chicken Burger',
          category: 'Mains',
          price: 780.00,
          cost_price: 480.00,
          stock_quantity: 22,
          low_stock_threshold: 8,
          image_url: ''
        },
        {
          id: 4,
          barcode: '8901234567893',
          name: 'Iced Latte',
          category: 'Beverages',
          price: 420.00,
          cost_price: 240.00,
          stock_quantity: 50,
          low_stock_threshold: 12,
          image_url: ''
        },
        {
          id: 5,
          barcode: '8901234567894',
          name: 'Garlic Bread (4pcs)',
          category: 'Sides',
          price: 290.00,
          cost_price: 150.00,
          stock_quantity: 35,
          low_stock_threshold: 10,
          image_url: ''
        }
      ],
      sales: () => [],
      shifts: () => [],
      grns: () => []
    };

    // Load or create each database file
    for (const [collection, getSeedData] of Object.entries(schemas)) {
      const filePath = path.join(DATA_DIR, `${collection}.json`);
      if (!fs.existsSync(filePath)) {
        const seedData = getSeedData();
        fs.writeFileSync(filePath, JSON.stringify(seedData, null, 2), 'utf8');
        this.data[collection] = seedData;
      } else {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          this.data[collection] = JSON.parse(content);
        } catch (error) {
          console.error(`Error loading database file ${collection}.json:`, error);
          this.data[collection] = [];
        }
      }
    }
  }

  save(collection) {
    const filePath = path.join(DATA_DIR, `${collection}.json`);
    const tempPath = `${filePath}.tmp`;
    try {
      // Transactional-style write to a temporary file first, then rename to guarantee integrity
      fs.writeFileSync(tempPath, JSON.stringify(this.data[collection], null, 2), 'utf8');
      fs.renameSync(tempPath, filePath);
      return true;
    } catch (error) {
      console.error(`CRITICAL: Error writing collection ${collection} to disk:`, error);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      return false;
    }
  }

  findAll(collection) {
    return this.data[collection] || [];
  }

  findById(collection, id) {
    const items = this.findAll(collection);
    return items.find(item => item.id === Number(id));
  }

  findOne(collection, filterFunc) {
    const items = this.findAll(collection);
    return items.find(filterFunc);
  }

  insert(collection, doc) {
    if (!this.data[collection]) {
      this.data[collection] = [];
    }
    const items = this.data[collection];
    const maxId = items.reduce((max, item) => (item.id > max ? item.id : max), 0);
    const newDoc = { id: maxId + 1, ...doc };
    items.push(newDoc);
    this.save(collection);
    return newDoc;
  }

  update(collection, id, updates) {
    if (!this.data[collection]) return null;
    const items = this.data[collection];
    const index = items.findIndex(item => item.id === Number(id));
    if (index === -1) return null;

    // Merge updates while maintaining ID
    items[index] = { ...items[index], ...updates, id: Number(id) };
    this.save(collection);
    return items[index];
  }

  delete(collection, id) {
    if (!this.data[collection]) return false;
    const items = this.data[collection];
    const initialLength = items.length;
    this.data[collection] = items.filter(item => item.id !== Number(id));
    if (this.data[collection].length < initialLength) {
      this.save(collection);
      return true;
    }
    return false;
  }
}

module.exports = new JsonDatabase();
