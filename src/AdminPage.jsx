import { useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { T } from './theme.js';
import SponsoredCard from './SponsoredCard.jsx';
import { ArrowLeft, Plus, Pencil, Trash2, X } from 'lucide-react';
import { KinwoveStar } from './components/brand/KinwoveStar.jsx';

const EMPTY_FORM = {
  sponsor_name: '',
  title: '',
  body: '',
  cta_text: '',
  cta_url: '',
  emoji: '✦',
  is_active: false,
  sort_order: 0,
};

export default function AdminPage({ onBack }) {
  const [tab, setTab] = useState('sponsors');
  const [sponsors, setSponsors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { loadSponsors(); }, []);

  async function loadSponsors() {
    setLoading(true);
    const { data } = await supabase
      .from('sponsored_posts')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    setSponsors(data ?? []);
    setLoading(false);
  }

  async function toggleActive(id, current) {
    await supabase.from('sponsored_posts').update({ is_active: !current }).eq('id', id);
    setSponsors((s) => s.map((x) => x.id === id ? { ...x, is_active: !current } : x));
  }

  async function deleteSponsor(id, name) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    await supabase.from('sponsored_posts').delete().eq('id', id);
    setSponsors((s) => s.filter((x) => x.id !== id));
  }

  async function saveSponsor() {
    if (!form.sponsor_name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const { error: err } = await supabase
          .from('sponsored_posts')
          .update(form)
          .eq('id', editingId);
        if (err) throw err;
        setSponsors((s) => s.map((x) => x.id === editingId ? { ...x, ...form } : x));
      } else {
        const { data, error: err } = await supabase
          .from('sponsored_posts')
          .insert(form)
          .select()
          .single();
        if (err) throw err;
        if (data) setSponsors((s) => [...s, data]);
      }
      closeForm();
    } catch (e) {
      setError(e.message ?? 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  function openNew() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setError(null);
    setFormOpen(true);
  }

  function openEdit(sponsor) {
    setForm({
      sponsor_name: sponsor.sponsor_name ?? '',
      title: sponsor.title ?? '',
      body: sponsor.body ?? '',
      cta_text: sponsor.cta_text ?? '',
      cta_url: sponsor.cta_url ?? '',
      emoji: sponsor.emoji ?? '✦',
      is_active: sponsor.is_active ?? false,
      sort_order: sponsor.sort_order ?? 0,
    });
    setEditingId(sponsor.id);
    setError(null);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  }

  const liveSponsorCount = sponsors.filter((s) => s.is_active).length;

  return (
    <div style={{ minHeight: '100vh', background: T.cream, fontFamily: T.sans, paddingBottom: 80 }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: T.white, borderBottom: `1px solid ${T.line}`,
        padding: '14px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 0, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ flex: 1, fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <KinwoveStar size={16} style={{ flexShrink: 0 }} /> kinwove — Admin
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${T.line}`, background: T.white, paddingLeft: 16 }}>
        {[{ id: 'sponsors', label: 'Sponsors' }].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '12px 16px', fontSize: 13, fontWeight: 600,
              color: tab === id ? T.goldDark : T.inkSoft,
              borderBottom: tab === id ? `2px solid ${T.goldDark}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Sponsors tab ────────────────────────────────────────────────── */}
      {tab === 'sponsors' && (
        <div style={{ padding: '24px 20px', maxWidth: 640, margin: '0 auto' }}>

          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
            <div>
              <div style={{ fontFamily: T.display, fontSize: 16, fontWeight: 600, color: T.ink }}>
                Sponsored cards
              </div>
              <div style={{ fontSize: 12, color: T.inkMuted, marginTop: 3, lineHeight: 1.5 }}>
                {liveSponsorCount > 0
                  ? `${liveSponsorCount} live — shown in feed after every 10 posts (free users only).`
                  : 'No live sponsors yet — cards are hidden from the feed until you activate one.'}
              </div>
            </div>
            <button
              onClick={openNew}
              style={{
                background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '9px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                flexShrink: 0,
              }}
            >
              <Plus size={14} /> Add
            </button>
          </div>

          {/* Sponsor list */}
          {loading ? (
            <div style={{ color: T.inkMuted, textAlign: 'center', padding: 48, fontFamily: T.serif }}>
              Loading…
            </div>
          ) : sponsors.length === 0 ? (
            <div style={{
              background: T.white, border: `1px dashed ${T.line}`, borderRadius: 14,
              padding: '36px 20px', textAlign: 'center',
              color: T.inkMuted, fontFamily: T.serif, fontStyle: 'italic',
            }}>
              No sponsors yet.
              <br />
              <span style={{ fontSize: 13 }}>Add one above once you've made a deal.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sponsors.map((s) => (
                <div key={s.id} style={{
                  background: T.white, border: `1px solid ${T.line}`,
                  borderRadius: 12, padding: '13px 14px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: s.is_active ? 1 : 0.55,
                  transition: 'opacity 0.15s',
                }}>
                  {/* Emoji */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: T.parchment,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {s.emoji ?? <KinwoveStar size={18} />}
                  </div>

                  {/* Name + title */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{s.sponsor_name}</div>
                    {s.title && (
                      <div style={{
                        fontSize: 12, color: T.inkMuted, marginTop: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {s.title}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => toggleActive(s.id, s.is_active)}
                      style={{
                        background: s.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                        border: `1px solid ${s.is_active ? 'rgba(34,197,94,0.35)' : T.line}`,
                        borderRadius: 999, padding: '4px 11px',
                        fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
                        color: s.is_active ? '#16a34a' : T.inkMuted,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {s.is_active ? 'LIVE' : 'OFF'}
                    </button>
                    <button
                      onClick={() => openEdit(s)}
                      title="Edit"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 5, display: 'flex', borderRadius: 6 }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteSponsor(s.id, s.sponsor_name)}
                      title="Delete"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.error, padding: 5, display: 'flex', borderRadius: 6 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit bottom sheet ──────────────────────────────────────── */}
      {formOpen && (
        <div
          onClick={closeForm}
          style={{ position: 'fixed', inset: 0, background: 'rgba(44,24,16,0.52)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxHeight: '92vh', overflowY: 'auto',
              background: T.cream, borderRadius: '20px 20px 0 0',
              padding: '24px 20px 48px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Sheet header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
              <div style={{ fontFamily: T.display, fontSize: 18, fontWeight: 600, color: T.ink }}>
                {editingId ? 'Edit sponsor' : 'Add sponsor'}
              </div>
              <button onClick={closeForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.inkSoft, padding: 4, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {/* Fields */}
            {[
              { key: 'sponsor_name', label: 'Sponsor name *', placeholder: 'e.g. Crossway Books', required: true },
              { key: 'title',        label: 'Title',           placeholder: 'e.g. Deepen your study with the ESV Study Bible' },
              { key: 'body',         label: 'Body text',       placeholder: 'Short description of the offer…', multiline: true },
              { key: 'cta_text',     label: 'Button label',    placeholder: 'e.g. Shop now' },
              { key: 'cta_url',      label: 'Button URL',      placeholder: 'https://…' },
              { key: 'emoji',        label: 'Emoji / icon',    placeholder: '✦' },
            ].map(({ key, label, placeholder, multiline }) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5, letterSpacing: 0.2 }}>
                  {label}
                </label>
                {multiline ? (
                  <textarea
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    rows={3}
                    style={{
                      width: '100%', border: `1px solid ${T.line}`, borderRadius: 10,
                      padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink,
                      fontFamily: T.sans, resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', border: `1px solid ${T.line}`, borderRadius: 10,
                      padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink,
                      fontFamily: T.sans, boxSizing: 'border-box', outline: 'none',
                    }}
                  />
                )}
              </div>
            ))}

            {/* Sort order */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.inkSoft, marginBottom: 5 }}>
                Sort order (lower = first in rotation)
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                style={{
                  width: 100, border: `1px solid ${T.line}`, borderRadius: 10,
                  padding: '10px 12px', fontSize: 14, background: T.white, color: T.ink,
                  fontFamily: T.sans, outline: 'none',
                }}
              />
            </div>

            {/* Active toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22,
              cursor: 'pointer',
            }}>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 14, color: T.ink }}>
                Make live immediately <span style={{ color: T.inkMuted }}>(shows in feed for free users)</span>
              </span>
            </label>

            {/* Live preview */}
            {(form.sponsor_name || form.title) && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: T.inkMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                  Preview
                </div>
                <SponsoredCard {...form} />
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(165,63,43,0.08)', border: '1px solid rgba(165,63,43,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: T.error, marginBottom: 14 }}>
                {error}
              </div>
            )}

            <button
              onClick={saveSponsor}
              disabled={!form.sponsor_name.trim() || saving}
              style={{
                width: '100%', background: T.ink, color: T.cream, border: 'none',
                borderRadius: 999, padding: '14px 20px', fontSize: 15, fontWeight: 600,
                cursor: form.sponsor_name.trim() && !saving ? 'pointer' : 'not-allowed',
                opacity: form.sponsor_name.trim() && !saving ? 1 : 0.45,
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Add sponsor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
