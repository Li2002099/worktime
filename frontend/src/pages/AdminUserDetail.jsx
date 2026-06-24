import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Layout from '../components/Layout';

const TZ = 'Asia/Taipei';
const fmt = (isoStr) => (isoStr ? dayjs(isoStr).tz(TZ).format('HH:mm') : '--');
const currentMonth = () => dayjs().tz(TZ).format('YYYY-MM');

// 從記錄初始化編輯表單的值
function toEditValues(r) {
  return {
    work_date:       r.work_date || '',
    clock_in_time:   r.clock_in  ? dayjs(r.clock_in).tz(TZ).format('HH:mm')  : '',
    clock_out_time:  r.clock_out ? dayjs(r.clock_out).tz(TZ).format('HH:mm') : '',
    work_hours:      r.work_hours     ?? 0,
    overtime_hours:  r.overtime_hours ?? 0,
    note:            r.note || '',
  };
}

// 時間 HH:mm + 日期 YYYY-MM-DD → UTC ISO string（台灣時間轉換）
function toISO(date, time) {
  if (!date || !time) return null;
  return dayjs.tz(`${date} ${time}`, TZ).toISOString();
}

// 從上下班時間自動計算工時
function calcHours(date, inTime, outTime) {
  if (!date || !inTime || !outTime) return null;
  const inDt  = dayjs.tz(`${date} ${inTime}`,  TZ);
  const outDt = dayjs.tz(`${date} ${outTime}`, TZ);
  if (!outDt.isAfter(inDt)) return null;
  const wh = Math.floor(outDt.diff(inDt, 'minute') / 60);
  return { work_hours: wh, overtime_hours: Math.max(0, wh - 8) };
}

export default function AdminUserDetail() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [month, setMonth] = useState(searchParams.get('month') || currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 編輯 modal 狀態
  const [editRecord, setEditRecord] = useState(null);   // 正在編輯的原始紀錄
  const [editValues, setEditValues] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminAPI.userDetail(userId, month);
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.message || '載入失敗');
    } finally {
      setLoading(false);
    }
  }, [userId, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 開啟編輯 modal
  const handleEdit = (record) => {
    setEditRecord(record);
    setEditValues(toEditValues(record));
    setSaveError('');
  };

  // 欄位變更：若是時間欄位則自動計算工時
  const handleChange = (field, value) => {
    setEditValues((prev) => {
      const next = { ...prev, [field]: value };

      // 上下班時間變更時自動計算工時（可被手動覆蓋）
      if (field === 'clock_in_time' || field === 'clock_out_time' || field === 'work_date') {
        const result = calcHours(next.work_date, next.clock_in_time, next.clock_out_time);
        if (result) {
          next.work_hours     = result.work_hours;
          next.overtime_hours = result.overtime_hours;
        }
      }

      return next;
    });
  };

  // 儲存編輯
  const handleSave = async () => {
    setSaveError('');
    setSaving(true);
    try {
      const { work_date, clock_in_time, clock_out_time, work_hours, overtime_hours, note } = editValues;
      await adminAPI.updateRecord(editRecord.id, {
        work_date,
        clock_in:       toISO(work_date, clock_in_time),
        clock_out:      toISO(work_date, clock_out_time),
        work_hours:     parseInt(work_hours)     || 0,
        overtime_hours: parseInt(overtime_hours) || 0,
        note,
      });
      setEditRecord(null);
      loadData();
    } catch (err) {
      setSaveError(err.response?.data?.message || '儲存失敗');
    } finally {
      setSaving(false);
    }
  };

  const records = data?.records || [];
  const completed = records.filter((r) => r.clock_out);
  const totalWork = completed.reduce((s, r) => s + r.work_hours, 0);
  const totalOT   = completed.reduce((s, r) => s + r.overtime_hours, 0);
  const incompleteCount = records.filter((r) => r.clock_in && !r.clock_out).length;

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate(`/admin?month=${month}`)}
            style={{ marginBottom: 14 }}
          >
            ← 返回月報表
          </button>
          <h1>{loading ? '載入中...' : (data?.user?.name || '—')} 的打卡明細</h1>
          {data?.user && <p>帳號：{data.user.username}</p>}
        </div>

        <div className="month-picker">
          <label>選擇月份：</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        {!loading && records.length > 0 && (
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">完整出勤天數</div>
              <div className="stat-value">{completed.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">月總工作時數</div>
              <div className="stat-value">{totalWork} h</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">月總加班時數</div>
              <div className="stat-value">{totalOT} h</div>
            </div>
            {incompleteCount > 0 && (
              <div className="stat-box">
                <div className="stat-label">未完成下班打卡</div>
                <div className="stat-value" style={{ color: '#92400e' }}>
                  {incompleteCount} 筆
                </div>
              </div>
            )}
          </div>
        )}

        <div className="card">
          <div className="card-title">{month} 每日明細</div>

          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="empty-state">載入中...</div>
          ) : records.length === 0 ? (
            <div className="empty-state">本月尚無打卡紀錄</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>日期</th>
                    <th>上班時間</th>
                    <th>下班時間</th>
                    <th>工作時數</th>
                    <th>加班時數</th>
                    <th>今日處理事項</th>
                    <th>狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className={!r.clock_out ? 'row-incomplete' : ''}>
                      <td>{r.work_date}</td>
                      <td>{fmt(r.clock_in)}</td>
                      <td>{fmt(r.clock_out)}</td>
                      <td>{r.clock_out ? `${r.work_hours} h` : '--'}</td>
                      <td>{r.clock_out ? `${r.overtime_hours} h` : '--'}</td>
                      <td className="note-cell" title={r.note || ''}>{r.note || '--'}</td>
                      <td>
                        {r.clock_out ? (
                          <span className="badge badge-success">完成</span>
                        ) : r.clock_in ? (
                          <span className="badge badge-warning">⚠ 未完成下班打卡</span>
                        ) : (
                          <span className="badge badge-pending">未打卡</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleEdit(r)}
                        >
                          編輯
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 編輯 Modal */}
      {editRecord && (
        <div className="modal-overlay" onClick={() => setEditRecord(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>編輯打卡紀錄</h3>
              <button className="modal-close" onClick={() => setEditRecord(null)}>✕</button>
            </div>

            <div className="modal-body">
              {saveError && <div className="alert alert-error" style={{ marginBottom: 16 }}>{saveError}</div>}

              <div className="form-group">
                <label className="form-label">日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={editValues.work_date}
                  onChange={(e) => handleChange('work_date', e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">上班時間</label>
                  <input
                    type="time"
                    className="form-input"
                    value={editValues.clock_in_time}
                    onChange={(e) => handleChange('clock_in_time', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">下班時間</label>
                  <input
                    type="time"
                    className="form-input"
                    value={editValues.clock_out_time}
                    onChange={(e) => handleChange('clock_out_time', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">工作時數</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={editValues.work_hours}
                    onChange={(e) => handleChange('work_hours', e.target.value)}
                  />
                  <div className="form-hint">修改時間後自動計算，亦可手動調整</div>
                </div>
                <div className="form-group">
                  <label className="form-label">加班時數</label>
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={editValues.overtime_hours}
                    onChange={(e) => handleChange('overtime_hours', e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">今日處理事項</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={editValues.note}
                  onChange={(e) => handleChange('note', e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setEditRecord(null)}
                disabled={saving}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '儲存中...' : '儲存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
