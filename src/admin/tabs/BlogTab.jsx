import React from 'react';
import { Save, Edit3, Trash2, Camera, PlusCircle, FileText } from 'lucide-react';

const BlogTab = ({
    schoolData, editingBlogId, setEditingBlogId,
    tempBlog, setTempBlog,
    addBlog, saveBlog, deleteBlog, blogImageRef,
}) => (
    <div className="animate-fade-in">
        <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 'var(--font-weight-bold)' }}>Manage Blog Posts</h2>
            <button onClick={addBlog} className="btn btn-primary">
                <PlusCircle size={18} /> Add Blog Post
            </button>
        </div>

        {editingBlogId && tempBlog && (
            <div className="card" style={{ padding: '2rem', marginBottom: '2rem', border: '2px solid var(--color-primary-100)' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
                    {editingBlogId === 'new' ? 'New Blog Post' : 'Edit Blog Post'}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
                        <div>
                            <label className="form-label">Title *</label>
                            <input type="text" className="form-input" value={tempBlog.title || ''} onChange={e => setTempBlog({ ...tempBlog, title: e.target.value })} placeholder="Enter blog title" />
                        </div>
                        <div>
                            <label className="form-label">Category</label>
                            <select className="form-input" value={tempBlog.category || 'Events'} onChange={e => setTempBlog({ ...tempBlog, category: e.target.value })}>
                                <option value="Events">Events</option>
                                <option value="Achievements">Achievements</option>
                                <option value="Campus">Campus</option>
                                <option value="Education">Education</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-3" style={{ gap: '1.5rem' }}>
                        <div>
                            <label className="form-label">Author</label>
                            <input type="text" className="form-input" value={tempBlog.author || ''} onChange={e => setTempBlog({ ...tempBlog, author: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Date</label>
                            <input type="date" className="form-input" value={tempBlog.date || ''} onChange={e => setTempBlog({ ...tempBlog, date: e.target.value })} />
                        </div>
                        <div>
                            <label className="form-label">Read Time</label>
                            <input type="text" className="form-input" value={tempBlog.read_time || ''} onChange={e => setTempBlog({ ...tempBlog, read_time: e.target.value })} placeholder="e.g., 5 min read" />
                        </div>
                    </div>
                    <div>
                        <label className="form-label">Excerpt *</label>
                        <textarea className="form-input" style={{ height: '80px' }} value={tempBlog.excerpt || ''} onChange={e => setTempBlog({ ...tempBlog, excerpt: e.target.value })} placeholder="Brief summary" />
                    </div>
                    <div>
                        <label className="form-label">Content *</label>
                        <textarea className="form-input" style={{ height: '200px' }} value={tempBlog.content || ''} onChange={e => setTempBlog({ ...tempBlog, content: e.target.value })} placeholder="Full blog post content" />
                    </div>
                    <div>
                        <label className="form-label">Cover Image</label>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {tempBlog?.image && (
                                <div style={{ width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                                    <img src={tempBlog.image} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                            )}
                            <button onClick={() => blogImageRef.current.click()} className="btn btn-sm" style={{ background: 'var(--color-primary)', color: 'white' }}>
                                <Camera size={16} /> {tempBlog?.image ? 'Change Image' : 'Upload Image'}
                            </button>
                            {tempBlog?.image && (
                                <button onClick={() => setTempBlog({ ...tempBlog, image: '' })} className="btn btn-sm" style={{ background: '#fef2f2', color: '#dc2626' }}>Remove Image</button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                        <button onClick={saveBlog} className="btn btn-success" style={{ flex: 1 }}><Save size={18} /> Save Blog Post</button>
                        <button onClick={() => { setEditingBlogId(null); setTempBlog(null); }} className="btn" style={{ background: '#f1f5f9', color: '#64748b' }}>Cancel</button>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-2" style={{ gap: '1.5rem' }}>
            {(schoolData.blogs || []).map(blog => (
                <div key={blog.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    {blog.image && (
                        <div style={{ height: '180px', width: '100%' }}>
                            <img src={blog.image} alt={blog.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    )}
                    <div style={{ padding: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: blog.category === 'Events' ? '#eff6ff' : blog.category === 'Achievements' ? '#fef3c7' : blog.category === 'Campus' ? '#ecfdf5' : '#f5f3ff', color: blog.category === 'Events' ? '#2563eb' : blog.category === 'Achievements' ? '#d97706' : blog.category === 'Campus' ? '#059669' : '#7c3aed' }}>
                                {blog.category}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{new Date(blog.date).toLocaleDateString()}</span>
                        </div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.4 }}>{blog.title}</h3>
                        <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem', lineHeight: 1.6 }}>{blog.excerpt}</p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>By {blog.author} • {blog.read_time}</div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingBlogId(blog.id); setTempBlog(blog); }} className="btn btn-sm btn-icon" style={{ background: '#eff6ff', color: '#2563eb' }}><Edit3 size={16} /></button>
                                <button onClick={() => deleteBlog(blog.id)} className="btn btn-sm btn-icon" style={{ background: '#fef2f2', color: '#dc2626' }}><Trash2 size={16} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {(schoolData.blogs || []).length === 0 && !editingBlogId && (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: '#94a3b8' }}>
                <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No blog posts yet</p>
                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Click "Add Blog Post" to create your first post</p>
            </div>
        )}
    </div>
);

export default BlogTab;
