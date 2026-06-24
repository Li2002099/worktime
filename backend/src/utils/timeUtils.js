const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Taipei';

// 取得台灣當下時間的 dayjs 物件
const nowTW = () => dayjs().tz(TZ);

// 取得今日台灣日期字串，格式 YYYY-MM-DD
const getTWDate = () => nowTW().format('YYYY-MM-DD');

// 將 UTC ISO 字串格式化為台灣時間顯示
const formatTW = (isoStr) =>
  isoStr ? dayjs(isoStr).tz(TZ).format('HH:mm') : null;

// 計算整數工作時數（無條件捨去分鐘）
// 例：09:30~18:00 = 510 分鐘 → floor(510/60) = 8 小時
const calcWorkHours = (clockIn, clockOut) => {
  const diffMinutes = dayjs(clockOut).diff(dayjs(clockIn), 'minute');
  return Math.floor(diffMinutes / 60);
};

// 計算加班時數：工作時數超過 8 小時的部分
const calcOvertimeHours = (workHours) => Math.max(0, workHours - 8);

module.exports = { nowTW, getTWDate, formatTW, calcWorkHours, calcOvertimeHours };
