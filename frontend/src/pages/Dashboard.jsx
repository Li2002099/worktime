import React, { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { attendanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

const TZ = 'Asia/Taipei';
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const formatTime = (isoStr) =>
  isoStr ? dayjs(isoStr).tz(TZ).format('HH:mm') : null;

export default function Dashboard() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [now, setNow] = useState(dayjs().tz(TZ));

  // 每秒更新時鐘
  useEffect(() => {
    const timer = setInterval(() => setNow(dayjs().tz(TZ)), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadToday = useCallback(async () => {
    try {
      const res = await attendanceAPI.today();
      setRecord(res.data);
      setNote(res.data.note || '');
    } catch (err) {
      console.error('載入今日狀態失敗', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleClockIn = async () => {
    try {
      await attendanceAPI.clockIn();
      showMsg('success', '✓ 上班打卡成功！');
      loadToday();
    } catch (err) {
      showMsg('error', err.response?.data?.message || '打卡失敗');
    }
  };

  const handleClockOut = async () => {
    try {
      await attendanceAPI.clockOut(note);
      showMsg('success', '✓ 下班打卡成功！');
      loadToday();
    } catch (err) {
      showMsg('error', err.response?.data?.message || '打卡失敗');
    }
  };

  const handleSaveNote = async () => {
    try {
      await attendanceAPI.updateNote(note);
      showMsg('success', '備註已儲存');
    } catch (err) {
      showMsg('error', err.response?.data?.message || '儲存失敗');
    }
  };

  if (loading) return <div className="loading">載入中...</div>;

  const hasClockIn = !!record?.clock_in;
  const hasClockOut = !!record?.clock_out;
  const dateStr = now.format('YYYY年MM月DD日');
  const weekday = WEEKDAYS[now.day()];

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <h1>打卡首頁</h1>
          <p>歡迎回來，{user?.name}</p>
        </div>

        <div className="card">
          <div className="date-display">
            {dateStr}（{weekday}）
          </div>
          <div className="time-display">現在時間：{now.format('HH:mm:ss')}</div>

          {/* 今日打卡狀態 */}
          <div className="clock-status">
            <div className="clock-item">
              <div className="clock-item-label">上班打卡</div>
              <div className={`clock-item-value ${hasClockIn ? 'done' : ''}`}>
                {hasClockIn ? formatTime(record.clock_in) : '尚未打卡'}
              </div>
            </div>
            <div className="clock-item">
              <div className="clock-item-label">下班打卡</div>
              <div className={`clock-item-value ${hasClockOut ? 'done' : ''}`}>
                {hasClockOut ? formatTime(record.clock_out) : '尚未打卡'}
              </div>
            </div>
          </div>

          {msg && (
            <div className={`alert alert-${msg.type === 'success' ? 'success' : 'error'}`}>
              {msg.text}
            </div>
          )}

          {/* 打卡按鈕 */}
          <div className="btn-group" style={{ marginBottom: 20 }}>
            <button
              className="btn btn-primary"
              onClick={handleClockIn}
              disabled={hasClockIn}
            >
              {hasClockIn
                ? `✓ 已上班打卡 ${formatTime(record.clock_in)}`
                : '上班打卡'}
            </button>
            <button
              className="btn btn-success"
              onClick={handleClockOut}
              disabled={!hasClockIn || hasClockOut}
            >
              {hasClockOut
                ? `✓ 已下班打卡 ${formatTime(record.clock_out)}`
                : '下班打卡'}
            </button>
          </div>

          {/* 備註欄位 */}
          <div className="form-group">
            <label className="form-label">今日處理事項</label>
            <textarea
              className="form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="請填寫今日工作內容或備註..."
              rows={3}
            />
          </div>

          {hasClockIn && (
            <button className="btn btn-secondary" onClick={handleSaveNote}>
              儲存備註
            </button>
          )}

          {/* 今日工時統計（下班後才顯示） */}
          {hasClockOut && (
            <div className="stats-row" style={{ marginTop: 24 }}>
              <div className="stat-box">
                <div className="stat-label">今日工作時數</div>
                <div className="stat-value">{record.work_hours} h</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">今日加班時數</div>
                <div className="stat-value">{record.overtime_hours} h</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
