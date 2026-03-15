import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Save, Download } from 'lucide-react';

interface SpreadsheetProps {
  t: any;
  userId: number;
}

export function Spreadsheet({ t, userId }: SpreadsheetProps) {
  const [data, setData] = useState<string[][]>([['', '', ''], ['', '', ''], ['', '', '']]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSpreadsheet();
  }, []);

  const fetchSpreadsheet = async () => {
    try {
      const res = await fetch(`/api/spreadsheet?userId=${userId}`);
      if (res.ok) {
        const json = await res.json();
        if (json && json.data) {
          setData(JSON.parse(json.data));
        }
      }
    } catch (error) {
      console.error('Fetch spreadsheet error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, data: JSON.stringify(data) })
      });
      alert(t.saveSpreadsheet + ' Success');
    } catch (error) {
      console.error('Save spreadsheet error:', error);
    }
  };

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...data];
    newData[rowIndex][colIndex] = value;
    setData(newData);
  };

  const addRow = () => {
    const newRow = new Array(data[0].length).fill('');
    setData([...data, newRow]);
  };

  const addCol = () => {
    const newData = data.map(row => [...row, '']);
    setData(newData);
  };

  const removeRow = (index: number) => {
    if (data.length > 1) {
      setData(data.filter((_, i) => i !== index));
    }
  };

  const removeCol = (index: number) => {
    if (data[0].length > 1) {
      setData(data.map(row => row.filter((_, i) => i !== index)));
    }
  };

  if (loading) return <div className="flex justify-center p-20">Loading...</div>;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto p-6 pb-32"
    >
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-serif">{t.spreadsheet}</h2>
        <div className="flex gap-2">
          <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-sm text-xs uppercase tracking-widest hover:bg-accent/90 transition-all">
            <Save size={14} />
            {t.save}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white shadow-xl border border-black/5 rounded-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-black/10 bg-black/5 w-10"></th>
              {data[0].map((_, i) => (
                <th key={i} className="border border-black/10 bg-black/5 p-2 text-[10px] uppercase tracking-widest font-medium relative group">
                  {String.fromCharCode(65 + i)}
                  <button 
                    onClick={() => removeCol(i)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={8} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border border-black/10 bg-black/5 p-2 text-[10px] text-center font-mono relative group">
                  {rowIndex + 1}
                  <button 
                    onClick={() => removeRow(rowIndex)}
                    className="absolute -top-2 -left-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={8} />
                  </button>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-black/10 p-0">
                    <input 
                      type="text" 
                      value={cell}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full h-full p-2 outline-none focus:bg-accent/5 transition-colors text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4 mt-6">
        <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 border border-black/10 text-[10px] uppercase tracking-widest hover:bg-ink hover:text-white transition-all">
          <Plus size={14} />
          {t.addRow}
        </button>
        <button onClick={addCol} className="flex items-center gap-2 px-4 py-2 border border-black/10 text-[10px] uppercase tracking-widest hover:bg-ink hover:text-white transition-all">
          <Plus size={14} />
          {t.addCol}
        </button>
      </div>
    </motion.div>
  );
}
