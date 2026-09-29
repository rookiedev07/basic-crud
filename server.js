import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const initialItems = [
  {
    id: '1',
    title: 'Design System Guidelines',
    description: 'Create harmonious light mode color tokens and typography scale.',
    category: 'Design',
    priority: 'High',
    status: 'Completed',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '2',
    title: 'Build Express REST API',
    description: 'Implement endpoints for items with validation and local persistence.',
    category: 'Backend',
    priority: 'High',
    status: 'Completed',
    createdAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: '3',
    title: 'Connect React Frontend',
    description: 'Synchronize client state with LocalStorage and Node backend.',
    category: 'Frontend',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: new Date().toISOString()
  },
  {
    id: '4',
    title: 'Test Offline Storage',
    description: 'Verify instant CRUD operations and seamless synchronization.',
    category: 'QA',
    priority: 'Low',
    status: 'Pending',
    createdAt: new Date().toISOString()
  }
];

const loadItems = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialItems, null, 2), 'utf-8');
      return initialItems;
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return initialItems;
  }
};

const saveItems = (items) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
  } catch (error) {
  }
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/items', (req, res) => {
  const items = loadItems();
  res.json(items);
});

app.post('/api/items', (req, res) => {
  const { title, description, category, priority, status } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const items = loadItems();
  const newItem = {
    id: Date.now().toString(),
    title: title.trim(),
    description: description ? description.trim() : '',
    category: category || 'General',
    priority: priority || 'Medium',
    status: status || 'Pending',
    createdAt: new Date().toISOString()
  };

  items.unshift(newItem);
  saveItems(items);
  res.status(201).json(newItem);
});

app.put('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, category, priority, status } = req.body;

  const items = loadItems();
  const index = items.findIndex((item) => item.id === id);

  if (index === -1) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const updatedItem = {
    ...items[index],
    title: title !== undefined ? title.trim() : items[index].title,
    description: description !== undefined ? description.trim() : items[index].description,
    category: category || items[index].category,
    priority: priority || items[index].priority,
    status: status || items[index].status,
    updatedAt: new Date().toISOString()
  };

  items[index] = updatedItem;
  saveItems(items);
  res.json(updatedItem);
});

app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const items = loadItems();
  const filtered = items.filter((item) => item.id !== id);

  if (filtered.length === items.length) {
    return res.status(404).json({ error: 'Item not found' });
  }

  saveItems(filtered);
  res.json({ success: true, id });
});

app.post('/api/items/sync', (req, res) => {
  const clientItems = req.body.items;
  if (!Array.isArray(clientItems)) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  saveItems(clientItems);
  res.json({ success: true, count: clientItems.length, items: clientItems });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
