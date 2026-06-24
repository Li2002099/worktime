import React, { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import Layout from '../components/Layout';

const currentMonth = () => dayjs().tz('Asia/Taipei').format('YYYY-MM');

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(currentMonth());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminAPI.summary(month);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [month]);

  const users = data?.users || [];
  const totalWork = users.reduce((s, u) => s + u.total_work_hours, 0);
  const totalOT = users.reduce((s, u) => s + u.total_overtime_hours, 0);

  return (
    <Layout>
      <div className="page">
        <div className="page-header">
          <h1>管理後台</h1>
          <p>員工出勤月報表</p>
        </div>

        <div className="month-picker">
          <label>選擇月份：</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        {/* 全員月統計摘要 */}
        {!loading && users.length > 0 && (
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">員工人數</div>
              <div className="stat-value">{users.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">全員總工時</div>
              <div className="stat-value">{totalWork} h</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">全員總加班</div>
              <div className="stat-value">{totalOT} h</div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">{month} 月份出勤摘要</div>

          {loading ? (
            <div className="empty-state">載入中...</div>
          ) : users.length === 0 ? (
            <div className="empty-state">本月尚無資料</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>姓名</th>
                    <th>帳號</th>
                    <th>出勤天數</th>
                    <th>月總工作時數</th>
                    <th>月總加班時數</th>
                    <th>未完成紀錄</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.incomplete_days > 0 ? 'row-incomplete' : ''}>
                      <td>
                        <strong>{u.name}</strong>
                      </td>
                      <td>{u.username}</td>
                      <td>{u.days_checked_in}</td>
                      <td>{u.total_work_hours} h</td>
                      <td>{u.total_overtime_hours} h</td>
                      <td>
                        {u.incomplete_days > 0 ? (
                          <span className="badge badge-warning">
                            ⚠ {u.incomplete_days} 筆
                          </span>
                        ) : (
                          <span className="badge badge-success">正常</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() =>
                            navigate(`/admin/user/${u.id}?month=${month}`)
                          }
                        >
                          查看明細
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
    </Layout>
  );
}
