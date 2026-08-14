import { useState, useEffect } from 'react';
import { Package, Plus, Trash2, Edit2, Check, X, Loader2, AlertCircle, IndianRupee } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';

export interface ProductPreset {
  id: string;
  name: string;
  amount: number;
  category: string | null;
  sort_order: number;
}

interface Props {
  onSelect: (name: string, amount: number) => void;
}

export default function ProductPresetsManager({ onSelect }: Props) {
  const [presets, setPresets] = useState<ProductPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadPresets();
  }, [user]);

  const loadPresets = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('product_presets')
      .select('id, name, amount, category, sort_order')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      setError('Failed to load presets');
    } else {
      setPresets(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!user) return;
    const amount = parseFloat(newAmount);
    if (!newName.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a valid name and positive amount');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('product_presets').insert({
      name: newName.trim(),
      amount,
      category: newCategory.trim() || null,
      user_id: user.id,
      sort_order: presets.length,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setNewName('');
      setNewAmount('');
      setNewCategory('');
      setShowAdd(false);
      loadPresets();
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string) => {
    const amount = parseFloat(editAmount);
    if (!editName.trim() || isNaN(amount) || amount <= 0) {
      setError('Enter a valid name and positive amount');
      return;
    }

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('product_presets')
      .update({ name: editName.trim(), amount })
      .eq('id', id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingId(null);
      loadPresets();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error: deleteError } = await supabase
      .from('product_presets')
      .update({ is_active: false })
      .eq('id', id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      loadPresets();
    }
  };

  const startEdit = (preset: ProductPreset) => {
    setEditingId(preset.id);
    setEditName(preset.name);
    setEditAmount(preset.amount.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditAmount('');
  };

  if (loading) {
    return (
      <div className="bg-surface-900 border border-surface-700 rounded-xl p-4">
        <Loader2 className="w-5 h-5 border-2 border-cyber-blue/30 border-t-cyber-blue rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="bg-surface-900 border border-surface-600 rounded-xl p-4 card-glow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-cyber-blue" />
          <span className="text-xs font-mono text-cyber-blue uppercase tracking-widest">Quick Products</span>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-xs text-gray-400 hover:text-cyber-blue flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Preset
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-cyber-red/15 border border-cyber-red/50 text-cyber-red text-xs font-mono px-2 py-1.5 rounded mb-3">
          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showAdd && (
        <div className="bg-surface-800 rounded-lg p-3 mb-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Product/service name"
            className="w-full bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:ring-1 focus:ring-cyber-blue/30"
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <IndianRupee className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="number"
                step="0.01"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-surface-700 border border-surface-600 rounded pl-7 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue/50"
              />
            </div>
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              placeholder="Category (optional)"
              className="w-32 bg-surface-700 border border-surface-600 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex-1 bg-cyber-green/25 text-cyber-green py-1.5 rounded text-xs font-medium hover:bg-cyber-green/35 transition-colors flex items-center justify-center gap-1"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button
              onClick={() => { setShowAdd(false); setError(null); }}
              className="px-3 py-1.5 bg-surface-700 text-gray-400 rounded text-xs hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {presets.length === 0 && !showAdd ? (
        <div className="text-center py-4">
          <p className="text-xs text-gray-500 font-mono">No presets yet</p>
          <p className="text-xs text-gray-600 mt-1">Click "Add Preset" to create quick-select items</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {presets.map(preset => (
            <div
              key={preset.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-surface-800 transition-colors group"
            >
              {editingId === preset.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="flex-1 bg-surface-700 border border-surface-600 rounded px-2 py-1 text-xs text-white"
                  />
                  <div className="relative w-20">
                    <IndianRupee className="absolute left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      className="w-full bg-surface-700 border border-surface-600 rounded pl-5 pr-2 py-1 text-xs text-white"
                    />
                  </div>
                  <button
                    onClick={() => handleUpdate(preset.id)}
                    disabled={saving}
                    className="p-1 text-cyber-green hover:bg-cyber-green/20 rounded"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onSelect(preset.name, preset.amount)}
                    className="flex-1 flex items-center gap-2 text-left"
                  >
                    <div className="flex-1">
                      <p className="text-sm text-white">{preset.name}</p>
                      {preset.category && (
                        <p className="text-xs text-gray-500">{preset.category}</p>
                      )}
                    </div>
                    <span className="text-sm font-mono text-cyber-green">
                      ₹{preset.amount.toFixed(2)}
                    </span>
                  </button>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button
                      onClick={() => startEdit(preset)}
                      className="p-1 text-gray-400 hover:text-cyber-blue"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      className="p-1 text-gray-400 hover:text-cyber-red"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
