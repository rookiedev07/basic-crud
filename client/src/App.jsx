import { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FolderKanban, 
  HardDrive, 
  Server, 
  X,
  RefreshCw
} from 'lucide-react';

const STORAGE_KEY = 'taskflow_items_storage';

const initialFallbackItems = [
  {
    id: '1',
    title: 'Design System Guidelines',
    description: 'Create harmonious light mode color tokens and typography scale.',
    category: 'Design',
    priority: 'High',
    status: 'Completed',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Build Express REST API',
    description: 'Implement endpoints for items with validation and local persistence.',
    category: 'Backend',
    priority: 'High',
    status: 'Completed',
    createdAt: new Date().toISOString()
  },
  {
    id: '3',
    title: 'Connect React Frontend',
    description: 'Synchronize client state with LocalStorage and Node backend.',
    category: 'Frontend',
    priority: 'Medium',
    status: 'In Progress',
    createdAt: new Date().toISOString()
  }
];

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isServerOnline, setIsServerOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'General',
    priority: 'Medium',
    status: 'Pending'
  });

  const getLocalItems = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  };

  const setLocalItems = (newItems) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    } catch {
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
        setLocalItems(data);
        setIsServerOnline(true);
      } else {
        throw new Error();
      }
    } catch {
      setIsServerOnline(false);
      const local = getLocalItems();
      if (local && local.length > 0) {
        setItems(local);
      } else {
        setItems(initialFallbackItems);
        setLocalItems(initialFallbackItems);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setFormData({
      title: '',
      description: '',
      category: 'General',
      priority: 'Medium',
      status: 'Pending'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      category: item.category,
      priority: item.priority,
      status: item.status
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    if (editingItem) {
      const updatedItem = {
        ...editingItem,
        ...formData,
        updatedAt: new Date().toISOString()
      };

      let updatedList = items.map((item) => (item.id === editingItem.id ? updatedItem : item));
      setItems(updatedList);
      setLocalItems(updatedList);
      closeModal();

      if (isServerOnline) {
        try {
          const res = await fetch(`/api/items/${editingItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (res.ok) {
            const data = await res.json();
            setItems((prev) => prev.map((item) => (item.id === data.id ? data : item)));
          }
        } catch {
          setIsServerOnline(false);
        }
      }
    } else {
      const newItem = {
        id: Date.now().toString(),
        ...formData,
        createdAt: new Date().toISOString()
      };

      const updatedList = [newItem, ...items];
      setItems(updatedList);
      setLocalItems(updatedList);
      closeModal();

      if (isServerOnline) {
        try {
          const res = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
          });
          if (res.ok) {
            const serverItem = await res.json();
            setItems((prev) => [serverItem, ...prev.filter((i) => i.id !== newItem.id)]);
            setLocalItems([serverItem, ...items]);
          }
        } catch {
          setIsServerOnline(false);
        }
      }
    }
  };

  const handleDelete = async (id) => {
    const updatedList = items.filter((item) => item.id !== id);
    setItems(updatedList);
    setLocalItems(updatedList);

    if (isServerOnline) {
      try {
        await fetch(`/api/items/${id}`, { method: 'DELETE' });
      } catch {
        setIsServerOnline(false);
      }
    }
  };

  const handleToggleComplete = async (item) => {
    const newStatus = item.status === 'Completed' ? 'Pending' : 'Completed';
    const updatedItem = { ...item, status: newStatus, updatedAt: new Date().toISOString() };
    const updatedList = items.map((i) => (i.id === item.id ? updatedItem : i));
    
    setItems(updatedList);
    setLocalItems(updatedList);

    if (isServerOnline) {
      try {
        await fetch(`/api/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        });
      } catch {
        setIsServerOnline(false);
      }
    }
  };

  const handleSyncWithServer = async () => {
    try {
      const res = await fetch('/api/items/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (res.ok) {
        setIsServerOnline(true);
        fetchItems();
      }
    } catch {
      setIsServerOnline(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalCount = items.length;
  const completedCount = items.filter((i) => i.status === 'Completed').length;
  const inProgressCount = items.filter((i) => i.status === 'In Progress').length;
  const pendingCount = items.filter((i) => i.status === 'Pending').length;

  const categories = ['All', 'General', 'Design', 'Backend', 'Frontend', 'QA'];
  const statuses = ['All', 'Pending', 'In Progress', 'Completed'];

  return (
    <div className="app-container">
      <header className="header">
        <div className="brand-wrapper">
          <div className="logo-icon">
            <FolderKanban size={24} />
          </div>
          <div>
            <h1 className="brand-title">TaskFlow</h1>
            <p className="brand-subtitle">Local Storage + Express + React + Node CRUD</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-secondary" onClick={handleSyncWithServer} title="Sync data between LocalStorage and Server">
            <RefreshCw size={16} />
            <span>Sync</span>
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} />
            <span>New Item</span>
          </button>
        </div>
      </header>

      <div className="storage-bar">
        <div className="storage-info">
          <span className="storage-pill">
            <HardDrive size={14} />
            LocalStorage Active
          </span>
          <span className={`storage-pill ${isServerOnline ? '' : 'offline'}`}>
            <Server size={14} />
            {isServerOnline ? 'Express Server Online' : 'Offline / Standalone Mode'}
          </span>
        </div>
        <div className="sync-badge">
          <span className="sync-dot" style={{ backgroundColor: isServerOnline ? '#10b981' : '#f59e0b' }}></span>
          <span>{isServerOnline ? 'Synced' : 'Saved Locally'}</span>
        </div>
      </div>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#eef2ff', color: '#4f46e5' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <div className="stat-value">{totalCount}</div>
            <div className="stat-label">Total Items</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#ecfdf5', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-value">{inProgressCount}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div className="stat-value">{pendingCount}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search items by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                Status: {status}
              </option>
            ))}
          </select>

          <select
            className="filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                Category: {cat}
              </option>
            ))}
          </select>
        </div>
      </section>

      {loading ? (
        <div className="empty-state">
          <div className="stat-label">Loading items...</div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <FolderKanban className="empty-icon" />
          <h2 className="empty-title">No items found</h2>
          <p className="empty-desc">
            {searchQuery || statusFilter !== 'All' || categoryFilter !== 'All'
              ? 'Try adjusting your search query or filters to find what you are looking for.'
              : 'Your workspace is empty. Create your first item to get started!'}
          </p>
          <button className="btn-primary" onClick={openCreateModal} style={{ margin: '0 auto' }}>
            <Plus size={18} />
            <span>Create Item</span>
          </button>
        </div>
      ) : (
        <main className="items-grid">
          {filteredItems.map((item) => {
            const statusClass = item.status.toLowerCase().replace(' ', '-');
            const priorityClass = item.priority.toLowerCase();

            return (
              <div key={item.id} className="item-card">
                <div>
                  <div className="item-card-header">
                    <h2 className="item-title">{item.title}</h2>
                    <button
                      className="action-btn"
                      onClick={() => handleToggleComplete(item)}
                      title={item.status === 'Completed' ? 'Mark Incomplete' : 'Mark Completed'}
                    >
                      <CheckCircle2
                        size={20}
                        color={item.status === 'Completed' ? '#10b981' : '#cbd5e1'}
                      />
                    </button>
                  </div>

                  <div className="item-card-badges" style={{ marginBottom: '12px' }}>
                    <span className="badge badge-category">{item.category}</span>
                    <span className={`badge badge-status-${statusClass}`}>{item.status}</span>
                    <span className={`badge badge-priority-${priorityClass}`}>{item.priority}</span>
                  </div>

                  <p className="item-description">{item.description || 'No description provided.'}</p>
                </div>

                <div className="item-footer">
                  <span className="item-date">
                    {new Date(item.createdAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>

                  <div className="item-actions">
                    <button
                      className="action-btn btn-edit"
                      onClick={() => openEditModal(item)}
                      title="Edit"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="action-btn btn-delete"
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </main>
      )}

      {isModalOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingItem ? 'Edit Item' : 'Create New Item'}</h2>
              <button className="modal-close" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <form className="modal-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Title *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  placeholder="e.g. Implement user authentication"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="General">General</option>
                    <option value="Design">Design</option>
                    <option value="Backend">Backend</option>
                    <option value="Frontend">Frontend</option>
                    <option value="QA">QA</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    className="form-select"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  placeholder="Provide more context or notes for this item..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
