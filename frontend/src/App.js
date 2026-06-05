import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

const styles = {
  body: { fontFamily: 'monospace', background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', padding: '2rem' },
  h1: { color: '#38bdf8', fontSize: '2rem', marginBottom: '1.5rem' },
  card: { background: '#1e293b', borderRadius: '8px', padding: '1.5rem', marginBottom: '1rem' },
  input: { background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', padding: '0.5rem 0.75rem', borderRadius: '4px', width: '100%', marginBottom: '0.5rem', fontFamily: 'monospace' },
  btn: { padding: '0.5rem 1rem', borderRadius: '4px', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontWeight: 'bold', marginRight: '0.5rem' },
  btnPrimary: { background: '#38bdf8', color: '#0f172a' },
  btnDanger: { background: '#f43f5e', color: '#fff' },
  btnWarning: { background: '#fb923c', color: '#0f172a' },
  btnSecondary: { background: '#334155', color: '#e2e8f0' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: (active) => ({ background: active ? '#22c55e' : '#64748b', color: '#fff', borderRadius: '999px', padding: '2px 10px', fontSize: '0.75rem' }),
  error: { color: '#f43f5e', marginBottom: '1rem' },
};

export default function App() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', is_active: true });
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');

  const fetchItems = async () => {
    try {
      const res = await fetch(`${API}/items/`);
      const data = await res.json();
      setItems(data);
    } catch {
      setError('Cannot connect to backend');
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError('Title is required'); return; }
    setError('');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `${API}/items/${editId}` : `${API}/items/`;
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ title: '', description: '', is_active: true });
    setEditId(null);
    fetchItems();
  };

  const handleEdit = (item) => {
    setEditId(item.id);
    setForm({ title: item.title, description: item.description, is_active: item.is_active });
  };

  const handleDelete = async (id) => {
    await fetch(`${API}/items/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const handleCancel = () => {
    setEditId(null);
    setForm({ title: '', description: '', is_active: true });
    setError('');
  };

  return (
    <div style={styles.body}>
      <h1 style={styles.h1}>📋 CRUD App</h1>
      <div style={styles.card}>
        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#94a3b8' }}>
          {editId ? '✏️ Edit Item' : '➕ New Item'}
        </h2>
        {error && <div style={styles.error}>{error}</div>}
        <input
          style={styles.input}
          placeholder="Title *"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Description"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={e => setForm({ ...form, is_active: e.target.checked })}
          />
          Active
        </label>
        <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={handleSubmit}>
          {editId ? 'Update' : 'Create'}
        </button>
        {editId && (
          <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={handleCancel}>
            Cancel
          </button>
        )}
      </div>
      <h2 style={{ color: '#94a3b8' }}>Items ({items.length})</h2>
      {items.length === 0 && <p style={{ color: '#64748b' }}>No items yet. Create one above!</p>}
      {items.map(item => (
        <div key={item.id} style={styles.card}>
          <div style={styles.row}>
            <div>
              <strong style={{ color: '#f1f5f9', fontSize: '1.1rem' }}>{item.title}</strong>
              <span style={{ ...styles.badge(item.is_active), marginLeft: '0.75rem' }}>
                {item.is_active ? 'active' : 'inactive'}
              </span>
              {item.description && <p style={{ color: '#94a3b8', margin: '0.25rem 0 0' }}>{item.description}</p>}
            </div>
            <div>
              <button style={{ ...styles.btn, ...styles.btnWarning }} onClick={() => handleEdit(item)}>Edit</button>
              <button style={{ ...styles.btn, ...styles.btnDanger }} onClick={() => handleDelete(item.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
