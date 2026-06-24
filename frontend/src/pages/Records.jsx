import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { attendanceAPI } from '../services/api';
import Layout from '../components/Layout';

const TZ = 'Asia/Taipei';
const fmt = (isoStr) => (isoStr ? dayjs(isoStr).tz(TZ).format('HH:mm') : '--');
const currentMonth = () => dayjs().tz(TZ).format('YYYY-MM');

export default function Records() {
  const [records, setRecords] = useState([]);
  const [monthly, setMonthly] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [recRes, monRes] = await Promise.all([
          attendanceAPI.myRecords(month),
          attendanceAPI.myMonthly(month),
        ]);
        setRecords(recRes.data);
        setMonthly(monRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <h1>我的打卡紀錄</h1>
        </div>

        <div className="month-picker">
          <label>選擇月份：</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        {/* 月統計摘要 */}
        {monthly && (
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">出勤天數</div>
              <div className="stat-value">{monthly.days_worked}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">月總工作時數</div>
              <div className="stat-value">{monthly.total_work_hours} h</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">月總加班時數</div>
              <div className="stat-value">{monthly.total_overtime_hours} h</div>
            </div>
          </div>
        )}

        <div className="card">
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
                      <td className="note-cell" title={r.note || ''}>
                        {r.note || '--'}
                      </td>
                      <td>
                        {r.clock_out ? (
                          <span className="badge badge-success">完成</span>
                        ) : r.clock_in ? (
                          <span className="badge badge-warning">⚠ 未下班打卡</span>
                        ) : (
                          <span className="badge badge-pending">未打卡</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
